"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { projects, submissions, answers, internalNotes, PRIORITIES } from "@/db/schema";
import { generateToken } from "@/lib/tokens";
import { writeAuditEntry } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/auth/session";
import { computeCompletionPct } from "@/lib/form-schema/completion";
import { SECTIONS } from "@/lib/form-schema/sections";
import { validatePartial, buildZodSchema } from "@/lib/form-schema/validation";

const SCHEMA = buildZodSchema(SECTIONS);

const createInput = z.object({
  label: z.string().trim().min(1).max(200),
  contactEmail: z.string().email().max(200),
  hotelName: z.string().trim().max(200).optional(),
  priority: z.enum(PRIORITIES).optional(),
  prefill: z.record(z.string(), z.unknown()).optional(),
});

export type CreateProjectInput = z.infer<typeof createInput>;

export interface CreateProjectResult {
  ok: true;
  projectId: string;
  tokenPlaintext: string;
}

export async function createProject(rawInput: CreateProjectInput): Promise<CreateProjectResult> {
  const admin = await requireAdmin();
  const input = createInput.parse(rawInput);

  const { plaintext, hash } = generateToken();
  const projectId = randomUUID();
  const submissionId = randomUUID();
  const now = new Date();

  const validatedPrefill = input.prefill
    ? validatePartial(input.prefill, SCHEMA).valid
    : {};

  await db.transaction(async (tx) => {
    await tx.insert(projects).values({
      id: projectId,
      label: input.label.trim(),
      hotelName: input.hotelName?.trim() || null,
      contactEmail: input.contactEmail,
      priority: input.priority ?? "medium",
      status: "awaiting_client",
      tokenHash: hash,
      ongoingEngagement: false,
      createdAt: now,
      lastAdminActivityAt: now,
      createdBy: admin.id,
    });
    await tx.insert(submissions).values({
      id: submissionId,
      projectId,
      completionPct: 0,
      createdAt: now,
      updatedAt: now,
    });

    for (const [fieldId, value] of Object.entries(validatedPrefill)) {
      await tx.insert(answers).values({
        id: randomUUID(),
        submissionId,
        fieldId,
        valueJson: JSON.stringify(value),
        updatedAt: now,
        source: "admin_prefill",
      });
    }

    if (Object.keys(validatedPrefill).length > 0) {
      const pct = computeCompletionPct(validatedPrefill, SECTIONS);
      await tx
        .update(submissions)
        .set({ completionPct: pct, updatedAt: now })
        .where(eq(submissions.id, submissionId));
    }
  });

  writeAuditEntry({
    actorId: admin.id,
    action: "project.create",
    projectId,
    metadata: {
      label: input.label.trim(),
      prefilledFields: Object.keys(validatedPrefill),
    },
  });

  revalidatePath("/admin/projects");
  return { ok: true, projectId, tokenPlaintext: plaintext };
}

const PRIORITY_INPUT = z.enum(PRIORITIES);

export async function updateProjectPriority(
  projectId: string,
  priority: (typeof PRIORITIES)[number],
) {
  const admin = await requireAdmin();
  const validated = PRIORITY_INPUT.parse(priority);
  const now = new Date();
  await db
    .update(projects)
    .set({ priority: validated, lastAdminActivityAt: now })
    .where(eq(projects.id, projectId));
  writeAuditEntry({
    actorId: admin.id,
    action: "project.update_priority",
    projectId,
    metadata: { priority: validated },
  });
  revalidatePath("/admin/projects");
}

export async function bumpLastAdminActivity(projectId: string) {
  await requireAdmin();
  await db
    .update(projects)
    .set({ lastAdminActivityAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function appendInternalNote(projectId: string, body: string) {
  const admin = await requireAdmin();
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 5000) {
    throw new Error("Note body must be 1..5000 characters");
  }
  const now = new Date();
  await db.insert(internalNotes).values({
    id: randomUUID(),
    projectId,
    targetType: "project",
    targetId: projectId,
    authorId: admin.id,
    body: trimmed,
    createdAt: now,
  });
  await db
    .update(projects)
    .set({ lastAdminActivityAt: now })
    .where(eq(projects.id, projectId));
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function revokeProjectToken(projectId: string) {
  const admin = await requireAdmin();
  const now = new Date();
  await db
    .update(projects)
    .set({ tokenRevokedAt: now, lastAdminActivityAt: now })
    .where(eq(projects.id, projectId));
  writeAuditEntry({ actorId: admin.id, action: "project.revoke", projectId });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function reopenProject(projectId: string) {
  const admin = await requireAdmin();
  const now = new Date();
  await db
    .update(projects)
    .set({ status: "reopened", lastAdminActivityAt: now })
    .where(eq(projects.id, projectId));
  writeAuditEntry({ actorId: admin.id, action: "project.reopen", projectId });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function markOngoingEngagement(projectId: string, ongoing: boolean) {
  const admin = await requireAdmin();
  await db
    .update(projects)
    .set({ ongoingEngagement: ongoing, lastAdminActivityAt: new Date() })
    .where(eq(projects.id, projectId));
  writeAuditEntry({
    actorId: admin.id,
    action: "project.mark_ongoing",
    projectId,
    metadata: { ongoing },
  });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

const DELETE_INPUT = z.object({ projectId: z.string(), confirmLabel: z.string() });

export async function deleteProject(projectId: string, confirmLabel: string) {
  const admin = await requireAdmin();
  DELETE_INPUT.parse({ projectId, confirmLabel });
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("Project not found");
  if (project.label !== confirmLabel) {
    throw new Error("Confirmation label does not match");
  }
  await db.delete(projects).where(eq(projects.id, projectId));
  writeAuditEntry({
    actorId: admin.id,
    action: "project.delete",
    projectId,
    metadata: { label: project.label },
  });
  revalidatePath("/admin/projects");
}
