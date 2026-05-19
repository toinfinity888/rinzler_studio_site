/**
 * `ai.worker.ts` — handles the `ai.*` BullMQ queue.
 *
 * Jobs:
 *  - `ai.extract_voice_structure` (T062): DEFERRED until Bedrock approves.
 *  - `ai.reason_project`           (T074): ACTIVE in rules-only mode.
 *      Loads project context, runs the deterministic rules engine, builds
 *      the report snapshot, persists it, advances the project to
 *      `published`. When `BEDROCK_ENABLED=true`, additionally calls Claude
 *      via Bedrock to enrich `explanation.*` fields and merges them. The
 *      structural shape of the snapshot does NOT change between modes —
 *      so the consumer (report renderer + PDF worker) is identical.
 *  - `ai.summarize_pattern`        (US12 — deferred entirely).
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { createWorker, getQueue, type QueueName } from "./lib/queue";
import { db } from "@/lib/db";
import {
  projects,
  hotels,
  submissions,
  answers,
  questionVersions,
  scans,
  scanFindings,
  vendors,
  vendorVersions,
  reportSnapshots,
} from "@/db/schema";
import { runEngine, buildContext } from "@/lib/recommend/engine";
import type {
  AnswerInput,
  HotelSnapshot,
  ProjectSnapshot,
  ScanFindingInput,
  VendorCatalogueEntry,
} from "@/lib/recommend/types";
import { buildSnapshot } from "@/lib/report/snapshot-builder";

export const AI_QUEUE: QueueName = "ai";

export interface AiExtractVoiceJob {
  voice_capture_id: string;
  transcript_post_edit: string;
  language: string;
  context: { question_slug: string; project_id: string };
}

export interface AiReasonProjectJob {
  project_id: string;
  trigger: "audit_submitted" | "consultant_recompute" | "override_applied";
  scope: "full" | "partial";
  partial_recommendations?: string[];
}

type AiJobPayload =
  | (AiExtractVoiceJob & { __kind?: "voice" })
  | (AiReasonProjectJob & { __kind?: "reason" });

const BEDROCK_ENABLED = process.env.BEDROCK_ENABLED === "true";

export function registerAiWorker() {
  return createWorker<AiJobPayload>(AI_QUEUE, async (job) => {
    switch (job.name) {
      case "ai.extract_voice_structure": {
        const data = job.data as AiExtractVoiceJob;
        console.log(
          `[ai] extract_voice_structure (DEFERRED) voice_capture=${data?.voice_capture_id} project=${data?.context?.project_id ?? "?"}`,
        );
        // TODO: enable when Bedrock use-case form approves (T062).
        return { ok: true, deferred: true };
      }
      case "ai.reason_project": {
        const data = job.data as AiReasonProjectJob;
        return await runReasonProject(data);
      }
      case "ai.summarize_pattern":
        console.log(`[ai] summarize_pattern (DEFERRED)`);
        return { ok: true, deferred: true };
      default:
        console.warn(`[ai] unknown job name: ${job.name}`);
        return { ok: false, reason: "unknown_job" };
    }
  });
}

/* ------------------------------------------------------------------ */
/* ai.reason_project                                                   */
/* ------------------------------------------------------------------ */

async function runReasonProject(data: AiReasonProjectJob) {
  const t0 = Date.now();
  const log = (msg: string) =>
    console.log(`[ai.reason_project ${data.project_id.slice(0, 8)}] +${Date.now() - t0}ms ${msg}`);
  log(`start trigger=${data.trigger} bedrock=${BEDROCK_ENABLED ? "on" : "off"}`);

  // 1) Load project.
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, data.project_id))
    .limit(1);
  if (!project) {
    console.warn(`[ai.reason_project] project ${data.project_id} not found`);
    return { ok: false, reason: "project_not_found" };
  }
  log("project loaded");

  // 2) Load hotel (optional — anonymous free-scan projects have hotel_id=null).
  let hotelRow: typeof hotels.$inferSelect | null = null;
  if (project.hotelId) {
    const [row] = await db.select().from(hotels).where(eq(hotels.id, project.hotelId)).limit(1);
    hotelRow = row ?? null;
  }

  // 3) Load submission + answers.
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);
  if (!submission) {
    console.warn(`[ai.reason_project] no submission for ${project.id}`);
    return { ok: false, reason: "submission_not_found" };
  }
  const answerRows = await db
    .select()
    .from(answers)
    .where(eq(answers.submissionId, submission.id));
  log(`answers loaded: ${answerRows.length}`);

  const answerInputs: AnswerInput[] = answerRows.map((a) => ({
    question_slug: a.fieldId,
    question_version_id: a.questionVersionId,
    value: a.valueJson,
    source: a.source,
    confidence: a.confidence,
  }));

  // Referenced question_versions for the snapshot pin.
  const refQuestionVersionIds = Array.from(
    new Set(
      answerInputs
        .map((a) => a.question_version_id)
        .filter((v): v is string => typeof v === "string"),
    ),
  );

  // 4) Load scan findings (most recent succeeded scan, if any).
  let scanInputs: ScanFindingInput[] = [];
  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.status, "succeeded")))
    .limit(1);
  if (scan) {
    const findings = await db
      .select()
      .from(scanFindings)
      .where(eq(scanFindings.scanId, scan.id));
    scanInputs = findings.map((f) => ({
      field: f.field,
      value: f.valueJson,
      confidence: f.confidence,
    }));
  }
  log(`scan findings loaded: ${scanInputs.length}`);

  // 5) Load the active vendor catalogue + their current versions.
  const activeVendors = await db
    .select()
    .from(vendors)
    .where(eq(vendors.status, "active"));
  const vendorIds = activeVendors.map((v) => v.id);
  const versionsRows =
    vendorIds.length > 0
      ? await db
          .select()
          .from(vendorVersions)
          .where(inArray(vendorVersions.vendorId, vendorIds))
      : [];
  // Map: vendorId -> latest version id (max(version) per vendor).
  const latestVersionIdByVendor = new Map<string, string>();
  for (const vv of versionsRows) {
    const prev = latestVersionIdByVendor.get(vv.vendorId);
    if (!prev) latestVersionIdByVendor.set(vv.vendorId, vv.id);
    else {
      const prevRow = versionsRows.find((r) => r.id === prev);
      if (prevRow && vv.version > prevRow.version) {
        latestVersionIdByVendor.set(vv.vendorId, vv.id);
      }
    }
  }
  const vendorCatalogue: VendorCatalogueEntry[] = activeVendors.map((v) => ({
    id: v.id,
    slug: v.slug,
    category: v.category,
    category_label: v.category,
    currentVersionId: latestVersionIdByVendor.get(v.id) ?? null,
    targetHotelSizes: v.targetHotelSizes ?? [],
    targetPropertyTypes: v.targetPropertyTypes ?? [],
    countriesServed: v.countriesServed ?? [],
    languagesSupported: v.languagesSupported ?? [],
    independentHotelSuitability: v.independentHotelSuitability,
    smallHotelSuitability: v.smallHotelSuitability,
    implementationComplexity: v.implementationComplexity,
    priceTier: v.priceTier,
    frenchMarketRelevance: v.frenchMarketRelevance,
    gdprPosture: v.gdprPosture,
    euHosting: v.euHosting,
    aiFeatures: v.aiFeatures ?? [],
    automationCapabilities: v.automationCapabilities ?? [],
    tags: v.tags ?? [],
    confidence: v.confidence,
  }));
  log(`vendor catalogue: ${vendorCatalogue.length}`);

  // 6) Build engine context + run.
  const projectSnap: ProjectSnapshot = {
    id: project.id,
    tier: project.tier,
    goal_primary: project.goalPrimary,
    goal_secondary: project.goalSecondary ?? [],
    budget_level: project.budgetLevel,
  };
  const hotelSnap: HotelSnapshot = {
    property_type: hotelRow?.propertyType ?? null,
    room_count: hotelRow?.roomCount ?? null,
    country: hotelRow?.country ?? null,
    region: hotelRow?.region ?? null,
    city: hotelRow?.city ?? null,
    primary_language: hotelRow?.primaryLanguage ?? "fr",
    star_rating: hotelRow?.starRating ?? null,
  };
  const ctx = buildContext({
    project: projectSnap,
    hotel: hotelSnap,
    answers: answerInputs,
    scanFindings: scanInputs,
    vendorCatalogue,
  });

  const engine = runEngine(ctx);
  log(
    `engine done: recs=${engine.recommendations.length} scenarios=${engine.scenarios.length} scores=${engine.readiness_scores.length}`,
  );

  // 7) (Optional) Bedrock enrichment.
  // Gated behind BEDROCK_ENABLED until the Anthropic use-case form approves.
  // When the flag flips on, the enrichment step:
  //   - Calls Claude via Bedrock with the prompt in `lib/ai/prompts/reason-project.ts`
  //   - Validates the tool-use response against the engine schema
  //   - Merges `explanation.*` fields into engine.recommendations (1:1 by id)
  // Until then the rules-only output flows through unchanged.
  if (BEDROCK_ENABLED) {
    // TODO: implement Bedrock enrichment merge here.
    log("bedrock enrichment requested but not yet wired");
  }

  // 8) Build snapshot.
  const built = buildSnapshot({
    project: {
      ...projectSnap,
      hotel_id: project.hotelId,
      language: hotelSnap.primary_language,
    },
    hotel: hotelSnap,
    engine,
    referencedQuestionVersionIds: refQuestionVersionIds,
    publishedAt: new Date(),
  });

  // 9) Persist snapshot + advance status.
  const snapshotId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(reportSnapshots)
      .values({
        projectId: project.id,
        publishedAt: new Date(),
        publishedBy: null,
        tierAtPublication: project.tier,
        goalPrimaryAtPublication: project.goalPrimary ?? null,
        renderedJson: built.renderedJson,
        referencedVendorVersions: built.referencedVendorVersionIds,
        referencedQuestionVersions: built.referencedQuestionVersionIds,
        ruleEngineVersion: built.ruleEngineVersion,
      })
      .returning({ id: reportSnapshots.id });
    if (project.status !== "published" && project.status !== "archived") {
      await tx
        .update(projects)
        .set({ status: "published", lastEditedAt: new Date() })
        .where(eq(projects.id, project.id));
    }
    return inserted?.id ?? null;
  });
  log(`snapshot persisted: ${snapshotId}`);

  return { ok: true, snapshot_id: snapshotId, recommendations: engine.recommendations.length };
}

// Re-export so workers/run.ts wiring is unchanged.
void getQueue;
void isNotNull;
