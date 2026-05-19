/**
 * T100 — bootstrap the vendor catalogue from `data/vendors-seed.yaml`.
 *
 * Bypasses `lib/vendor/admin-actions.ts::createVendor` because that path is
 * gated on an admin session. The seed writes directly to the DB tables
 * (`vendors`, `vendor_versions`, `vendor_translations`, optional
 * `provenance_records`) using `confidence: low` and source `ai_inferred`
 * for any field where the YAML didn't specify a per-field source — exactly
 * what the governance layer (US 10) is designed to surface later.
 *
 * Usage:
 *   npm run db:seed:vendors                # idempotent: skips slugs already in DB
 *   npm run db:seed:vendors -- --reset     # wipes all vendor rows first
 */
/* eslint-disable no-console */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { eq, inArray } from "drizzle-orm";

import { createDbClient } from "../lib/db/client";
import {
  vendors,
  vendorVersions,
  vendorTranslations,
  provenanceRecords,
  users,
} from "../db/schema";

interface YamlTranslation {
  description_short?: string;
  description_long?: string;
  strengths?: string[];
  limitations?: string[];
  when_to_recommend?: string[];
  when_not_to_recommend?: string[];
}

interface YamlVendor {
  slug: string;
  category: string;
  official_url?: string;
  target_hotel_sizes?: string[];
  target_property_types?: string[];
  countries_served?: string[];
  languages_supported?: string[];
  independent_hotel_suitability?: string;
  small_hotel_suitability?: string;
  core_features?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  api_availability?: string;
  automation_capabilities?: string[];
  ai_features?: string[];
  reporting_capabilities?: string[];
  implementation_complexity?: string;
  price_tier?: string;
  support_availability?: string;
  french_market_relevance?: string;
  gdpr_posture?: string;
  eu_hosting?: string;
  typical_implementation_risks?: Record<string, unknown>;
  compatibility_notes?: string;
  tags?: string[];
  confidence?: "high" | "medium" | "low";
  fr?: YamlTranslation;
  en?: YamlTranslation;
}

interface YamlSeed {
  vendors: YamlVendor[];
}

async function ensureSystemUser(db: ReturnType<typeof createDbClient>["db"]) {
  // Use the first admin row as `published_by` for seeded rows. If no admin
  // has been seeded yet, fall back to a fixed system UUID so the FK still
  // points somewhere stable (the row won't be referenced by audit_log).
  const [existing] = await db.select().from(users).limit(1);
  if (existing) return existing.id;
  // Best-effort: create a placeholder system user so the FK resolves. The
  // user can reset the password via db:seed:admin later.
  const id = "00000000-0000-0000-0000-000000000001";
  await db.insert(users).values({
    id,
    email: "system+seed@rinzlerstudio.local",
    passwordHash: "$argon2id$disabled$placeholder",
    displayName: "[seed]",
  }).onConflictDoNothing();
  return id;
}

function snapshotFromYaml(v: YamlVendor): Record<string, unknown> {
  // Keep aligned with admin-actions.ts::buildSnapshot — same shape so the
  // historical-render path works regardless of which producer wrote the row.
  const translations: Array<Record<string, unknown>> = [];
  if (v.fr) translations.push({ language: "fr", ...v.fr });
  if (v.en) translations.push({ language: "en", ...v.en });
  return {
    slug: v.slug,
    category: v.category,
    official_url: v.official_url ?? null,
    target_hotel_sizes: v.target_hotel_sizes ?? [],
    target_property_types: v.target_property_types ?? [],
    countries_served: v.countries_served ?? [],
    languages_supported: v.languages_supported ?? [],
    independent_hotel_suitability: v.independent_hotel_suitability ?? null,
    small_hotel_suitability: v.small_hotel_suitability ?? null,
    core_features: v.core_features ?? null,
    integrations: v.integrations ?? null,
    api_availability: v.api_availability ?? null,
    automation_capabilities: v.automation_capabilities ?? [],
    ai_features: v.ai_features ?? [],
    reporting_capabilities: v.reporting_capabilities ?? [],
    implementation_complexity: v.implementation_complexity ?? null,
    price_tier: v.price_tier ?? null,
    support_availability: v.support_availability ?? null,
    french_market_relevance: v.french_market_relevance ?? null,
    gdpr_posture: v.gdpr_posture ?? null,
    eu_hosting: v.eu_hosting ?? null,
    typical_implementation_risks: v.typical_implementation_risks ?? null,
    compatibility_notes: v.compatibility_notes ?? null,
    tags: v.tags ?? [],
    confidence: v.confidence ?? "low",
    translations,
  };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const { db, pool } = createDbClient();

  const yamlPath = resolve(__dirname, "..", "data", "vendors-seed.yaml");
  const raw = readFileSync(yamlPath, "utf8");
  const parsed = parseYaml(raw) as YamlSeed;
  const entries = parsed.vendors ?? [];
  console.log(`[seed-vendors] YAML loaded: ${entries.length} entries`);

  try {
    if (reset) {
      // Cascade-wipe: provenance_records → vendor_translations → vendor_versions → vendors
      console.log("[seed-vendors] --reset: wiping vendor tables");
      const existingIds = await db.select({ id: vendors.id }).from(vendors);
      if (existingIds.length > 0) {
        const ids = existingIds.map((r) => r.id);
        await db
          .delete(provenanceRecords)
          .where(eq(provenanceRecords.entityType, "vendor"));
        await db
          .delete(vendorTranslations)
          .where(
            inArray(
              vendorTranslations.vendorVersionId,
              db.select({ id: vendorVersions.id }).from(vendorVersions),
            ),
          );
        await db
          .delete(vendorVersions)
          .where(inArray(vendorVersions.vendorId, ids));
        await db.delete(vendors).where(inArray(vendors.id, ids));
      }
    }

    const systemUserId = await ensureSystemUser(db);
    const now = new Date();
    let inserted = 0;
    let skipped = 0;

    for (const v of entries) {
      const [existing] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.slug, v.slug))
        .limit(1);
      if (existing) {
        skipped++;
        continue;
      }

      const vendorId = randomUUID();
      const versionId = randomUUID();

      await db.transaction(async (tx) => {
        await tx.insert(vendors).values({
          id: vendorId,
          slug: v.slug,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: v.category as any,
          officialUrl: v.official_url ?? null,
          targetHotelSizes: v.target_hotel_sizes ?? [],
          targetPropertyTypes: v.target_property_types ?? [],
          countriesServed: v.countries_served ?? [],
          languagesSupported: v.languages_supported ?? [],
          independentHotelSuitability:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (v.independent_hotel_suitability as any) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          smallHotelSuitability: (v.small_hotel_suitability as any) ?? null,
          coreFeatures: v.core_features ?? null,
          integrations: v.integrations ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          apiAvailability: (v.api_availability as any) ?? null,
          automationCapabilities: v.automation_capabilities ?? [],
          aiFeatures: v.ai_features ?? [],
          reportingCapabilities: v.reporting_capabilities ?? [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          implementationComplexity: (v.implementation_complexity as any) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          priceTier: (v.price_tier as any) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supportAvailability: (v.support_availability as any) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          frenchMarketRelevance: (v.french_market_relevance as any) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gdprPosture: (v.gdpr_posture as any) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          euHosting: (v.eu_hosting as any) ?? null,
          typicalImplementationRisks: v.typical_implementation_risks ?? null,
          compatibilityNotes: v.compatibility_notes ?? null,
          tags: v.tags ?? [],
          status: "active",
          currentVersion: 1,
          confidence: v.confidence ?? "low",
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(vendorVersions).values({
          id: versionId,
          vendorId,
          version: 1,
          snapshotJson: snapshotFromYaml(v),
          publishedAt: now,
          publishedBy: systemUserId,
        });

        if (v.fr) {
          await tx.insert(vendorTranslations).values({
            vendorVersionId: versionId,
            language: "fr",
            descriptionShort: v.fr.description_short ?? null,
            descriptionLong: v.fr.description_long ?? null,
            strengths: v.fr.strengths ?? [],
            limitations: v.fr.limitations ?? [],
            whenToRecommend: v.fr.when_to_recommend ?? [],
            whenNotToRecommend: v.fr.when_not_to_recommend ?? [],
          });
        }
        if (v.en) {
          await tx.insert(vendorTranslations).values({
            vendorVersionId: versionId,
            language: "en",
            descriptionShort: v.en.description_short ?? null,
            descriptionLong: v.en.description_long ?? null,
            strengths: v.en.strengths ?? [],
            limitations: v.en.limitations ?? [],
            whenToRecommend: v.en.when_to_recommend ?? [],
            whenNotToRecommend: v.en.when_not_to_recommend ?? [],
          });
        }
      });

      console.log(`[seed-vendors] + ${v.slug} (${v.category})`);
      inserted++;
    }

    console.log(
      `[seed-vendors] done. inserted=${inserted} skipped=${skipped} total=${entries.length}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error("[seed-vendors]", err);
  process.exit(1);
});
