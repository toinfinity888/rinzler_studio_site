/**
 * Recommendation engine output schema (data-model.md §F).
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  smallint,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { projects, users } from "./identity";
import { vendors, vendorVersions } from "./vendor";

export const SCENARIO_KINDS = ["minimal", "balanced", "advanced", "custom"] as const;
export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

export const SCORE_DIMENSIONS = [
  "website",
  "ai_search",
  "direct_booking",
  "guest_communication",
  "automation",
  "tool_stack_coherence",
  "data_integration",
  "compliance",
  "operational_workload",
] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export const SCORE_BANDS = ["low", "medium", "high"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

/**
 * Legacy stub score names from feature 001 (kept so lib/scoring/index.ts
 * keeps producing a fixed result set). Feature 003's recommendation engine
 * uses the wider `SCORE_DIMENSIONS` enum above for readiness scoring.
 */
export const SCORE_NAMES = [
  "automation_opportunity",
  "operational_complexity",
  "modernization_readiness",
  "digital_maturity",
] as const;
export type ScoreName = (typeof SCORE_NAMES)[number];

export const ROADMAP_BUCKETS = [
  "immediate",
  "30d",
  "60d",
  "90d",
  "postponed",
  "not_now",
] as const;

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").$type<ScenarioKind>().notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  tradeoffsJson: jsonb("tradeoffs_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scenarioId: uuid("scenario_id").references(() => scenarios.id, {
      onDelete: "cascade",
    }),
    action: text("action").notNull(),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    vendorVersionId: uuid("vendor_version_id").references(() => vendorVersions.id, {
      onDelete: "set null",
    }),
    explanationJson: jsonb("explanation_json").notNull(),
    impactJson: jsonb("impact_json").notNull(),
    costBand: text("cost_band"),
    riskLevel: text("risk_level"),
    timeToDeploy: text("time_to_deploy"),
    confidence: text("confidence").notNull().default("medium"),
    doNotDoNow: boolean("do_not_do_now").notNull().default(false),
    doNotDoReason: text("do_not_do_reason"),
    signalsConsulted: jsonb("signals_consulted").notNull(),
    ruleEngineVersion: text("rule_engine_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recommendations_project_scenario_idx").on(
      t.projectId,
      t.scenarioId,
      t.doNotDoNow,
    ),
  ],
);

export const readinessScores = pgTable(
  "readiness_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    dimension: text("dimension").$type<ScoreDimension>().notNull(),
    value: smallint("value").notNull(),
    band: text("band").notNull(),
    basisJson: jsonb("basis_json").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("readiness_scores_project_dim_unique").on(t.projectId, t.dimension)],
);

export const roadmapItems = pgTable("roadmap_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  recommendationId: uuid("recommendation_id")
    .notNull()
    .references(() => recommendations.id, { onDelete: "cascade" }),
  bucket: text("bucket").notNull(),
  expectedEffort: text("expected_effort"),
  expectedImpact: text("expected_impact"),
  dependencies: uuid("dependencies").array(),
  recommendedOwner: text("recommended_owner"),
  decisionPoints: jsonb("decision_points"),
  implementationRisk: text("implementation_risk"),
});

export const complianceFindings = pgTable("compliance_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  severity: text("severity").notNull(),
  explanation: text("explanation").notNull(),
  checklistItem: text("checklist_item").notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
});

/**
 * Consultant scenario-weight overrides (US 4 / T088).
 *
 * Records per-(project, scenario, optional recommendation) consultant tweaks:
 *  - `adjustment = 'suppress'` removes a recommendation from the rendered
 *    public report on the next snapshot rebuild.
 *  - `adjustment = 'boost' | 'demote'` shifts ordering (via `weight_delta`,
 *    expressed as positive = surface higher, negative = bury).
 *  - `adjustment = 'pin_scenario'` flags a scenario as the consultant-
 *    preferred default.
 * The justification (`reason`) is consultant-private and MUST be stripped
 * from any public snapshot — same rule as override reasons.
 */
export const SCENARIO_WEIGHT_ADJUSTMENTS = [
  "suppress",
  "boost",
  "demote",
  "pin_scenario",
] as const;
export type ScenarioWeightAdjustment =
  (typeof SCENARIO_WEIGHT_ADJUSTMENTS)[number];

export const scenarioWeightOverrides = pgTable(
  "scenario_weight_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scenarioId: uuid("scenario_id").references(() => scenarios.id, {
      onDelete: "cascade",
    }),
    recommendationId: uuid("recommendation_id").references(
      () => recommendations.id,
      { onDelete: "cascade" },
    ),
    adjustment: text("adjustment")
      .$type<ScenarioWeightAdjustment>()
      .notNull(),
    weightDelta: smallint("weight_delta"),
    reason: text("reason"),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scenario_weight_overrides_project_idx").on(t.projectId, t.scenarioId),
  ],
);
export type ScenarioWeightOverride = typeof scenarioWeightOverrides.$inferSelect;

export const fundingBriefs = pgTable("funding_briefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  contentJson: jsonb("content_json").notNull(),
  eligibilityDisclaimer: text("eligibility_disclaimer").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
