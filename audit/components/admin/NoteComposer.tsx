"use client";

import * as React from "react";
import { useTransition } from "react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { appendInternalNote } from "@/app/admin/projects/actions";

export function NoteComposer({ projectId }: { projectId: string }) {
  const draftKey = `project:${projectId}:noteDraft`;
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Restore localStorage draft on mount.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(draftKey);
    if (saved) setBody(saved);
  }, [draftKey]);

  // Persist draft to localStorage on every change.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (body.length === 0) window.localStorage.removeItem(draftKey);
    else window.localStorage.setItem(draftKey, body);
  }, [body, draftKey]);

  function submit() {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setError("La note ne peut pas être vide.");
      return;
    }
    if (trimmed.length > 5000) {
      setError("La note dépasse 5 000 caractères.");
      return;
    }
    startTransition(async () => {
      try {
        await appendInternalNote(projectId, trimmed);
        setBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={5000}
        placeholder="Note interne (jamais visible par le client)…"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {body.length} / 5000
        </span>
        <Button onClick={submit} size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Ajouter la note"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
