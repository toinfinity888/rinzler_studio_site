import type { FieldDef, SectionDef, Sections, SystemCategory } from "./types";

/* Helper: build a system-block field for Section 2. */
function sys(blockId: string, category: SystemCategory): FieldDef {
  return { id: blockId, type: "system-block", systemCategory: category, hasHelp: true };
}

const HOTEL_TYPE_OPTIONS = [
  "boutique",
  "independent",
  "chain",
  "luxury",
  "midscale",
  "economy",
  "resort",
  "bnb",
  "aparthotel",
  "other",
] as const;

// Contract-status & satisfaction enums are referenced inside SystemBlockField
// (components/form/fields.tsx); they're declared centrally here for future
// reuse if Section 2's schema ever adds non-block fields that need them.
const _CONTRACT_STATUS_OPTIONS = [
  "month_to_month",
  "annual",
  "multi_year",
  "expired",
  "unknown",
] as const;

const SATISFACTION_OPTIONS = [
  "very_unsatisfied",
  "unsatisfied",
  "neutral",
  "satisfied",
  "very_satisfied",
] as const;

const OTA_OPTIONS = [
  "booking_com",
  "expedia",
  "airbnb",
  "hotelbeds",
  "agoda",
  "google_hotel_ads",
  "other",
] as const;

const MARKETING_CHANNEL_OPTIONS = [
  "seo",
  "sea_google_ads",
  "social_paid",
  "social_organic",
  "email_crm",
  "ota_visibility",
  "pr_press",
  "partnerships",
  "none_significant",
] as const;

const MESSAGING_CHANNEL_OPTIONS = [
  "email",
  "sms",
  "whatsapp",
  "in_app",
  "phone",
  "front_desk_only",
] as const;

const BUDGET_OPTIONS = ["very_tight", "moderate", "comfortable", "open"] as const;
const TIMELINE_OPTIONS = [
  "asap_under_3m",
  "3_to_6m",
  "6_to_12m",
  "over_12m",
  "exploratory",
] as const;
const PACE_OPTIONS = ["fast", "phased", "cautious"] as const;
const RESISTANCE_OPTIONS = ["none", "low", "moderate", "high"] as const;

const YES_NO_UNKNOWN = ["yes", "no", "unknown"] as const;
const INTEREST_OPTIONS = ["not_interested", "curious", "interested", "very_interested"] as const;

/* ============================================================ *
 * SECTION 1 — Hotel Overview
 * ============================================================ */
const s1: SectionDef = {
  id: "s1",
  order: 1,
  fields: [
    { id: "s1.hotel_name", type: "text", required: true, validation: { maxLength: 200 } },
    {
      id: "s1.hotel_type",
      type: "select",
      required: true,
      validation: { options: HOTEL_TYPE_OPTIONS },
    },
    { id: "s1.number_of_rooms", type: "number", required: true, validation: { min: 1, max: 5000 } },
    { id: "s1.location", type: "text", required: true, validation: { maxLength: 200 } },
    { id: "s1.main_contact_name", type: "text", required: true, validation: { maxLength: 200 } },
    { id: "s1.contact_email", type: "email", required: true, validation: { maxLength: 200 } },

    { id: "s1.website_url", type: "url", validation: { maxLength: 300 } },
    { id: "s1.star_rating", type: "number", validation: { min: 1, max: 5 } },
    { id: "s1.average_occupancy_pct", type: "number", validation: { min: 0, max: 100 } },
    { id: "s1.adr_eur", type: "number", hasHelp: true, validation: { min: 0, max: 100000 } },
    { id: "s1.number_of_employees", type: "number", validation: { min: 0, max: 5000 } },
    { id: "s1.positioning_description", type: "textarea", validation: { maxLength: 2000 } },
  ],
};

/* ============================================================ *
 * SECTION 2 — Current Software Stack (10 system categories,
 * each expanded into 5 sub-fields by the renderer)
 * ============================================================ */
const s2: SectionDef = {
  id: "s2",
  order: 2,
  fields: [
    sys("s2.pms", "pms"),
    sys("s2.booking_engine", "booking_engine"),
    sys("s2.channel_manager", "channel_manager"),
    sys("s2.website_cms", "website_cms"),
    sys("s2.crm", "crm"),
    sys("s2.payment", "payment"),
    sys("s2.review_management", "review_management"),
    sys("s2.housekeeping", "housekeeping"),
    sys("s2.communication", "communication"),
    sys("s2.other_operational", "other_operational"),
  ],
};

/* ============================================================ *
 * SECTION 3 — Operations & Workflows
 * ============================================================ */
const s3: SectionDef = {
  id: "s3",
  order: 3,
  fields: [
    { id: "s3.most_manual_operations", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s3.most_time_consuming_tasks", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s3.management_intervention_areas", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s3.error_prone_processes", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s3.repetitive_guest_communication", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s3.outdated_areas", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s3.systems_disconnected", type: "textarea", validation: { maxLength: 5000 } },

    {
      id: "s3.difficulty_check_in",
      type: "slider",
      validation: { min: 1, max: 10 },
      sliderPoles: { low: "very_easy", high: "very_painful" },
    },
    {
      id: "s3.difficulty_billing",
      type: "slider",
      validation: { min: 1, max: 10 },
      sliderPoles: { low: "very_easy", high: "very_painful" },
    },
    {
      id: "s3.difficulty_inventory_sync",
      type: "slider",
      validation: { min: 1, max: 10 },
      sliderPoles: { low: "very_easy", high: "very_painful" },
    },
    {
      id: "s3.difficulty_reporting",
      type: "slider",
      validation: { min: 1, max: 10 },
      sliderPoles: { low: "very_easy", high: "very_painful" },
    },
  ],
};

/* ============================================================ *
 * SECTION 4 — Commercial & Financial
 * ============================================================ */
const s4: SectionDef = {
  id: "s4",
  order: 4,
  fields: [
    { id: "s4.ota_dependency_pct", type: "number", hasHelp: true, validation: { min: 0, max: 100 } },
    {
      id: "s4.main_otas",
      type: "multiselect",
      hasHelp: true,
      validation: { options: OTA_OPTIONS },
    },
    { id: "s4.direct_booking_challenges", type: "textarea", validation: { maxLength: 5000 } },
    {
      id: "s4.estimated_monthly_software_cost_eur",
      type: "number",
      validation: { min: 0, max: 1000000 },
    },
    { id: "s4.biggest_operational_costs", type: "textarea", validation: { maxLength: 5000 } },
    {
      id: "s4.marketing_channels",
      type: "multiselect",
      validation: { options: MARKETING_CHANNEL_OPTIONS },
    },
    {
      id: "s4.website_performance_satisfaction",
      type: "select",
      validation: { options: SATISFACTION_OPTIONS },
    },
    { id: "s4.biggest_revenue_frustrations", type: "textarea", validation: { maxLength: 5000 } },
  ],
};

/* ============================================================ *
 * SECTION 5 — Guest Experience
 * ============================================================ */
const s5: SectionDef = {
  id: "s5",
  order: 5,
  fields: [
    { id: "s5.checkin_checkout_process", type: "textarea", validation: { maxLength: 5000 } },
    {
      id: "s5.self_checkin_available",
      type: "radio-group",
      validation: { options: YES_NO_UNKNOWN },
    },
    { id: "s5.guest_communication_process", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s5.complaint_patterns", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s5.review_management_process", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s5.personalization_capabilities", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s5.upsell_process", type: "textarea", validation: { maxLength: 5000 } },
    {
      id: "s5.messaging_channels",
      type: "multiselect",
      validation: { options: MESSAGING_CHANNEL_OPTIONS },
    },
  ],
};

/* ============================================================ *
 * SECTION 6 — Automation & Modernization Interest
 * ============================================================ */
const s6: SectionDef = {
  id: "s6",
  order: 6,
  fields: [
    {
      id: "s6.interest_in_automation",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    {
      id: "s6.interest_in_ai_assisted_ops",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    {
      id: "s6.openness_to_pms_migration",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    {
      id: "s6.interest_reduce_manual_workload",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    {
      id: "s6.interest_grow_direct_bookings",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    {
      id: "s6.interest_operational_reporting",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    {
      id: "s6.interest_staff_reduction_via_automation",
      type: "select",
      validation: { options: INTEREST_OPTIONS },
    },
    { id: "s6.modernization_goals", type: "textarea", validation: { maxLength: 5000 } },
  ],
};

/* ============================================================ *
 * SECTION 7 — Priorities & Constraints
 * ============================================================ */
const s7: SectionDef = {
  id: "s7",
  order: 7,
  fields: [
    { id: "s7.budget_sensitivity", type: "select", validation: { options: BUDGET_OPTIONS } },
    { id: "s7.timeline_expectation", type: "select", validation: { options: TIMELINE_OPTIONS } },
    { id: "s7.operational_constraints", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s7.existing_vendor_commitments", type: "textarea", validation: { maxLength: 5000 } },
    { id: "s7.modernization_concerns", type: "textarea", validation: { maxLength: 5000 } },
    {
      id: "s7.internal_resistance_to_change",
      type: "select",
      validation: { options: RESISTANCE_OPTIONS },
    },
    { id: "s7.preferred_implementation_pace", type: "select", validation: { options: PACE_OPTIONS } },
  ],
};

/* ============================================================ *
 * SECTION 8 — Open Comments
 * ============================================================ */
const s8: SectionDef = {
  id: "s8",
  order: 8,
  fields: [{ id: "s8.open_comments", type: "textarea", validation: { maxLength: 5000 } }],
};

export const SECTIONS: Sections = [s1, s2, s3, s4, s5, s6, s7, s8] as const;

export function getSection(id: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.id === id);
}
