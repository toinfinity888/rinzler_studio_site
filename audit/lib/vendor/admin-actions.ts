"use server";

/**
 * T095, T096 — Vendor database admin server actions.
 *
 * Implements the contract in
 * `specs/003-hotel-diagnostic-platform/contracts/admin-server-actions.md`
 * (Vendor database, US 5) and the data model in `data-model.md` §E.
 *
 * Hard guarantees:
 *  - Every mutation gates on `vendor_database_admin` or `super_admin`
 *    via `requireAdminWithAnyRole`.
 *  - Every successful update appends a new `vendor_versions` row
 *    (FR-023, append-only — never edit in place).
 *  - Every changed field produces a `provenance_records` row
 *    (FR-024). The caller supplies the source label per changed field.
 *  - Every action writes an `audit_log` entry with the canonical
 *    action enum value from data-model.md §K.
 *  - The active recommendation snapshot is NOT silently re-pointed at
 *    a new vendor_version — historical reports keep their pinned
 *    versions (FR-094, SC-020).
 */

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  vendors,
  vendorVersions,
  vendorTranslations,
  provenanceRecords,
  VENDOR_CATEGORIES,
  VENDOR_STATUSES,
  PROVENANCE_SOURCES,
  type VendorCategory,
  type ProvenanceSource,
} from "@/db/schema";
import { writeAuditEntry } from "@/lib/audit-log";
import { requireAdminWithAnyRole } from "@/lib/auth/hydrate-roles";

const CONFIDENCE = ["high", "medium", "low"] as const;
type Confidence = (typeof CONFIDENCE)[number];

const TRANSLATION_INPUT = z.object({
  language: z.string().min(2).max(8),
  description_short: z.string().max(400).optional().nullable(),
  description_long: z.string().max(4000).optional().nullable(),
  strengths: z.array(z.string().max(400)).optional().default([]),
  limitations: z.array(z.string().max(400)).optional().default([]),
  when_to_recommend: z.array(z.string().max(400)).optional().default([]),
  when_not_to_recommend: z.array(z.string().max(400)).optional().default([]),
});

const CORE_VENDOR_INPUT = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "ASCII slug with underscores only")
    .min(2)
    .max(64),
  category: z.enum(VENDOR_CATEGORIES),
  official_url: z.string().url().optional().nullable(),
  target_hotel_sizes: z.array(z.string()).optional().default([]),
  target_property_types: z.array(z.string()).optional().default([]),
  countries_served: z.array(z.string()).optional().default([]),
  languages_supported: z.array(z.string()).optional().default([]),
  independent_hotel_suitability: z
    .enum(["strong", "fair", "weak", "unknown"])
    .optional()
    .nullable(),
  small_hotel_suitability: z
    .enum(["strong", "fair", "weak", "unknown"])
    .optional()
    .nullable(),
  core_features: z.unknown().optional(),
  integrations: z.unknown().optional(),
  api_availability: z
    .enum(["yes", "partial", "no", "unknown"])
    .optional()
    .nullable(),
  automation_capabilities: z.array(z.string()).optional().default([]),
  ai_features: z.array(z.string()).optional().default([]),
  reporting_capabilities: z.array(z.string()).optional().default([]),
  implementation_complexity: z
    .enum(["low", "medium", "high"])
    .optional()
    .nullable(),
  price_tier: z
    .enum(["free", "entry", "mid", "premium", "enterprise", "variable"])
    .optional()
    .nullable(),
  support_availability: z
    .enum(["24x7", "business_hours", "business_days", "asynchronous", "community"])
    .optional()
    .nullable(),
  french_market_relevance: z
    .enum(["native_fr", "strong", "present", "unknown", "weak"])
    .optional()
    .nullable(),
  gdpr_posture: z
    .enum(["dpa_published", "dpa_on_request", "unclear", "unknown", "non_compliant"])
    .optional()
    .nullable(),
  eu_hosting: z
    .enum(["confirmed_eu", "mixed", "non_eu", "unknown"])
    .optional()
    .nullable(),
  typical_implementation_risks: z.unknown().optional(),
  compatibility_notes: z.string().max(4000).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  confidence: z.enum(CONFIDENCE).optional().default("medium"),
});

const PROVENANCE_INPUT = z.object({
  field_path: z.string().min(1).max(120),
  source: z.enum(PROVENANCE_SOURCES),
  contributor_label: z.string().max(200).optional().nullable(),
  confidence: z.enum(CONFIDENCE).optional().default("medium"),
});
export type VendorProvenanceInput = z.infer<typeof PROVENANCE_INPUT>;

const CREATE_INPUT = CORE_VENDOR_INPUT.extend({
  translations: z.array(TRANSLATION_INPUT).min(1),
  provenance: z.array(PROVENANCE_INPUT).optional().default([]),
});
export type CreateVendorInput = z.input<typeof CREATE_INPUT>;

const UPDATE_INPUT = CORE_VENDOR_INPUT.partial().extend({
  translations: z.array(TRANSLATION_INPUT).optional(),
  provenance: z.array(PROVENANCE_INPUT).optional().default([]),
});
export type UpdateVendorInput = z.input<typeof UPDATE_INPUT>;

export interface ActionOk<T = unknown> {
  ok: true;
  data: T;
}
export interface ActionErr {
  ok: false;
  error: { code: string; message: string };
}
export type ActionResult<T = unknown> = ActionOk<T> | ActionErr;

/**
 * Build the "snapshot" jsonb persisted on every `vendor_versions` row.
 * The snapshot is the entire user-supplied vendor payload plus its
 * translations, so historical reports can re-render an old version
 * without joining back into the live row.
 */
function buildSnapshot(
  core: z.infer<typeof CORE_VENDOR_INPUT>,
  translations: z.infer<typeof TRANSLATION_INPUT>[],
): Record<string, unknown> {
  return {
    ...core,
    translations,
  };
}

async function nextVersionNumber(vendorId: string): Promise<number> {
  const [row] = await db
    .select({ version: vendorVersions.version })
    .from(vendorVersions)
    .where(eq(vendorVersions.vendorId, vendorId))
    .orderBy(desc(vendorVersions.version))
    .limit(1);
  return (row?.version ?? 0) + 1;
}

async function writeVendorProvenance(
  vendorId: string,
  provenance: VendorProvenanceInput[],
  contributorId: string,
): Promise<void> {
  if (provenance.length === 0) return;
  const now = new Date();
  for (const p of provenance) {
    await db.insert(provenanceRecords).values({
      id: randomUUID(),
      entityType: "vendor",
      entityId: vendorId,
      fieldPath: p.field_path,
      source: p.source as ProvenanceSource,
      contributorId,
      contributorLabel: p.contributor_label ?? null,
      addedAt: now,
      lastVerifiedAt: now,
      confidence: p.confidence ?? "medium",
      conflictNote: null,
    });
  }
}

/* ============================== createVendor ============================== */

export async function createVendor(
  raw: CreateVendorInput,
): Promise<ActionResult<{ vendorId: string; version: number }>> {
  const user = await requireAdminWithAnyRole([
    "vendor_database_admin",
    "super_admin",
  ]);
  const parsed = CREATE_INPUT.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "validation", message: parsed.error.message },
    };
  }
  const input = parsed.data;

  // Slug uniqueness check up front for a friendly error.
  const existing = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.slug, input.slug))
    .limit(1);
  if (existing.length > 0) {
    return {
      ok: false,
      error: { code: "slug_taken", message: `Slug ${input.slug} already used` },
    };
  }

  const vendorId = randomUUID();
  const versionId = randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(vendors).values({
      id: vendorId,
      slug: input.slug,
      category: input.category as VendorCategory,
      officialUrl: input.official_url ?? null,
      targetHotelSizes: input.target_hotel_sizes,
      targetPropertyTypes: input.target_property_types,
      countriesServed: input.countries_served,
      languagesSupported: input.languages_supported,
      independentHotelSuitability: input.independent_hotel_suitability ?? null,
      smallHotelSuitability: input.small_hotel_suitability ?? null,
      coreFeatures: (input.core_features as object | null) ?? null,
      integrations: (input.integrations as object | null) ?? null,
      apiAvailability: input.api_availability ?? null,
      automationCapabilities: input.automation_capabilities,
      aiFeatures: input.ai_features,
      reportingCapabilities: input.reporting_capabilities,
      implementationComplexity: input.implementation_complexity ?? null,
      priceTier: input.price_tier ?? null,
      supportAvailability: input.support_availability ?? null,
      frenchMarketRelevance: input.french_market_relevance ?? null,
      gdprPosture: input.gdpr_posture ?? null,
      euHosting: input.eu_hosting ?? null,
      typicalImplementationRisks:
        (input.typical_implementation_risks as object | null) ?? null,
      compatibilityNotes: input.compatibility_notes ?? null,
      tags: input.tags,
      status: "active",
      currentVersion: 1,
      confidence: input.confidence,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(vendorVersions).values({
      id: versionId,
      vendorId,
      version: 1,
      snapshotJson: buildSnapshot(input, input.translations),
      publishedAt: now,
      publishedBy: user.id,
    });

    for (const t of input.translations) {
      await tx.insert(vendorTranslations).values({
        vendorVersionId: versionId,
        language: t.language,
        descriptionShort: t.description_short ?? null,
        descriptionLong: t.description_long ?? null,
        strengths: t.strengths,
        limitations: t.limitations,
        whenToRecommend: t.when_to_recommend,
        whenNotToRecommend: t.when_not_to_recommend,
      });
    }
  });

  await writeVendorProvenance(vendorId, input.provenance ?? [], user.id);

  writeAuditEntry({
    actorId: user.id,
    action: "vendor_created",
    targetType: "vendor",
    targetId: vendorId,
    metadata: { slug: input.slug, category: input.category },
  });

  revalidatePath("/admin/vendors");
  return { ok: true, data: { vendorId, version: 1 } };
}

/* ============================== updateVendor ============================== */

export async function updateVendor(
  vendorId: string,
  raw: UpdateVendorInput,
): Promise<ActionResult<{ vendorId: string; version: number }>> {
  const user = await requireAdminWithAnyRole([
    "vendor_database_admin",
    "super_admin",
  ]);
  const parsed = UPDATE_INPUT.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "validation", message: parsed.error.message },
    };
  }
  const patch = parsed.data;

  const [current] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!current) {
    return { ok: false, error: { code: "not_found", message: "Vendor not found" } };
  }

  const now = new Date();
  const nextVersion = await nextVersionNumber(vendorId);
  const versionId = randomUUID();

  // Resolve merged core payload (DB row + patch). The merged payload is what
  // we persist on the live row AND in the snapshot.
  const merged: z.infer<typeof CORE_VENDOR_INPUT> = {
    slug: patch.slug ?? current.slug,
    category: (patch.category ?? current.category) as VendorCategory,
    official_url: patch.official_url ?? current.officialUrl ?? null,
    target_hotel_sizes: patch.target_hotel_sizes ?? current.targetHotelSizes ?? [],
    target_property_types:
      patch.target_property_types ?? current.targetPropertyTypes ?? [],
    countries_served: patch.countries_served ?? current.countriesServed ?? [],
    languages_supported:
      patch.languages_supported ?? current.languagesSupported ?? [],
    independent_hotel_suitability:
      (patch.independent_hotel_suitability ??
        current.independentHotelSuitability ??
        null) as never,
    small_hotel_suitability:
      (patch.small_hotel_suitability ?? current.smallHotelSuitability ?? null) as never,
    core_features: patch.core_features ?? current.coreFeatures ?? null,
    integrations: patch.integrations ?? current.integrations ?? null,
    api_availability:
      (patch.api_availability ?? current.apiAvailability ?? null) as never,
    automation_capabilities:
      patch.automation_capabilities ?? current.automationCapabilities ?? [],
    ai_features: patch.ai_features ?? current.aiFeatures ?? [],
    reporting_capabilities:
      patch.reporting_capabilities ?? current.reportingCapabilities ?? [],
    implementation_complexity:
      (patch.implementation_complexity ??
        current.implementationComplexity ??
        null) as never,
    price_tier: (patch.price_tier ?? current.priceTier ?? null) as never,
    support_availability:
      (patch.support_availability ?? current.supportAvailability ?? null) as never,
    french_market_relevance:
      (patch.french_market_relevance ?? current.frenchMarketRelevance ?? null) as never,
    gdpr_posture: (patch.gdpr_posture ?? current.gdprPosture ?? null) as never,
    eu_hosting: (patch.eu_hosting ?? current.euHosting ?? null) as never,
    typical_implementation_risks:
      patch.typical_implementation_risks ?? current.typicalImplementationRisks ?? null,
    compatibility_notes:
      patch.compatibility_notes ?? current.compatibilityNotes ?? null,
    tags: patch.tags ?? current.tags ?? [],
    confidence:
      ((patch.confidence ?? current.confidence) as Confidence) ?? "medium",
  };

  // Translations are write-through-version: the patch supplies the FULL set
  // for the new version, mirroring how the admin form submits.
  const translations = patch.translations ?? [];

  // Persisting the snapshot lets historical reports re-render the exact
  // payload that informed them (FR-094, SC-020).
  const snapshot = buildSnapshot(merged, translations);

  await db.transaction(async (tx) => {
    await tx.insert(vendorVersions).values({
      id: versionId,
      vendorId,
      version: nextVersion,
      snapshotJson: snapshot,
      publishedAt: now,
      publishedBy: user.id,
    });

    for (const t of translations) {
      await tx.insert(vendorTranslations).values({
        vendorVersionId: versionId,
        language: t.language,
        descriptionShort: t.description_short ?? null,
        descriptionLong: t.description_long ?? null,
        strengths: t.strengths,
        limitations: t.limitations,
        whenToRecommend: t.when_to_recommend,
        whenNotToRecommend: t.when_not_to_recommend,
      });
    }

    // Update the live vendor row with the merged payload so the admin
    // list shows the current state. Pinned historical reports still
    // dereference their vendor_version_id, so this is safe.
    await tx
      .update(vendors)
      .set({
        slug: merged.slug,
        category: merged.category,
        officialUrl: merged.official_url ?? null,
        targetHotelSizes: merged.target_hotel_sizes,
        targetPropertyTypes: merged.target_property_types,
        countriesServed: merged.countries_served,
        languagesSupported: merged.languages_supported,
        independentHotelSuitability: merged.independent_hotel_suitability ?? null,
        smallHotelSuitability: merged.small_hotel_suitability ?? null,
        coreFeatures: (merged.core_features as object | null) ?? null,
        integrations: (merged.integrations as object | null) ?? null,
        apiAvailability: merged.api_availability ?? null,
        automationCapabilities: merged.automation_capabilities,
        aiFeatures: merged.ai_features,
        reportingCapabilities: merged.reporting_capabilities,
        implementationComplexity: merged.implementation_complexity ?? null,
        priceTier: merged.price_tier ?? null,
        supportAvailability: merged.support_availability ?? null,
        frenchMarketRelevance: merged.french_market_relevance ?? null,
        gdprPosture: merged.gdpr_posture ?? null,
        euHosting: merged.eu_hosting ?? null,
        typicalImplementationRisks:
          (merged.typical_implementation_risks as object | null) ?? null,
        compatibilityNotes: merged.compatibility_notes ?? null,
        tags: merged.tags,
        confidence: merged.confidence,
        currentVersion: nextVersion,
        updatedAt: now,
      })
      .where(eq(vendors.id, vendorId));
  });

  await writeVendorProvenance(vendorId, patch.provenance ?? [], user.id);

  writeAuditEntry({
    actorId: user.id,
    action: "vendor_updated",
    targetType: "vendor",
    targetId: vendorId,
    metadata: { version: nextVersion },
  });

  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}/edit`);
  return { ok: true, data: { vendorId, version: nextVersion } };
}

/* ============================== retireVendor ============================== */

export async function retireVendor(
  vendorId: string,
): Promise<ActionResult<{ vendorId: string }>> {
  const user = await requireAdminWithAnyRole([
    "vendor_database_admin",
    "super_admin",
  ]);

  const [current] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!current) {
    return { ok: false, error: { code: "not_found", message: "Vendor not found" } };
  }
  if (current.status === "retired") {
    return { ok: true, data: { vendorId } };
  }

  await db
    .update(vendors)
    .set({ status: "retired", updatedAt: new Date() })
    .where(eq(vendors.id, vendorId));

  writeAuditEntry({
    actorId: user.id,
    action: "vendor_retired",
    targetType: "vendor",
    targetId: vendorId,
    metadata: { slug: current.slug },
  });

  revalidatePath("/admin/vendors");
  return { ok: true, data: { vendorId } };
}

/* ============================== filterVendors ============================== */

export interface FilterVendorsInput {
  category?: VendorCategory;
  tag?: string;
  country?: string;
  language?: string;
  status?: "active" | "retired" | "any";
  freshness_window_days?: number;
  search?: string;
}

export async function filterVendors(query: FilterVendorsInput = {}) {
  // Read path is intentionally permissive — any admin/consultant viewer with
  // a valid session may filter the catalogue.
  await requireAdminWithAnyRole([
    "vendor_database_admin",
    "consultant",
    "questionnaire_admin",
    "super_admin",
  ]);
  const wheres: ReturnType<typeof eq>[] = [];
  if (query.category) wheres.push(eq(vendors.category, query.category));
  if (query.status && query.status !== "any") {
    wheres.push(eq(vendors.status, query.status));
  }
  if (query.tag) {
    wheres.push(sql`${vendors.tags} @> ARRAY[${query.tag}]::text[]` as never);
  }
  if (query.country) {
    wheres.push(
      sql`${vendors.countriesServed} @> ARRAY[${query.country}]::text[]` as never,
    );
  }
  if (query.language) {
    wheres.push(
      sql`${vendors.languagesSupported} @> ARRAY[${query.language}]::text[]` as never,
    );
  }
  if (query.search) {
    wheres.push(sql`${vendors.slug} ILIKE ${"%" + query.search + "%"}` as never);
  }

  const rows = await db
    .select()
    .from(vendors)
    .where(wheres.length > 0 ? and(...wheres) : undefined)
    .orderBy(vendors.category, vendors.slug);

  return rows;
}

/* ============================== compareVendorsSideBySide ============================== */

export async function compareVendorsSideBySide(vendorIds: string[]) {
  await requireAdminWithAnyRole([
    "vendor_database_admin",
    "consultant",
    "questionnaire_admin",
    "super_admin",
  ]);
  if (vendorIds.length === 0) return { vendors: [], translations: {} };
  const rows = await db
    .select()
    .from(vendors)
    .where(inArray(vendors.id, vendorIds));
  // Fetch the current-version translations in parallel.
  const versionIdByVendor = new Map<string, string>();
  for (const v of rows) {
    const [vv] = await db
      .select({ id: vendorVersions.id })
      .from(vendorVersions)
      .where(
        and(
          eq(vendorVersions.vendorId, v.id),
          eq(vendorVersions.version, v.currentVersion),
        ),
      )
      .limit(1);
    if (vv) versionIdByVendor.set(v.id, vv.id);
  }
  const translationsByVendor: Record<
    string,
    Array<typeof vendorTranslations.$inferSelect>
  > = {};
  for (const [vendorId, versionId] of versionIdByVendor) {
    const ts = await db
      .select()
      .from(vendorTranslations)
      .where(eq(vendorTranslations.vendorVersionId, versionId));
    translationsByVendor[vendorId] = ts;
  }
  return { vendors: rows, translations: translationsByVendor };
}

/* ============================== getVendorVersionForReport ============================== */

/**
 * Helper used by report-rendering code (FR-094) — given a `vendor_versions.id`
 * pinned at publish time, return the snapshot that was published. Active
 * `vendors` row mutations and retirements do not affect this lookup.
 */
export async function getVendorVersion(versionId: string) {
  const [row] = await db
    .select()
    .from(vendorVersions)
    .where(eq(vendorVersions.id, versionId))
    .limit(1);
  return row ?? null;
}

// VENDOR_STATUS_VALUES + VENDOR_CATEGORY_VALUES live in `./constants` because
// this module is `"use server"` and Next.js restricts it to async-function
// exports only.
