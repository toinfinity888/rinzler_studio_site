"use server";

/**
 * T118 — Funding-brief server actions.
 *
 *   getFundingBriefPreview(token)
 *   generateFundingBrief(token, additionalInputs)
 *
 * Both gate on hotel.country === "FR" (FR-061 / FR-176): the brief is
 * tailored to French public-support programmes, and the supporting
 * documents checklist references FR-specific items (Kbis, SIRET,
 * liasse fiscale). For non-FR hotels we return `{ available: false }`
 * rather than producing a misleading document.
 */
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import {
  projects,
  submissions,
  answers,
  hotels,
  reportSnapshots,
  fundingBriefs,
} from "@/db/schema";
import { hashToken, verifyToken } from "@/lib/tokens";
import { writeAuditEntry } from "@/lib/audit-log";

import { generateBrief, type BriefGeneratorInput } from "./brief-generator";
import type {
  FundingBriefAdditionalInputs,
  FundingBriefContent,
} from "./types";

export type FundingBriefPreviewResult =
  | {
      ok: true;
      available: true;
      preview: FundingBriefContent;
      persisted: {
        id: string;
        generated_at: Date;
      } | null;
    }
  | {
      ok: true;
      available: false;
      reason: "non_fr_market";
      country: string | null;
    }
  | {
      ok: false;
      reason: "unauthorized" | "revoked" | "no_report";
    };

async function resolveProjectFromToken(token: string) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, tokenHash))
    .limit(1);
  if (!project) return null;
  if (!project.tokenHash) return null;
  if (!verifyToken(token, project.tokenHash)) return null;
  if (project.tokenRevokedAt || project.status === "purged") return "revoked";
  return project;
}

async function loadInputs(
  projectId: string,
  hotelId: string | null,
  language: "fr" | "en",
  contactEmail: string | null,
  goalPrimary: string | null,
  goalSecondary: string[] | null,
  budgetLevel: string | null,
  additionalInputs: FundingBriefAdditionalInputs | undefined,
): Promise<BriefGeneratorInput | null> {
  const [hotel] = hotelId
    ? await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1)
    : [];

  // Latest published snapshot — may be absent (project not yet published).
  const [snap] = await db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.projectId, projectId))
    .orderBy(desc(reportSnapshots.publishedAt))
    .limit(1);

  // Answers map (jsonb arrives already-parsed).
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, projectId))
    .limit(1);
  const answerMap: Record<string, unknown> = {};
  if (submission) {
    const rows = await db
      .select({ fieldId: answers.fieldId, valueJson: answers.valueJson })
      .from(answers)
      .where(eq(answers.submissionId, submission.id));
    for (const r of rows) answerMap[r.fieldId] = r.valueJson;
  }

  return {
    language,
    hotel: {
      name: hotel?.displayName ?? null,
      property_type: hotel?.propertyType ?? null,
      room_count: hotel?.roomCount ?? null,
      star_rating: hotel?.starRating ?? null,
      city: hotel?.city ?? null,
      region: hotel?.region ?? null,
      country: hotel?.country ?? null,
    },
    project: {
      contact_email: contactEmail,
      goal_primary: goalPrimary,
      goal_secondary: goalSecondary ?? [],
      budget_level: budgetLevel,
    },
    answers: answerMap,
    reportRendered: snap
      ? (snap.renderedJson as BriefGeneratorInput["reportRendered"])
      : null,
    additionalInputs,
  };
}

export async function getFundingBriefPreview(
  token: string,
  additionalInputs?: FundingBriefAdditionalInputs,
): Promise<FundingBriefPreviewResult> {
  const resolved = await resolveProjectFromToken(token);
  if (resolved === null) return { ok: false, reason: "unauthorized" };
  if (resolved === "revoked") return { ok: false, reason: "revoked" };
  const project = resolved;

  // Determine language + country from the linked hotel.
  const [hotel] = project.hotelId
    ? await db.select().from(hotels).where(eq(hotels.id, project.hotelId)).limit(1)
    : [];

  const country = hotel?.country ?? null;
  if ((country ?? "").toUpperCase() !== "FR") {
    return {
      ok: true,
      available: false,
      reason: "non_fr_market",
      country,
    };
  }

  const language: "fr" | "en" =
    (hotel?.primaryLanguage ?? "fr").toLowerCase() === "en" ? "en" : "fr";

  const input = await loadInputs(
    project.id,
    project.hotelId,
    language,
    project.contactEmail,
    project.goalPrimary,
    project.goalSecondary as string[] | null,
    project.budgetLevel,
    additionalInputs,
  );
  if (!input) return { ok: false, reason: "no_report" };

  const preview = generateBrief(input);

  // Surface any existing persisted brief so the UI can show "last generated".
  const [existing] = await db
    .select()
    .from(fundingBriefs)
    .where(eq(fundingBriefs.projectId, project.id))
    .limit(1);

  return {
    ok: true,
    available: true,
    preview,
    persisted: existing
      ? { id: existing.id, generated_at: existing.generatedAt }
      : null,
  };
}

export type GenerateFundingBriefResult =
  | {
      ok: true;
      funding_brief_id: string;
      generated_at: Date;
    }
  | {
      ok: false;
      reason: "unauthorized" | "revoked" | "non_fr_market" | "no_report";
    };

export async function generateFundingBrief(
  token: string,
  additionalInputs?: FundingBriefAdditionalInputs,
): Promise<GenerateFundingBriefResult> {
  const resolved = await resolveProjectFromToken(token);
  if (resolved === null) return { ok: false, reason: "unauthorized" };
  if (resolved === "revoked") return { ok: false, reason: "revoked" };
  const project = resolved;

  const [hotel] = project.hotelId
    ? await db.select().from(hotels).where(eq(hotels.id, project.hotelId)).limit(1)
    : [];
  const country = hotel?.country ?? null;
  if ((country ?? "").toUpperCase() !== "FR") {
    return { ok: false, reason: "non_fr_market" };
  }

  const language: "fr" | "en" =
    (hotel?.primaryLanguage ?? "fr").toLowerCase() === "en" ? "en" : "fr";

  const input = await loadInputs(
    project.id,
    project.hotelId,
    language,
    project.contactEmail,
    project.goalPrimary,
    project.goalSecondary as string[] | null,
    project.budgetLevel,
    additionalInputs,
  );
  if (!input) return { ok: false, reason: "no_report" };

  const content = generateBrief(input);
  const now = new Date();

  // Idempotent: one funding_briefs row per project (UNIQUE on project_id).
  // Re-generation overwrites the prior content so the latest hotelier-
  // provided additional_inputs are reflected.
  const [row] = await db
    .insert(fundingBriefs)
    .values({
      id: randomUUID(),
      projectId: project.id,
      contentJson: content,
      eligibilityDisclaimer: content.eligibility_disclaimer,
      generatedAt: now,
    })
    .onConflictDoUpdate({
      target: fundingBriefs.projectId,
      set: {
        contentJson: content,
        eligibilityDisclaimer: content.eligibility_disclaimer,
        generatedAt: now,
      },
    })
    .returning({ id: fundingBriefs.id, generatedAt: fundingBriefs.generatedAt });

  if (!row) {
    return { ok: false, reason: "no_report" };
  }

  writeAuditEntry({
    action: "report_exported",
    projectId: project.id,
    targetType: "funding_brief",
    targetId: row.id,
    metadata: {
      kind: "funding_brief",
      language,
      schema_version: content.schema_version,
    },
  });

  return { ok: true, funding_brief_id: row.id, generated_at: row.generatedAt };
}
