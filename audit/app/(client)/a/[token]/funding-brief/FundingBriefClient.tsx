"use client";

import { useState, useTransition } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import type {
  FundingBriefContent,
  FundingBriefAdditionalInputs,
} from "@/lib/funding/types";
import {
  getFundingBriefPreview,
  generateFundingBrief,
} from "@/lib/funding/server-actions";

interface Props {
  token: string;
  initialPreview: FundingBriefContent;
  persisted: { id: string; generated_at: string } | null;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function FundingBriefClient({ token, initialPreview, persisted }: Props) {
  const [preview, setPreview] = useState<FundingBriefContent>(initialPreview);
  const [persistedState, setPersisted] = useState(persisted);
  const [inputs, setInputs] = useState<FundingBriefAdditionalInputs>({});
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function patchInputs(p: Partial<FundingBriefAdditionalInputs>) {
    setInputs((cur) => ({ ...cur, ...p }));
  }

  async function refreshPreview() {
    setStatus(null);
    startTransition(async () => {
      const res = await getFundingBriefPreview(token, inputs);
      if (res.ok && res.available) {
        setPreview(res.preview);
        setStatus("Aperçu mis à jour.");
      } else {
        setStatus("Impossible de rafraîchir l'aperçu.");
      }
    });
  }

  async function persist() {
    setStatus(null);
    startTransition(async () => {
      const res = await generateFundingBrief(token, inputs);
      if (res.ok) {
        setPersisted({
          id: res.funding_brief_id,
          generated_at: res.generated_at.toISOString(),
        });
        setStatus("Note de cadrage enregistrée.");
      } else {
        setStatus("Échec de l'enregistrement.");
      }
    });
  }

  const company = preview.company_info;
  const desc = preview.project_description;

  return (
    <div className="print-doc max-w-4xl mx-auto px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
          Note de cadrage projet
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed no-print">
          Document de préparation pour les programmes de soutien à la
          transformation digitale. Généré automatiquement à partir des données
          de votre audit. Vous pouvez compléter les informations manquantes
          ci-dessous puis l&apos;enregistrer.
        </p>
        {persistedState ? (
          <p className="text-xs text-text-secondary">
            Dernière génération : {fmtDate(persistedState.generated_at)}
          </p>
        ) : null}
      </header>

      <Card>
        <CardHeader title="Informations entreprise" />
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Nom de l'établissement" value={company.hotel_name} />
          <Field label="Type" value={company.property_type} />
          <Field label="Chambres" value={company.room_count?.toString()} />
          <Field
            label="Classement"
            value={company.star_rating ? `${company.star_rating} étoiles` : null}
          />
          <Field label="Ville" value={company.address_city} />
          <Field label="Région" value={company.address_region} />
          <Field label="Pays" value={company.address_country} />
          <Field label="Email de contact" value={company.contact_email} />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Description du projet" />
        <p className="text-sm text-text-primary font-medium">{desc.one_line}</p>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          {desc.paragraph}
        </p>
      </Card>

      <BulletCard
        title="Objectifs de transformation digitale"
        items={preview.digital_transformation_goals}
      />
      <BulletCard
        title="Objectifs IA et données"
        items={preview.ai_data_objectives}
      />
      <BulletCard
        title="Bénéfices attendus"
        items={preview.expected_benefits}
      />

      {preview.implementation_roadmap.length > 0 ? (
        <Card>
          <CardHeader title="Feuille de route" />
          <div className="space-y-3 text-sm">
            {preview.implementation_roadmap.map((h) => (
              <div key={h.horizon}>
                <p className="font-medium text-text-primary">
                  Horizon {h.horizon}
                </p>
                {h.actions.length > 0 ? (
                  <ul className="mt-1 list-disc list-inside text-text-secondary space-y-1">
                    {h.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-secondary italic">
                    Aucune action pour cet horizon.
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Estimation budgétaire" />
        {preview.budget_estimate.bands.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary">
                <th className="py-1 pr-2">Horizon</th>
                <th className="py-1 pr-2">Bande de coût</th>
                <th className="py-1 pr-2">Nb</th>
                <th className="py-1 pr-2">Exemples</th>
              </tr>
            </thead>
            <tbody>
              {preview.budget_estimate.bands.map((b, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-1 pr-2">{b.bucket}</td>
                  <td className="py-1 pr-2">{b.cost_band}</td>
                  <td className="py-1 pr-2">{b.count}</td>
                  <td className="py-1 pr-2 text-text-secondary">
                    {b.examples.join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-text-secondary italic">
            Le détail budgétaire sera disponible une fois le rapport publié.
          </p>
        )}
        <p className="mt-3 text-xs text-text-secondary leading-relaxed">
          {preview.budget_estimate.notes}
        </p>
      </Card>

      <Card>
        <CardHeader title="Pièces justificatives à préparer" />
        <ul className="space-y-3 text-sm">
          {preview.supporting_documents_checklist.map((d, i) => (
            <li key={i}>
              <p className="font-medium text-text-primary">{d.doc}</p>
              <p className="text-text-secondary">{d.why}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Fourni par :{" "}
                <span className="text-accent-cyan">
                  {d.who_provides === "hotelier"
                    ? "vous"
                    : d.who_provides === "accountant"
                    ? "votre expert-comptable"
                    : "Rinzler Studio"}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Informations à compléter"
          description="Champs requis par la plupart des programmes — fournissez-les ici pour finaliser la note."
        />
        {preview.missing_inputs.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            Toutes les informations principales sont renseignées.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preview.missing_inputs.map((mi) => (
              <label key={mi.field} className="block text-sm">
                <span className="text-text-primary">
                  {mi.label}
                  {mi.required ? (
                    <span className="text-accent-cyan ml-1">*</span>
                  ) : null}
                </span>
                <Input
                  className="mt-1"
                  type={
                    mi.field.endsWith("kEUR") ? "number" : "text"
                  }
                  value={
                    (inputs as Record<string, unknown>)[mi.field] !== undefined
                      ? String((inputs as Record<string, unknown>)[mi.field])
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (mi.field.endsWith("kEUR")) {
                      patchInputs({
                        [mi.field]: v === "" ? undefined : Number(v),
                      } as Partial<FundingBriefAdditionalInputs>);
                    } else {
                      patchInputs({
                        [mi.field]: v === "" ? undefined : v,
                      } as Partial<FundingBriefAdditionalInputs>);
                    }
                  }}
                />
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Mention d'éligibilité" />
        <p className="text-xs text-text-secondary leading-relaxed">
          {preview.eligibility_disclaimer}
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <Button variant="outline" onClick={refreshPreview} disabled={isPending}>
          Rafraîchir l&apos;aperçu
        </Button>
        <Button onClick={persist} disabled={isPending}>
          {persistedState ? "Régénérer et enregistrer" : "Enregistrer la note"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.print()}
          disabled={isPending}
        >
          Imprimer / Sauvegarder en PDF
        </Button>
        {status ? (
          <span className="text-xs text-text-secondary">{status}</span>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-text-secondary uppercase tracking-wide">{label}</dt>
      <dd className="text-text-primary">{value ?? "—"}</dd>
    </div>
  );
}

function BulletCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; detail: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="space-y-3 text-sm">
        {items.map((it, i) => (
          <li key={i}>
            <p className="font-medium text-text-primary">{it.label}</p>
            <p className="text-text-secondary leading-relaxed">{it.detail}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
