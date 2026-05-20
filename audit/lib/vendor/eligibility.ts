/**
 * Pure vendor eligibility predicates extracted so the FR-023 / FR-024
 * contracts can be tested without the DB. The worker (`ai.worker.ts`)
 * filters by `vendors.status = 'active'` at the SQL layer; this helper
 * mirrors that decision so we can pin it as a contract.
 *
 * Keep in sync with the worker query.
 */
import type { VendorStatus } from "@/db/schema";

export interface VendorStatusLike {
  status: VendorStatus | string;
}

/**
 * True iff the vendor should be considered for NEW recommendations.
 * Retired vendors remain in the catalogue for historical resolution
 * (so prior `vendor_version_id` references still hydrate names + slugs)
 * but never seed new recommendations.
 */
export function isActiveVendor(v: VendorStatusLike): boolean {
  return v.status === "active";
}

/**
 * The set of currently-active vendor entries from a mixed catalogue.
 * Used by callers (e.g., the worker) that have loaded the full table and
 * need to hand the engine only the active subset.
 */
export function activeVendors<T extends VendorStatusLike>(catalogue: T[]): T[] {
  return catalogue.filter(isActiveVendor);
}
