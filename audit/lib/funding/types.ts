/**
 * Shared types for the funding-readiness module (US 8 / T117-T122).
 *
 * The funding brief is generated from existing audit data — no Bedrock,
 * no external API. It's a structured derivation that the hotelier can
 * print or share as a project-readiness document.
 */

export const FUNDING_DISCLAIMER_FR =
  "Ce document est une note de préparation produite par Rinzler Studio à partir des données déclarées dans votre audit. Il ne constitue ni un dossier de demande de financement, ni un engagement d'éligibilité ou d'attribution d'un programme public. Rinzler Studio ne peut être tenu pour responsable du résultat d'une demande de subvention basée sur ce brief.";

export const FUNDING_DISCLAIMER_EN =
  "This document is a preparatory project brief produced by Rinzler Studio from the data declared in your audit. It is NOT a grant application, NOT a guarantee of eligibility, and NOT a commitment that any public-support programme will fund your project. Rinzler Studio cannot be held responsible for the outcome of any funding request based on this brief.";

export interface CompanyInfoSection {
  hotel_name: string | null;
  property_type: string | null;
  room_count: number | null;
  star_rating: number | null;
  address_city: string | null;
  address_region: string | null;
  address_country: string | null;
  contact_email: string | null;
  contact_role: string | null;
}

export interface ProjectDescriptionSection {
  one_line: string;
  paragraph: string;
}

export interface ObjectiveBullet {
  label: string;
  detail: string;
}

export interface RoadmapHorizon {
  horizon: "30d" | "60d" | "90d" | "beyond";
  actions: string[];
}

export interface BudgetBand {
  bucket: "30d" | "60d" | "90d";
  cost_band: "entry" | "mid" | "premium" | "variable" | "unknown";
  count: number;
  examples: string[];
}

export interface DocumentChecklistItem {
  doc: string;
  why: string;
  who_provides: "hotelier" | "accountant" | "rinzler";
}

export interface MissingInput {
  field: string;
  label: string;
  required: boolean;
}

export interface FundingBriefContent {
  schema_version: "funding-brief.v1";
  generated_at: string;
  language: "fr" | "en";

  company_info: CompanyInfoSection;
  project_description: ProjectDescriptionSection;
  digital_transformation_goals: ObjectiveBullet[];
  ai_data_objectives: ObjectiveBullet[];
  expected_benefits: ObjectiveBullet[];
  implementation_roadmap: RoadmapHorizon[];
  budget_estimate: {
    bands: BudgetBand[];
    notes: string;
  };
  supporting_documents_checklist: DocumentChecklistItem[];

  /** Fields the hotelier still needs to fill in for the brief to be fully complete. */
  missing_inputs: MissingInput[];

  eligibility_disclaimer: string;
}

export interface FundingBriefAdditionalInputs {
  legal_name?: string;
  siret?: string;
  annual_revenue_kEUR?: number;
  total_budget_kEUR?: number;
  project_lead_name?: string;
  project_lead_phone?: string;
}
