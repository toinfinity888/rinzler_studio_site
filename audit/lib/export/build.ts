import "server-only";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  submissions,
  answers,
  internalNotes,
  admins,
} from "@/db/schema";
import { SECTIONS } from "@/lib/form-schema/sections";
import { sectionTitle, t } from "@/lib/form-schema/i18n";
import { SYSTEM_BLOCK_SUBFIELDS, systemFieldId } from "@/lib/form-schema/types";
import { ExportV1, type ExportV1Type } from "./schema";

export interface BuildExportOptions {
  includeNotes?: boolean;
}

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

export async function buildExport(
  projectId: string,
  opts: BuildExportOptions = {},
): Promise<ExportV1Type> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);
  if (!submission) throw new Error(`Submission for project ${projectId} not found`);

  const answerRows = await db
    .select()
    .from(answers)
    .where(eq(answers.submissionId, submission.id));
  const byField = new Map(answerRows.map((a) => [a.fieldId, a]));

  const sections = SECTIONS.map((section) => {
    const rendered: {
      fieldId: string;
      label?: string;
      value: unknown;
      source?: "client" | "admin_prefill";
      updatedAt?: string;
    }[] = [];
    for (const field of section.fields) {
      if (field.type === "system-block") {
        for (const sub of SYSTEM_BLOCK_SUBFIELDS) {
          const id = systemFieldId(field.id, sub);
          const a = byField.get(id);
          if (!a) continue;
          rendered.push({
            fieldId: id,
            label: t(id).label,
            value: a.valueJson,
            source: legacySource(a.source),
            updatedAt: new Date(a.updatedAt).toISOString(),
          });
        }
        continue;
      }
      const a = byField.get(field.id);
      if (!a) continue;
      rendered.push({
        fieldId: field.id,
        label: t(field.id).label,
        value: a.valueJson,
        source: legacySource(a.source),
        updatedAt: new Date(a.updatedAt).toISOString(),
      });
    }
    return { id: section.id, title: sectionTitle(section.id), answers: rendered };
  });

  // Feature-001 stub scores were always [{0,0,0,0}]; feature 003's new
  // readinessScores table has a different shape (projectId, dimension)
  // and is populated by the ai.reason_project worker (US 3). Until US 3
  // lands, the export emits an empty score array.
  const scoreOut: {
    name: "automation_opportunity" | "operational_complexity" | "modernization_readiness" | "digital_maturity";
    value: number;
    band: "low" | "medium" | "high";
    basis?: string[];
    computedAt?: string;
  }[] = [];

  const result: ExportV1Type = {
    schemaVersion: "audit-export.v1",
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      label: project.label,
      hotelName: project.hotelName ?? null,
      contactEmail: project.contactEmail ?? "",
      priority: project.priority,
      status: legacyStatus(project.status),
      ongoingEngagement: Boolean(project.ongoingEngagement),
      createdAt: new Date(project.createdAt).toISOString(),
      sentAt: isoOrNull(project.sentAt),
      submittedAt: isoOrNull(project.submittedAt),
      lastEditedAt: isoOrNull(project.lastEditedAt),
      lastAdminActivityAt: new Date(project.lastAdminActivityAt).toISOString(),
    },
    submission: {
      completionPct: submission.completionPct,
      updatedAt: new Date(submission.updatedAt).toISOString(),
      sections,
    },
    scores: scoreOut,
  };

  if (opts.includeNotes) {
    const notes = await db
      .select({
        id: internalNotes.id,
        body: internalNotes.body,
        createdAt: internalNotes.createdAt,
        authorEmail: admins.email,
      })
      .from(internalNotes)
      .leftJoin(admins, eq(internalNotes.authorId, admins.id))
      .where(eq(internalNotes.projectId, project.id))
      .orderBy(asc(internalNotes.createdAt));
    result.internalNotes = notes.map((n) => ({
      id: n.id,
      authorEmail: n.authorEmail ?? "unknown@local",
      body: n.body,
      createdAt: new Date(n.createdAt).toISOString(),
    }));
  }

  const parsed = ExportV1.safeParse(result);
  if (!parsed.success) {
    throw new Error(`Export failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Map the wider feature-003 `answers.source` enum back to the narrower
 * legacy export shape. `consultant_override` is treated as client-supplied
 * (the consultant authored it on behalf of the client); `voice_extracted`
 * is treated as client (the hotelier confirmed the transcript before
 * commit); `scan_inferred` is treated as admin_prefill (machine-supplied,
 * akin to admin pre-fill).
 */
function legacySource(
  source: "client" | "admin_prefill" | "consultant_override" | "voice_extracted" | "scan_inferred",
): "client" | "admin_prefill" {
  if (source === "admin_prefill" || source === "scan_inferred") return "admin_prefill";
  return "client";
}

/**
 * Map the wider feature-003 project status enum back to the legacy export
 * shape. New states without a direct legacy equivalent collapse to the
 * closest analog: `awaiting_client` → `awaiting`, `consultant_finalized`
 * and `published` → `submitted`, `archived` → `purged`.
 */
function legacyStatus(
  status:
    | "draft"
    | "awaiting_client"
    | "in_progress"
    | "submitted"
    | "consultant_finalized"
    | "published"
    | "archived"
    | "reopened"
    | "purged",
): "draft" | "in_progress" | "submitted" | "reopened" | "purged" | "awaiting" {
  switch (status) {
    case "awaiting_client":
      return "awaiting";
    case "consultant_finalized":
    case "published":
      return "submitted";
    case "archived":
      return "purged";
    default:
      return status;
  }
}
