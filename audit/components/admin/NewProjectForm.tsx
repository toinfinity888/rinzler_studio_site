"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldLabel, FieldError } from "@/components/ui/Input";
import { Card, CardHeader } from "@/components/ui/Card";
import { SectionRenderer } from "@/components/form/SectionRenderer";
import { SECTIONS } from "@/lib/form-schema/sections";
import { sectionTitle } from "@/lib/form-schema/i18n";
import { createProject } from "@/app/admin/projects/actions";
import type { Priority } from "@/db/schema";

export function NewProjectForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ projectId: string; url: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [label, setLabel] = React.useState("");
  const [hotelName, setHotelName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [prefill, setPrefill] = React.useState<Record<string, unknown>>({});
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});

  const updatePrefillField = React.useCallback((id: string, value: unknown) => {
    setPrefill((prev) => ({ ...prev, [id]: value }));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createProject({
        label,
        hotelName: hotelName || undefined,
        contactEmail,
        priority,
        prefill,
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/a/${result.tokenPlaintext}`;
      setCreated({ projectId: result.projectId, url });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <Card className="!p-6">
          <CardHeader
            title="Lien privé généré"
            description="Copiez-le et envoyez-le manuellement à votre client. Il n'est affiché qu'une seule fois — il ne sera plus jamais visible après cette page."
          />
          <div className="space-y-3">
            <code className="block break-all rounded-md p-3 text-sm [background:var(--color-bg-tertiary)] [border:1px_solid_var(--color-bg-secondary)]">
              {created.url}
            </code>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(created.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "✓ Copié" : "Copier le lien"}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/admin/projects/${created.projectId}`)}>
                Ouvrir le projet →
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="label" required>Nom interne du projet</FieldLabel>
        <Input
          id="label"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Audit Hôtel des Voyageurs — Q2 2026"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="hotelName">Nom de l'hôtel</FieldLabel>
        <Input
          id="hotelName"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
          placeholder="Hôtel des Voyageurs"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="contactEmail" required>Email du contact client</FieldLabel>
        <Input
          id="contactEmail"
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="contact@votrehotel.fr"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="priority">Priorité</FieldLabel>
        <Select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          options={[
            { value: "low", label: "Basse" },
            { value: "medium", label: "Moyenne" },
            { value: "high", label: "Haute" },
          ]}
        />
      </div>

      <fieldset className="space-y-3 rounded-md p-4 [border:1px_solid_var(--color-bg-tertiary)]">
        <legend className="text-sm text-text-secondary px-2">
          Pré-remplir des réponses (optionnel) — toutes les sections, tous les champs
        </legend>
        <p className="text-xs text-text-muted">
          Ce que vous pré-remplissez ici sera visible et modifiable par le client. Laissez tout
          vide si vous voulez que le client commence sur une page propre.
        </p>
        {SECTIONS.map((section) => {
          const open = openSections[section.id] ?? false;
          return (
            <div key={section.id} className="rounded-md [border:1px_solid_var(--color-bg-tertiary)]">
              <button
                type="button"
                onClick={() =>
                  setOpenSections((prev) => ({ ...prev, [section.id]: !open }))
                }
                aria-expanded={open}
                className="w-full px-4 py-3 flex items-center justify-between text-left text-sm text-text-primary hover:[background:rgba(255,255,255,0.02)] transition-colors"
              >
                <span>
                  {section.id.toUpperCase()} — {sectionTitle(section.id)}
                </span>
                <span aria-hidden="true">{open ? "−" : "+"}</span>
              </button>
              {open ? (
                <div className="px-4 pb-4 pt-2 [border-top:1px_solid_var(--color-bg-tertiary)]">
                  <SectionRenderer
                    section={section}
                    values={prefill}
                    onChange={updatePrefillField}
                    adminMode
                    showHeader={false}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      {error ? <FieldError message={error} /> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Création…" : "Générer le lien"}
        </Button>
      </div>
    </form>
  );
}
