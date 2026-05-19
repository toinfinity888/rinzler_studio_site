"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";

interface ServerActions {
  updateAction: (form: {
    definition: unknown;
    translations: TranslationFormState[];
    conditions: { expression: unknown }[];
  }) => Promise<{ ok: boolean; error?: string; versionId?: string; version?: number }>;
  publishAction: (versionId: string) => Promise<{ ok: boolean; error?: string }>;
  deactivateAction: () => Promise<{ ok: boolean; error?: string }>;
}

export interface TranslationFormState {
  language: string;
  prompt: string;
  helper: string | null;
  optionLabels: Record<string, string> | null;
}

export interface QuestionEditorProps {
  question: {
    id: string;
    slug: string;
    block: string;
    answerType: string;
    status: string;
    currentVersion: number;
  };
  initialDefinitionJson: string;
  initialTranslations: TranslationFormState[];
  initialConditionsJson: string;
  serverActions: ServerActions;
}

export function QuestionEditor(props: QuestionEditorProps) {
  const router = useRouter();
  const [definition, setDefinition] = React.useState(props.initialDefinitionJson);
  const [translations, setTranslations] = React.useState<TranslationFormState[]>(
    props.initialTranslations.length > 0
      ? props.initialTranslations
      : [{ language: "fr", prompt: "", helper: "", optionLabels: null }],
  );
  const [conditionsJson, setConditionsJson] = React.useState(props.initialConditionsJson);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [draftVersionId, setDraftVersionId] = React.useState<string | null>(null);

  function setTranslationField(
    idx: number,
    field: "language" | "prompt" | "helper" | "optionLabels",
    value: string,
  ) {
    setTranslations((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        if (field === "optionLabels") {
          try {
            return { ...t, optionLabels: value.trim() ? JSON.parse(value) : null };
          } catch {
            return t; // ignore invalid JSON until they fix it
          }
        }
        return { ...t, [field]: value };
      }),
    );
  }

  function addTranslation() {
    setTranslations((prev) => [
      ...prev,
      { language: "en", prompt: "", helper: "", optionLabels: null },
    ]);
  }

  function removeTranslation(idx: number) {
    setTranslations((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveDraft() {
    setBusy(true);
    setMessage(null);
    try {
      let parsedDef: unknown;
      try {
        parsedDef = JSON.parse(definition);
      } catch (e) {
        setMessage(`Definition JSON invalide : ${e instanceof Error ? e.message : "parse error"}`);
        return;
      }
      let parsedConds: { expression: unknown }[] = [];
      if (conditionsJson.trim()) {
        try {
          const arr = JSON.parse(conditionsJson);
          if (!Array.isArray(arr)) {
            setMessage("Conditions doit être un tableau JSON (peut être vide)");
            return;
          }
          parsedConds = arr.map((expression) => ({ expression }));
        } catch (e) {
          setMessage(`Conditions JSON invalide : ${e instanceof Error ? e.message : "parse error"}`);
          return;
        }
      }
      const res = await props.serverActions.updateAction({
        definition: parsedDef,
        translations,
        conditions: parsedConds,
      });
      if (!res.ok) {
        setMessage(`Erreur : ${res.error}`);
        return;
      }
      setDraftVersionId(res.versionId ?? null);
      setMessage(`Brouillon enregistré (version ${res.version}).`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!draftVersionId) {
      setMessage("Enregistrez d’abord un brouillon avant de publier.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await props.serverActions.publishAction(draftVersionId);
      if (!res.ok) {
        setMessage(`Erreur : ${res.error}`);
        return;
      }
      setMessage("Version publiée. Les nouveaux audits l’utiliseront immédiatement.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("Désactiver cette question ? Les audits passés restent intacts.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await props.serverActions.deactivateAction();
      if (!res.ok) {
        setMessage(`Erreur : ${res.error}`);
        return;
      }
      setMessage("Question désactivée.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={
            <span>
              {props.question.slug}{" "}
              <span className="text-xs text-text-muted">
                ({props.question.block} · {props.question.answerType})
              </span>
            </span>
          }
          description={`Statut: ${props.question.status} · current version: ${props.question.currentVersion}`}
        />

        {message ? (
          <p className="text-sm rounded-md px-3 py-2 [background:var(--color-bg-tertiary)] text-text-secondary">
            {message}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleSaveDraft} disabled={busy} size="sm">
            ✎ Enregistrer un brouillon
          </Button>
          <Button onClick={handlePublish} disabled={busy || !draftVersionId} size="sm" variant="outline">
            ⇧ Publier ce brouillon
          </Button>
          <Button
            onClick={handleDeactivate}
            disabled={busy || props.question.status === "deactivated"}
            size="sm"
            variant="ghost"
          >
            ✕ Désactiver
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Définition (JSON)" description="required, options, range, maxItems, etc." />
        <Textarea
          rows={10}
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          disabled={busy}
          className="font-mono text-xs"
        />
      </Card>

      <Card>
        <CardHeader
          title="Traductions"
          description="FR canonique. Si une langue est demandée et absente, la version FR est rendue avec un indicateur."
        />
        <div className="space-y-4">
          {translations.map((t, idx) => (
            <div key={idx} className="rounded-md p-4 [background:var(--color-bg-tertiary)]">
              <div className="flex flex-wrap gap-3 items-end">
                <label className="block">
                  <span className="block text-xs text-text-muted mb-1">Langue</span>
                  <Input
                    value={t.language}
                    onChange={(e) => setTranslationField(idx, "language", e.target.value)}
                    placeholder="fr"
                    disabled={busy}
                    className="w-20"
                  />
                </label>
                <label className="block flex-1 min-w-[300px]">
                  <span className="block text-xs text-text-muted mb-1">Énoncé</span>
                  <Input
                    value={t.prompt}
                    onChange={(e) => setTranslationField(idx, "prompt", e.target.value)}
                    placeholder="Quel PMS utilisez-vous ?"
                    disabled={busy}
                  />
                </label>
                <Button
                  onClick={() => removeTranslation(idx)}
                  disabled={busy || translations.length <= 1}
                  size="sm"
                  variant="ghost"
                >
                  ✕
                </Button>
              </div>
              <label className="block mt-3">
                <span className="block text-xs text-text-muted mb-1">Helper / sous-texte</span>
                <Input
                  value={t.helper ?? ""}
                  onChange={(e) => setTranslationField(idx, "helper", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block mt-3">
                <span className="block text-xs text-text-muted mb-1">
                  Libellés des options (JSON : {`{ "option_slug": "Libellé" }`})
                </span>
                <Textarea
                  rows={4}
                  value={t.optionLabels ? JSON.stringify(t.optionLabels, null, 2) : ""}
                  onChange={(e) => setTranslationField(idx, "optionLabels", e.target.value)}
                  disabled={busy}
                  className="font-mono text-xs"
                />
              </label>
            </div>
          ))}
          <Button onClick={addTranslation} size="sm" variant="outline" disabled={busy}>
            + Ajouter une traduction
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Conditions (JSON)"
          description="Tableau d’expressions AST. Toutes doivent être vraies pour afficher la question. Laissez vide pour afficher toujours."
        />
        <Textarea
          rows={8}
          value={conditionsJson}
          onChange={(e) => setConditionsJson(e.target.value)}
          disabled={busy}
          className="font-mono text-xs"
          placeholder={`[ { "not": { "answer": "pms_vendor", "op": "eq", "value": "none" } } ]`}
        />
      </Card>
    </div>
  );
}
