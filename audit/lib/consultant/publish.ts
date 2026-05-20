"use server";

/**
 * T089 — `publishConsultantReport` server action (US 4).
 *
 * Contract (admin-server-actions.md):
 *
 *   publishConsultantReport(projectId)
 *
 * Behavior:
 *  1. Gate on `consultant` or `super_admin`.
 *  2. Rebuild the engine output from the project's effective inputs
 *     (latest-wins per slug, including any `consultant_override` rows
 *     and `scenario_weight_overrides`). Reuses the same orchestrator as
 *     the AI worker so the consultant publish path is identical to the
 *     async recompute path — just synchronous here so we can return the
 *     new snapshot id to the caller.
 *  3. Strip every internal_notes body, every override reason, every raw
 *     weight, and every internal-only field from `rendered_json` before
 *     persistence (FR-072, SC-017). Verification is defence-in-depth —
 *     a leaked substring aborts the publish.
 *  4. Insert `report_snapshots` row. The PUBLIC view (the client `/a/[token]`
 *     report page) renders FROM `rendered_json`, so this is what protects
 *     the client from ever seeing private content.
 *  5. Flip project status to `consultant_finalized`. The transition to
 *     `published` (= shared with client) is a SEPARATE explicit step;
 *     keep this action focused on the consultant-side curation gate.
 *  6. Audit-log `report_published`.
 */

import { revalidatePath } from "next/cache";
import { and, eq, inArray, like } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  projects,
  hotels,
  submissions,
  answers,
  internalNotes,
  reportSnapshots,
  scans,
  scanFindings,
  vendors,
  vendorVersions,
  scenarioWeightOverrides,
} from "@/db/schema";
import { runEngine, buildContext } from "@/lib/recommend/engine";
import { buildSnapshot } from "@/lib/report/snapshot-builder";
import { writeAuditEntry } from "@/lib/audit-log";
import { requireAdminWithAnyRole } from "@/lib/auth/hydrate-roles";

import type {
  AnswerInput,
  HotelSnapshot,
  ProjectSnapshot,
  ScanFindingInput,
  VendorCatalogueEntry,
} from "@/lib/recommend/types";

import type { PublishConsultantReportOutcome } from "./types";
import { stripAndVerify } from "./strip";

export async function publishConsultantReport(
  projectId: string,
): Promise<PublishConsultantReportOutcome> {
  const user = await requireAdminWithAnyRole(["consultant", "super_admin"]);

  // 1. Load project + hotel.
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) {
    return { ok: false, error: { code: "not_found", message: "Project not found" } };
  }
  if (project.status === "purged" || project.status === "archived") {
    return {
      ok: false,
      error: { code: "locked", message: `Project is ${project.status}` },
    };
  }

  let hotelRow: typeof hotels.$inferSelect | null = null;
  if (project.hotelId) {
    const [row] = await db
      .select()
      .from(hotels)
      .where(eq(hotels.id, project.hotelId))
      .limit(1);
    hotelRow = row ?? null;
  }

  // 2. Load submission + answers with latest-wins semantics
  // (consultant_override always beats the underlying client row).
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, projectId))
    .limit(1);
  if (!submission) {
    return {
      ok: false,
      error: { code: "no_submission", message: "Project has no submission" },
    };
  }
  const answerRows = await db
    .select()
    .from(answers)
    .where(eq(answers.submissionId, submission.id));

  const winnersBySlug = new Map<string, (typeof answerRows)[number]>();
  for (const a of answerRows) {
    const existing = winnersBySlug.get(a.fieldId);
    if (!existing) {
      winnersBySlug.set(a.fieldId, a);
      continue;
    }
    const existingIsOverride = existing.source === "consultant_override";
    const candidateIsOverride = a.source === "consultant_override";
    if (candidateIsOverride && !existingIsOverride) {
      winnersBySlug.set(a.fieldId, a);
      continue;
    }
    if (existingIsOverride && !candidateIsOverride) continue;
    if (a.updatedAt.getTime() > existing.updatedAt.getTime()) {
      winnersBySlug.set(a.fieldId, a);
    }
  }
  const effective = Array.from(winnersBySlug.values());

  const answerInputs: AnswerInput[] = effective.map((a) => ({
    question_slug: a.fieldId,
    question_version_id: a.questionVersionId,
    value: a.valueJson,
    source: a.source,
    confidence: a.confidence,
  }));
  const refQuestionVersionIds = Array.from(
    new Set(
      answerInputs
        .map((a) => a.question_version_id)
        .filter((v): v is string => typeof v === "string"),
    ),
  );

  // 3. Scan findings.
  let scanInputs: ScanFindingInput[] = [];
  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, projectId), eq(scans.status, "succeeded")))
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

  // 4. Vendor catalogue.
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

  // 5. Run engine.
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

  // 6. Apply scenario-weight suppressions before building the snapshot.
  const weightOverrides = await db
    .select()
    .from(scenarioWeightOverrides)
    .where(eq(scenarioWeightOverrides.projectId, projectId));
  if (weightOverrides.length > 0) {
    const suppressedRecIds = new Set(
      weightOverrides
        .filter((w) => w.adjustment === "suppress" && w.recommendationId)
        .map((w) => w.recommendationId as string),
    );
    if (suppressedRecIds.size > 0) {
      engine.recommendations = engine.recommendations.filter(
        (r) => !suppressedRecIds.has(r.id),
      );
    }
  }

  // 7. Build snapshot.
  const now = new Date();
  const built = buildSnapshot({
    project: {
      ...projectSnap,
      hotel_id: project.hotelId,
      language: hotelSnap.primary_language,
    },
    hotel: hotelSnap,
    engine,
    referencedQuestionVersionIds: refQuestionVersionIds,
    publishedAt: now,
  });

  // 8. Gather PRIVATE bodies for the leak check.
  // (a) internal notes attached to this project — full set, regardless of
  //     target_type. (b) Free-form `scenario_weight_overrides.reason` text.
  const noteRows = await db
    .select({ body: internalNotes.body })
    .from(internalNotes)
    .where(eq(internalNotes.projectId, projectId));
  const weightReasons = weightOverrides
    .map((w) => w.reason)
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0);
  const privateBodies = [
    ...noteRows.map((n) => n.body),
    ...weightReasons,
  ];

  // 9. Strip + verify. A leak aborts publication.
  let cleaned: unknown;
  try {
    const { cleaned: cleanedJson } = stripAndVerify(built.renderedJson, privateBodies);
    cleaned = cleanedJson;
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "leak_detected",
        message:
          err instanceof Error
            ? err.message
            : "Snapshot contains private content; publication aborted.",
      },
    };
  }

  // 10. Persist snapshot + advance project status.
  let snapshotId = "";
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reportSnapshots)
      .values({
        projectId,
        publishedAt: now,
        publishedBy: user.id,
        tierAtPublication: project.tier,
        goalPrimaryAtPublication: project.goalPrimary ?? null,
        renderedJson: cleaned as object,
        referencedVendorVersions: built.referencedVendorVersionIds,
        referencedQuestionVersions: built.referencedQuestionVersionIds,
        ruleEngineVersion: built.ruleEngineVersion,
      })
      .returning({ id: reportSnapshots.id });
    snapshotId = row?.id ?? "";

    // consultant_finalized — the curated deliverable exists. The client
    // does NOT see it yet; a separate `shareConsultantReport` step (TBD
    // out of scope here) is what flips to `published`.
    if (project.status !== "consultant_finalized" && project.status !== "published") {
      await tx
        .update(projects)
        .set({ status: "consultant_finalized", lastEditedAt: now })
        .where(eq(projects.id, projectId));
    }
  });

  writeAuditEntry({
    actorId: user.id,
    action: "report_published",
    projectId,
    targetType: "report_snapshot",
    targetId: snapshotId,
    metadata: {
      tier: project.tier,
      consultant_finalized: true,
      stripped_private_bodies: privateBodies.length,
    },
  });

  // Re-validate the obvious admin + client paths so a publish makes the
  // new snapshot visible immediately.
  revalidatePath(`/admin/consultant/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);

  return {
    ok: true,
    snapshotId,
    status: "consultant_finalized",
  };
}

// silence unused-import warnings when ESLint runs in workspace-isolation
void like;
