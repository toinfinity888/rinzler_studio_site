import "server-only";
import { db } from "@/lib/db";
import { auditLog, type AuditAction } from "@/db/schema";
import { randomUUID } from "node:crypto";

export interface AuditLogInput {
  actorId?: string | null;
  action: AuditAction;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit-log entry. Fire-and-forget by design — the caller doesn't
 * await because logging must never block the user-facing operation. Errors
 * are swallowed (logged to stderr only).
 */
export function writeAuditEntry(input: AuditLogInput): void {
  void db
    .insert(auditLog)
    .values({
      id: randomUUID(),
      actorId: input.actorId ?? null,
      action: input.action,
      projectId: input.projectId ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    })
    .catch((err) => {
      console.error("[audit-log]", err);
    });
}
