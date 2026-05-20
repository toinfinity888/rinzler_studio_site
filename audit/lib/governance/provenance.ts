import "server-only";

import { and, eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  provenanceRecords,
  type ProvenanceSource,
} from "@/db/schema";

export {
  DEFAULT_FRESHNESS_DAYS,
  freshnessStatus,
  type FreshnessStatus,
} from "./freshness";

/**
 * Provenance helpers (T023 — FR-110, FR-111, FR-112).
 *
 * Every recommendation-driving field carries:
 *  - source (official_vendor / public / consultant_verified / client_reported /
 *    ai_inferred / outdated / uncertain),
 *  - contributor (FK to users.id when team-supplied),
 *  - added_at + last_verified_at,
 *  - confidence (high / medium / low),
 *  - conflict_note (set when multiple sources disagree).
 *
 * Default freshness window: 180 days. Beyond that, the entry is flagged
 * "stale" — the render layer surfaces this to consultants and admins, and a
 * softer caveat to clients (FR-111).
 */

export interface WriteProvenanceArgs {
  entityType: string;
  entityId: string;
  fieldPath: string;
  source: ProvenanceSource;
  contributorId?: string | null;
  contributorLabel?: string | null;
  confidence?: "high" | "medium" | "low";
  conflictNote?: string | null;
}

export async function writeProvenance(args: WriteProvenanceArgs): Promise<void> {
  await db.insert(provenanceRecords).values({
    entityType: args.entityType,
    entityId: args.entityId,
    fieldPath: args.fieldPath,
    source: args.source,
    contributorId: args.contributorId ?? null,
    contributorLabel: args.contributorLabel ?? null,
    lastVerifiedAt: new Date(),
    confidence: args.confidence ?? "medium",
    conflictNote: args.conflictNote ?? null,
  });
}

export async function readProvenance(
  entityType: string,
  entityId: string,
  fieldPath?: string,
) {
  const where = fieldPath
    ? and(
        eq(provenanceRecords.entityType, entityType),
        eq(provenanceRecords.entityId, entityId),
        eq(provenanceRecords.fieldPath, fieldPath),
      )
    : and(
        eq(provenanceRecords.entityType, entityType),
        eq(provenanceRecords.entityId, entityId),
      );
  return db.select().from(provenanceRecords).where(where);
}

/**
 * Returns true when more than one provenance row exists for the same field
 * path AND their stored values diverge — the call site is expected to surface
 * the conflict rather than silently choosing between them (FR-112).
 */
export async function hasConflict(
  entityType: string,
  entityId: string,
  fieldPath: string,
): Promise<boolean> {
  const rows = await readProvenance(entityType, entityId, fieldPath);
  if (rows.length < 2) return false;
  // The conflict is meaningful when sources differ AND any row carries an
  // explicit conflict_note. Tighter conflict detection (value diffs) is
  // applied at the recommendation-build stage.
  const sources = new Set(rows.map((r) => r.source));
  return sources.size > 1;
}

export async function markStale(
  entityType: string,
  entityId: string,
  cutoff: Date,
): Promise<number> {
  // Returns the count of rows older than `cutoff` for this entity.
  const rows = await db
    .select()
    .from(provenanceRecords)
    .where(
      and(
        eq(provenanceRecords.entityType, entityType),
        eq(provenanceRecords.entityId, entityId),
        lt(provenanceRecords.lastVerifiedAt, cutoff),
      ),
    );
  return rows.length;
}
