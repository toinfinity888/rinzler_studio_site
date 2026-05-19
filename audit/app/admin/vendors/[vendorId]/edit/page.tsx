import { notFound, redirect } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  vendors,
  vendorVersions,
  vendorTranslations,
  provenanceRecords,
  VENDOR_CATEGORIES,
  PROVENANCE_SOURCES,
} from "@/db/schema";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Textarea,
  FieldLabel,
  Select,
} from "@/components/ui/Input";
import { GradientText } from "@/components/brand/GradientText";
import { SourceLabelChip } from "@/components/vendor/SourceLabelChip";
import { FreshnessIndicator } from "@/components/vendor/FreshnessIndicator";
import { ConflictBanner } from "@/components/vendor/ConflictBanner";
import {
  updateVendor,
  retireVendor,
  type UpdateVendorInput,
} from "@/lib/vendor/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Éditer vendeur · Admin Rinzler",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ vendorId: string }>;
}

function arrayToCsv(arr: readonly string[] | null | undefined): string {
  return (arr ?? []).join(", ");
}
function csvToArray(s: string | null | undefined): string[] {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default async function VendorEditorPage({ params }: PageProps) {
  const { vendorId } = await params;
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) notFound();

  // Current version translations
  const [currentVersion] = await db
    .select()
    .from(vendorVersions)
    .where(
      and(
        eq(vendorVersions.vendorId, vendorId),
        eq(vendorVersions.version, vendor.currentVersion),
      ),
    )
    .limit(1);
  const translations = currentVersion
    ? await db
        .select()
        .from(vendorTranslations)
        .where(eq(vendorTranslations.vendorVersionId, currentVersion.id))
    : [];
  const fr = translations.find((t) => t.language === "fr");
  const en = translations.find((t) => t.language === "en");

  // Provenance records — newest first, grouped by field path so the UI shows
  // per-field source labels.
  const provenance = await db
    .select()
    .from(provenanceRecords)
    .where(
      and(
        eq(provenanceRecords.entityType, "vendor"),
        eq(provenanceRecords.entityId, vendorId),
      ),
    )
    .orderBy(desc(provenanceRecords.addedAt));
  const byField = new Map<string, typeof provenance>();
  for (const row of provenance) {
    const arr = byField.get(row.fieldPath) ?? [];
    arr.push(row);
    byField.set(row.fieldPath, arr);
  }

  // Recent versions list (drift trail).
  const versionTrail = await db
    .select({
      version: vendorVersions.version,
      publishedAt: vendorVersions.publishedAt,
      publishedBy: vendorVersions.publishedBy,
    })
    .from(vendorVersions)
    .where(eq(vendorVersions.vendorId, vendorId))
    .orderBy(desc(vendorVersions.version))
    .limit(15);

  async function handleUpdate(formData: FormData): Promise<void> {
    "use server";
    const sourceLabel = String(formData.get("source_label") ?? "consultant_verified");
    const changedFieldsRaw = String(formData.get("changed_fields") ?? "");
    const changedFields = changedFieldsRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const trFr = {
      language: "fr",
      description_short: String(formData.get("fr_description_short") ?? "") || null,
      description_long: String(formData.get("fr_description_long") ?? "") || null,
      strengths: csvToArray(String(formData.get("fr_strengths") ?? "")),
      limitations: csvToArray(String(formData.get("fr_limitations") ?? "")),
      when_to_recommend: csvToArray(String(formData.get("fr_when") ?? "")),
      when_not_to_recommend: csvToArray(String(formData.get("fr_when_not") ?? "")),
    };
    const trEn = {
      language: "en",
      description_short: String(formData.get("en_description_short") ?? "") || null,
      description_long: String(formData.get("en_description_long") ?? "") || null,
      strengths: csvToArray(String(formData.get("en_strengths") ?? "")),
      limitations: csvToArray(String(formData.get("en_limitations") ?? "")),
      when_to_recommend: csvToArray(String(formData.get("en_when") ?? "")),
      when_not_to_recommend: csvToArray(String(formData.get("en_when_not") ?? "")),
    };

    const patch: UpdateVendorInput = {
      category: String(formData.get("category") ?? "") as never,
      official_url: String(formData.get("official_url") ?? "") || null,
      target_hotel_sizes: csvToArray(String(formData.get("target_hotel_sizes") ?? "")),
      target_property_types: csvToArray(
        String(formData.get("target_property_types") ?? ""),
      ),
      countries_served: csvToArray(String(formData.get("countries_served") ?? "")),
      languages_supported: csvToArray(
        String(formData.get("languages_supported") ?? ""),
      ),
      independent_hotel_suitability:
        (String(formData.get("independent_hotel_suitability") ?? "") ||
          null) as never,
      small_hotel_suitability:
        (String(formData.get("small_hotel_suitability") ?? "") || null) as never,
      api_availability: (String(formData.get("api_availability") ?? "") ||
        null) as never,
      automation_capabilities: csvToArray(
        String(formData.get("automation_capabilities") ?? ""),
      ),
      ai_features: csvToArray(String(formData.get("ai_features") ?? "")),
      reporting_capabilities: csvToArray(
        String(formData.get("reporting_capabilities") ?? ""),
      ),
      implementation_complexity: (String(
        formData.get("implementation_complexity") ?? "",
      ) || null) as never,
      price_tier: (String(formData.get("price_tier") ?? "") || null) as never,
      support_availability: (String(formData.get("support_availability") ?? "") ||
        null) as never,
      french_market_relevance: (String(formData.get("french_market_relevance") ?? "") ||
        null) as never,
      gdpr_posture: (String(formData.get("gdpr_posture") ?? "") || null) as never,
      eu_hosting: (String(formData.get("eu_hosting") ?? "") || null) as never,
      compatibility_notes: String(formData.get("compatibility_notes") ?? "") || null,
      tags: csvToArray(String(formData.get("tags") ?? "")),
      confidence: (String(formData.get("confidence") ?? "medium") as
        | "high"
        | "medium"
        | "low"),
      translations: [trFr, trEn],
      provenance: changedFields.map((f) => ({
        field_path: f,
        source: sourceLabel as never,
        contributor_label: "Admin éditeur",
        confidence: "medium" as const,
      })),
    };

    const r = await updateVendor(vendorId, patch);
    if (!r.ok) {
      throw new Error(r.error.message);
    }
    redirect(`/admin/vendors/${vendorId}/edit`);
  }

  async function handleRetire(): Promise<void> {
    "use server";
    const r = await retireVendor(vendorId);
    if (!r.ok) throw new Error(r.error.message);
    redirect("/admin/vendors");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold">
            <GradientText>{vendor.slug}</GradientText>
          </h1>
          <p className="mt-1 text-text-secondary text-sm">
            v{vendor.currentVersion} ·{" "}
            <span
              className={
                vendor.status === "retired"
                  ? "text-warning"
                  : "text-success"
              }
            >
              {vendor.status === "retired" ? "Retiré" : "Actif"}
            </span>{" "}
            · <FreshnessIndicator lastVerifiedAt={vendor.updatedAt} />
          </p>
        </div>
        {vendor.status === "active" ? (
          <form action={handleRetire}>
            <Button variant="outline" type="submit">
              Retirer ce vendeur
            </Button>
          </form>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Édition versionnée"
          description="Chaque enregistrement crée une nouvelle ligne dans vendor_versions. Les rapports historiques restent ancrés à leur version. Cochez « champs modifiés » pour produire des lignes de provenance par champ."
        />
        <form action={handleUpdate} className="space-y-6">
          <Section title="Catalogage">
            <Grid>
              <Field label="Catégorie" name="category" defaultValue={vendor.category}>
                <Select
                  id="category"
                  name="category"
                  defaultValue={vendor.category}
                  options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
              </Field>
              <Field label="Tags (CSV)" name="tags">
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={arrayToCsv(vendor.tags)}
                  placeholder="small_hotels, french_market"
                />
              </Field>
              <Field label="Site officiel" name="official_url">
                <Input
                  id="official_url"
                  name="official_url"
                  defaultValue={vendor.officialUrl ?? ""}
                  type="url"
                />
              </Field>
              <Field label="Confiance entrée" name="confidence">
                <Select
                  id="confidence"
                  name="confidence"
                  defaultValue={vendor.confidence ?? "medium"}
                  options={[
                    { value: "high", label: "Élevée" },
                    { value: "medium", label: "Moyenne" },
                    { value: "low", label: "Basse" },
                  ]}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Profil cible">
            <Grid>
              <Field label="Tailles d’hôtel cibles (CSV)" name="target_hotel_sizes">
                <Input
                  id="target_hotel_sizes"
                  name="target_hotel_sizes"
                  defaultValue={arrayToCsv(vendor.targetHotelSizes)}
                  placeholder="small, medium"
                />
              </Field>
              <Field label="Types de propriétés (CSV)" name="target_property_types">
                <Input
                  id="target_property_types"
                  name="target_property_types"
                  defaultValue={arrayToCsv(vendor.targetPropertyTypes)}
                  placeholder="independent, boutique"
                />
              </Field>
              <Field label="Pays desservis (ISO-3166, CSV)" name="countries_served">
                <Input
                  id="countries_served"
                  name="countries_served"
                  defaultValue={arrayToCsv(vendor.countriesServed)}
                  placeholder="FR, BE, CH"
                />
              </Field>
              <Field label="Langues supportées (ISO-639-1, CSV)" name="languages_supported">
                <Input
                  id="languages_supported"
                  name="languages_supported"
                  defaultValue={arrayToCsv(vendor.languagesSupported)}
                  placeholder="fr, en"
                />
              </Field>
              <Field label="Indépendant — suitability" name="independent_hotel_suitability">
                <Select
                  id="independent_hotel_suitability"
                  name="independent_hotel_suitability"
                  defaultValue={vendor.independentHotelSuitability ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "strong", label: "Strong" },
                    { value: "fair", label: "Fair" },
                    { value: "weak", label: "Weak" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
              </Field>
              <Field label="Petit hôtel — suitability" name="small_hotel_suitability">
                <Select
                  id="small_hotel_suitability"
                  name="small_hotel_suitability"
                  defaultValue={vendor.smallHotelSuitability ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "strong", label: "Strong" },
                    { value: "fair", label: "Fair" },
                    { value: "weak", label: "Weak" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Capacités & support">
            <Grid>
              <Field label="API" name="api_availability">
                <Select
                  id="api_availability"
                  name="api_availability"
                  defaultValue={vendor.apiAvailability ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "yes", label: "Oui" },
                    { value: "partial", label: "Partielle" },
                    { value: "no", label: "Non" },
                    { value: "unknown", label: "Inconnue" },
                  ]}
                />
              </Field>
              <Field label="Automation (CSV)" name="automation_capabilities">
                <Input
                  id="automation_capabilities"
                  name="automation_capabilities"
                  defaultValue={arrayToCsv(vendor.automationCapabilities)}
                />
              </Field>
              <Field label="IA (CSV)" name="ai_features">
                <Input
                  id="ai_features"
                  name="ai_features"
                  defaultValue={arrayToCsv(vendor.aiFeatures)}
                />
              </Field>
              <Field label="Reporting (CSV)" name="reporting_capabilities">
                <Input
                  id="reporting_capabilities"
                  name="reporting_capabilities"
                  defaultValue={arrayToCsv(vendor.reportingCapabilities)}
                />
              </Field>
              <Field label="Complexité" name="implementation_complexity">
                <Select
                  id="implementation_complexity"
                  name="implementation_complexity"
                  defaultValue={vendor.implementationComplexity ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "low", label: "Basse" },
                    { value: "medium", label: "Moyenne" },
                    { value: "high", label: "Haute" },
                  ]}
                />
              </Field>
              <Field label="Tarification" name="price_tier">
                <Select
                  id="price_tier"
                  name="price_tier"
                  defaultValue={vendor.priceTier ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "free", label: "Free" },
                    { value: "entry", label: "Entry" },
                    { value: "mid", label: "Mid" },
                    { value: "premium", label: "Premium" },
                    { value: "enterprise", label: "Enterprise" },
                    { value: "variable", label: "Variable" },
                  ]}
                />
              </Field>
              <Field label="Support" name="support_availability">
                <Select
                  id="support_availability"
                  name="support_availability"
                  defaultValue={vendor.supportAvailability ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "24x7", label: "24x7" },
                    { value: "business_hours", label: "Heures bureau" },
                    { value: "business_days", label: "Jours bureau" },
                    { value: "asynchronous", label: "Asynchrone" },
                    { value: "community", label: "Communauté" },
                  ]}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Conformité & marché FR">
            <Grid>
              <Field label="Pertinence marché FR" name="french_market_relevance">
                <Select
                  id="french_market_relevance"
                  name="french_market_relevance"
                  defaultValue={vendor.frenchMarketRelevance ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "native_fr", label: "FR-native" },
                    { value: "strong", label: "Fort" },
                    { value: "present", label: "Présent" },
                    { value: "unknown", label: "Inconnu" },
                    { value: "weak", label: "Faible" },
                  ]}
                />
              </Field>
              <Field label="Posture GDPR" name="gdpr_posture">
                <Select
                  id="gdpr_posture"
                  name="gdpr_posture"
                  defaultValue={vendor.gdprPosture ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "dpa_published", label: "DPA publié" },
                    { value: "dpa_on_request", label: "DPA sur demande" },
                    { value: "unclear", label: "Pas clair" },
                    { value: "unknown", label: "Inconnu" },
                    { value: "non_compliant", label: "Non conforme" },
                  ]}
                />
              </Field>
              <Field label="Hébergement EU" name="eu_hosting">
                <Select
                  id="eu_hosting"
                  name="eu_hosting"
                  defaultValue={vendor.euHosting ?? ""}
                  options={[
                    { value: "", label: "—" },
                    { value: "confirmed_eu", label: "EU confirmé" },
                    { value: "mixed", label: "Mixte" },
                    { value: "non_eu", label: "Hors EU" },
                    { value: "unknown", label: "Inconnu" },
                  ]}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Notes internes">
            <Field label="Notes de compatibilité" name="compatibility_notes">
              <Textarea
                id="compatibility_notes"
                name="compatibility_notes"
                defaultValue={vendor.compatibilityNotes ?? ""}
                rows={4}
              />
            </Field>
          </Section>

          <Section title="Traduction française">
            <Field label="Description courte (FR)" name="fr_description_short">
              <Input
                id="fr_description_short"
                name="fr_description_short"
                defaultValue={fr?.descriptionShort ?? ""}
                maxLength={400}
              />
            </Field>
            <Field label="Description longue (FR)" name="fr_description_long">
              <Textarea
                id="fr_description_long"
                name="fr_description_long"
                defaultValue={fr?.descriptionLong ?? ""}
                rows={4}
              />
            </Field>
            <Grid>
              <Field label="Forces (FR, CSV)" name="fr_strengths">
                <Input id="fr_strengths" name="fr_strengths" defaultValue={arrayToCsv(fr?.strengths)} />
              </Field>
              <Field label="Limites (FR, CSV)" name="fr_limitations">
                <Input
                  id="fr_limitations"
                  name="fr_limitations"
                  defaultValue={arrayToCsv(fr?.limitations)}
                />
              </Field>
              <Field label="Recommander quand (FR, CSV)" name="fr_when">
                <Input id="fr_when" name="fr_when" defaultValue={arrayToCsv(fr?.whenToRecommend)} />
              </Field>
              <Field label="Ne pas recommander quand (FR, CSV)" name="fr_when_not">
                <Input
                  id="fr_when_not"
                  name="fr_when_not"
                  defaultValue={arrayToCsv(fr?.whenNotToRecommend)}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="English translation">
            <Field label="Short description (EN)" name="en_description_short">
              <Input
                id="en_description_short"
                name="en_description_short"
                defaultValue={en?.descriptionShort ?? ""}
                maxLength={400}
              />
            </Field>
            <Field label="Long description (EN)" name="en_description_long">
              <Textarea
                id="en_description_long"
                name="en_description_long"
                defaultValue={en?.descriptionLong ?? ""}
                rows={4}
              />
            </Field>
            <Grid>
              <Field label="Strengths (EN, CSV)" name="en_strengths">
                <Input id="en_strengths" name="en_strengths" defaultValue={arrayToCsv(en?.strengths)} />
              </Field>
              <Field label="Limitations (EN, CSV)" name="en_limitations">
                <Input
                  id="en_limitations"
                  name="en_limitations"
                  defaultValue={arrayToCsv(en?.limitations)}
                />
              </Field>
              <Field label="When to recommend (EN, CSV)" name="en_when">
                <Input id="en_when" name="en_when" defaultValue={arrayToCsv(en?.whenToRecommend)} />
              </Field>
              <Field label="When not to recommend (EN, CSV)" name="en_when_not">
                <Input
                  id="en_when_not"
                  name="en_when_not"
                  defaultValue={arrayToCsv(en?.whenNotToRecommend)}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Provenance de cette modification">
            <p className="text-sm text-text-muted">
              Cochez la source qui sous-tend cette mise à jour, et listez (CSV) les
              champs modifiés. Une ligne de provenance par champ sera créée.
            </p>
            <Grid>
              <Field label="Source" name="source_label">
                <Select
                  id="source_label"
                  name="source_label"
                  defaultValue="consultant_verified"
                  options={PROVENANCE_SOURCES.map((s) => ({ value: s, label: s }))}
                />
              </Field>
              <Field
                label="Champs modifiés (CSV de field_path)"
                name="changed_fields"
              >
                <Input
                  id="changed_fields"
                  name="changed_fields"
                  placeholder="gdpr_posture, eu_hosting, tags"
                  defaultValue=""
                />
              </Field>
            </Grid>
          </Section>

          <div className="flex items-center justify-between pt-2">
            <a
              href="/admin/vendors"
              className="text-sm text-text-muted hover:text-text-primary"
            >
              ← Retour au catalogue
            </a>
            <Button type="submit">Enregistrer la version</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Provenance par champ" />
        {provenance.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune ligne de provenance encore.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(byField.entries()).map(([field, rows]) => (
              <div key={field}>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs text-text-secondary">{field}</code>
                  {rows.map((r) => (
                    <SourceLabelChip key={r.id} source={r.source} />
                  ))}
                  <FreshnessIndicator
                    lastVerifiedAt={rows[0]?.lastVerifiedAt ?? rows[0]?.addedAt ?? null}
                  />
                </div>
                {rows.length > 1 ? (
                  <ConflictBanner
                    fieldPath={field}
                    sources={Array.from(new Set(rows.map((r) => r.source)))}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Historique des versions" />
        {versionTrail.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune version antérieure.</p>
        ) : (
          <ul className="text-sm text-text-secondary space-y-1">
            {versionTrail.map((v) => (
              <li key={v.version}>
                v{v.version} ·{" "}
                <span className="text-text-muted">
                  {new Date(v.publishedAt).toLocaleString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ Layout primitives ------------------------------ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-text-primary mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  defaultValue?: string | null | undefined;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children}
    </div>
  );
}
