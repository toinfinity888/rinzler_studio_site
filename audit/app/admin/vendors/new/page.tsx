import { redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel, FieldError, Select } from "@/components/ui/Input";
import { GradientText } from "@/components/brand/GradientText";
import { VENDOR_CATEGORIES } from "@/db/schema";
import { createVendor } from "@/lib/vendor/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Nouveau vendeur · Admin Rinzler",
  robots: { index: false, follow: false },
};

async function createVendorFormAction(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") ?? "");
  const category = String(formData.get("category") ?? "");
  const officialUrl = String(formData.get("official_url") ?? "");
  const descriptionFr = String(formData.get("description_fr") ?? "");
  const descriptionEn = String(formData.get("description_en") ?? "");
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const sourceLabel = String(formData.get("provenance_source") ?? "consultant_verified");

  const result = await createVendor({
    slug,
    category: category as (typeof VENDOR_CATEGORIES)[number],
    official_url: officialUrl || null,
    tags,
    translations: [
      {
        language: "fr",
        description_short: descriptionFr || null,
        description_long: null,
        strengths: [],
        limitations: [],
        when_to_recommend: [],
        when_not_to_recommend: [],
      },
      {
        language: "en",
        description_short: descriptionEn || null,
        description_long: null,
        strengths: [],
        limitations: [],
        when_to_recommend: [],
        when_not_to_recommend: [],
      },
    ],
    provenance: [
      {
        field_path: "slug",
        source: sourceLabel as "consultant_verified",
        contributor_label: "Admin créateur",
        confidence: "medium",
      },
    ],
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  redirect(`/admin/vendors/${result.data.vendorId}/edit`);
}

export default function NewVendorPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-h2 font-semibold">
          <GradientText>Nouveau vendeur</GradientText>
        </h1>
        <p className="mt-1 text-text-secondary text-sm">
          Le formulaire complet (forces, limites, intégrations, posture GDPR, etc.) est
          disponible sur l’écran d’édition après création.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Informations de base"
          description="Le slug est l’identifiant ASCII utilisé partout (URLs, exports, recommandations). Il ne sera pas changeable par la suite sans soin."
        />
        <form action={createVendorFormAction} className="space-y-4">
          <div>
            <FieldLabel htmlFor="slug" required>
              Slug
            </FieldLabel>
            <Input
              id="slug"
              name="slug"
              required
              maxLength={64}
              pattern="[a-z0-9_]+"
              placeholder="ex. mews"
            />
            <FieldError message="Lettres ASCII minuscules, chiffres, underscores uniquement." />
          </div>
          <div>
            <FieldLabel htmlFor="category" required>
              Catégorie
            </FieldLabel>
            <Select
              id="category"
              name="category"
              required
              placeholder="Choisir…"
              options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor="official_url">Site officiel</FieldLabel>
            <Input
              id="official_url"
              name="official_url"
              type="url"
              placeholder="https://"
              maxLength={400}
            />
          </div>
          <div>
            <FieldLabel htmlFor="tags">Tags (virgule-séparés)</FieldLabel>
            <Input
              id="tags"
              name="tags"
              placeholder="small_hotels, french_market, easy_implementation"
              maxLength={300}
            />
          </div>
          <div>
            <FieldLabel htmlFor="description_fr">Description courte (FR)</FieldLabel>
            <Input
              id="description_fr"
              name="description_fr"
              maxLength={400}
              placeholder="Phrase d’une ligne en français."
            />
          </div>
          <div>
            <FieldLabel htmlFor="description_en">Short description (EN)</FieldLabel>
            <Input
              id="description_en"
              name="description_en"
              maxLength={400}
              placeholder="One-line description in English."
            />
          </div>
          <div>
            <FieldLabel htmlFor="provenance_source">
              Source initiale (provenance)
            </FieldLabel>
            <Select
              id="provenance_source"
              name="provenance_source"
              defaultValue="consultant_verified"
              options={[
                { value: "official_vendor", label: "Source officielle (vendeur)" },
                { value: "public", label: "Source publique" },
                { value: "consultant_verified", label: "Consultant vérifié" },
                { value: "client_reported", label: "Hôtelier déclaré" },
                { value: "ai_inferred", label: "Inféré par IA" },
                { value: "uncertain", label: "Incertain" },
              ]}
            />
          </div>
          <div className="pt-2">
            <Button type="submit">Créer le vendeur</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
