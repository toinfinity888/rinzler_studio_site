"use server";

/**
 * `optInToEmail(scanId, email, consent)` — public server action (T044).
 *
 * Per public-server-actions.md / FR-009:
 *  - Requires explicit `consent === true`.
 *  - Validates email shape.
 *  - Attaches the email to the standalone free-scan project.
 *  - MUST NOT degrade the visible scan output if the visitor declines.
 *  - Errors are silent UX-side (always returns `{ ok: true }` unless the
 *    consent flag is missing or the email shape is obviously invalid).
 */

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { scans, projects } from "@/db/schema";
import { writeAuditEntry } from "@/lib/audit-log";

const EmailSchema = z.string().email().max(320);

export interface OptInResult {
  ok: boolean;
  reason?: "no_consent" | "invalid_email" | "scan_not_found";
}

export async function optInToEmail(
  scanId: string,
  email: string,
  consent: boolean,
): Promise<OptInResult> {
  if (consent !== true) {
    return { ok: false, reason: "no_consent" };
  }
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_email" };
  }

  const rows = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (rows.length === 0 || !rows[0]!.projectId) {
    return { ok: false, reason: "scan_not_found" };
  }
  const projectId = rows[0]!.projectId;

  await db
    .update(projects)
    .set({ contactEmail: parsed.data })
    .where(eq(projects.id, projectId));

  await writeAuditEntry({
    action: "scan_email_opt_in",
    projectId,
    targetType: "scan",
    targetId: scanId,
    metadata: { consent: true },
  });

  return { ok: true };
}
