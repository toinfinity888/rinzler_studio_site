/**
 * Vendor + provenance schema (data-model.md §E).
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export const VENDOR_STATUSES = ["active", "retired"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_CATEGORIES = [
  "pms",
  "booking_engine",
  "channel_manager",
  "crm",
  "guest_messaging",
  "ai_concierge",
  "whatsapp_automation",
  "review_management",
  "revenue_management",
  "housekeeping",
  "payment",
  "website",
  "seo_ai_visibility",
  "knowledge_base",
  "energy_management",
  "compliance_consent",
  "kiosk",
  "lock_keyless",
  "upsell",
  "analytics",
  "training",
  "other",
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const PROVENANCE_SOURCES = [
  "official_vendor",
  "public",
  "consultant_verified",
  "client_reported",
  "ai_inferred",
  "outdated",
  "uncertain",
] as const;
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];

export const PROVENANCE_ENTITY_TYPES = [
  "vendor",
  "scan_finding",
  "answer",
  "candidate_enrichment",
] as const;

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    category: text("category").$type<VendorCategory>().notNull(),
    officialUrl: text("official_url"),
    targetHotelSizes: text("target_hotel_sizes").array(),
    targetPropertyTypes: text("target_property_types").array(),
    countriesServed: text("countries_served").array(),
    languagesSupported: text("languages_supported").array(),
    independentHotelSuitability: text("independent_hotel_suitability"),
    smallHotelSuitability: text("small_hotel_suitability"),
    coreFeatures: jsonb("core_features"),
    integrations: jsonb("integrations"),
    apiAvailability: text("api_availability"),
    automationCapabilities: text("automation_capabilities").array(),
    aiFeatures: text("ai_features").array(),
    reportingCapabilities: text("reporting_capabilities").array(),
    implementationComplexity: text("implementation_complexity"),
    priceTier: text("price_tier"),
    supportAvailability: text("support_availability"),
    frenchMarketRelevance: text("french_market_relevance"),
    gdprPosture: text("gdpr_posture"),
    euHosting: text("eu_hosting"),
    typicalImplementationRisks: jsonb("typical_implementation_risks"),
    compatibilityNotes: text("compatibility_notes"),
    tags: text("tags").array(),
    status: text("status").$type<VendorStatus>().notNull().default("active"),
    currentVersion: integer("current_version").notNull().default(1),
    confidence: text("confidence").notNull().default("medium"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vendors_category_status_idx").on(t.category, t.status)],
);

export const vendorVersions = pgTable(
  "vendor_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    snapshotJson: jsonb("snapshot_json").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [uniqueIndex("vendor_versions_vid_version_unique").on(t.vendorId, t.version)],
);

export const vendorTranslations = pgTable(
  "vendor_translations",
  {
    vendorVersionId: uuid("vendor_version_id")
      .notNull()
      .references(() => vendorVersions.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    descriptionShort: text("description_short"),
    descriptionLong: text("description_long"),
    strengths: text("strengths").array(),
    limitations: text("limitations").array(),
    whenToRecommend: text("when_to_recommend").array(),
    whenNotToRecommend: text("when_not_to_recommend").array(),
  },
  (t) => [primaryKey({ columns: [t.vendorVersionId, t.language] })],
);

export const provenanceRecords = pgTable(
  "provenance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fieldPath: text("field_path").notNull(),
    source: text("source").$type<ProvenanceSource>().notNull(),
    contributorId: uuid("contributor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    contributorLabel: text("contributor_label"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    confidence: text("confidence").notNull().default("medium"),
    conflictNote: text("conflict_note"),
  },
  (t) => [
    index("provenance_entity_field_idx").on(t.entityType, t.entityId, t.fieldPath),
  ],
);
