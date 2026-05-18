import "server-only";
import { db } from "@/lib/db";
import { auditLog, type AuditAction } from "@/db/schema";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

export interface AuditLogInput {
  actorId?: string | null;
  action: AuditAction;
  projectId?: string | null;
  /**
   * Optional target-entity type (per data-model.md §K). When set, the
   * metadata is enriched with the polymorphic target reference. Scanner
   * code uses `targetType: "scan"` to log per-scan events without a
   * project link (anonymous free-scan flow).
   */
  targetType?: string;
  /** Polymorphic target id paired with `targetType`. */
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit-log entry. Fire-and-forget by design — the caller doesn't
 * await because logging must never block the user-facing operation. Errors
 * are swallowed (logged to stderr only).
 */
export function writeAuditEntry(input: AuditLogInput): void {
  const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };
  if (input.targetType) metadata.targetType = input.targetType;
  if (input.targetId) metadata.targetId = input.targetId;
  void db
    .insert(auditLog)
    .values({
      id: randomUUID(),
      actorId: input.actorId ?? null,
      action: input.action,
      projectId: input.projectId ?? null,
      metadataJson:
        Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    })
    .catch((err) => {
      console.error("[audit-log]", err);
    });
}

/**
 * Scrub identifying fields from a project's audit-log rows when the hotel
 * exercises the right-to-erasure (FR-166 carve-out). The audit-log rows
 * themselves stay so compliance can demonstrate the deletion ran; only
 * the identifying metadata is replaced.
 */
export async function scrubAuditEntriesForProject(
  projectId: string,
  requestId: string,
): Promise<void> {
  const scrubMarker = `[REDACTED:deletion-${requestId}]`;
  await db
    .update(auditLog)
    .set({
      metadataJson: JSON.stringify({
        scrubbed: true,
        marker: scrubMarker,
      }),
    })
    .where(eq(auditLog.projectId, projectId));
}
