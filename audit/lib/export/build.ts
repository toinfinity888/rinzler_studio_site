import "server-only";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  submissions,
  answers,
  scores,
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
            value: parseValue(a.valueJson),
            source: a.source,
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
        value: parseValue(a.valueJson),
        source: a.source,
        updatedAt: new Date(a.updatedAt).toISOString(),
      });
    }
    return { id: section.id, title: sectionTitle(section.id), answers: rendered };
  });

  const scoreRows = await db
    .select()
    .from(scores)
    .where(eq(scores.submissionId, submission.id));
  const scoreOut = scoreRows.map((s) => ({
    name: s.name,
    value: s.value,
    band: s.band,
    basis: parseBasis(s.basisJson),
    computedAt: new Date(s.computedAt).toISOString(),
  }));

  const result: ExportV1Type = {
    schemaVersion: "audit-export.v1",
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      label: project.label,
      hotelName: project.hotelName ?? null,
      contactEmail: project.contactEmail,
      priority: project.priority,
      status: project.status,
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

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseBasis(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
