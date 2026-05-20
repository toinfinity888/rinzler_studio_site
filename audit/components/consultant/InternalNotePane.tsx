import * as React from "react";

import { NoteComposer } from "@/components/admin/NoteComposer";

/**
 * `InternalNotePane` (T091) — append-only thread of consultant-private
 * notes for a project. The composer appends a NEW note (existing
 * `appendInternalNote` server action). Each row shows author + timestamp;
 * the body is the consultant-private rationale — same surface that
 * `applyConsultantOverride` and `adjustScenarioWeights` write into via
 * the `[override]` / `[scenario-weight]` prefixes.
 *
 * Server-rendered (the composer itself is the only client island), so
 * the thread always reflects the latest DB state after a revalidate.
 */
export interface InternalNoteThreadRow {
  id: string;
  authorEmail: string | null;
  body: string;
  createdAt: Date;
}

const FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function classifyNote(body: string): { tag: string | null; rest: string } {
  if (body.startsWith("[override]")) {
    return { tag: "override", rest: body.slice("[override]".length).trim() };
  }
  if (body.startsWith("[scenario-weight]")) {
    return {
      tag: "scenario",
      rest: body.slice("[scenario-weight]".length).trim(),
    };
  }
  return { tag: null, rest: body };
}

export function InternalNotePane({
  projectId,
  notes,
}: {
  projectId: string;
  notes: InternalNoteThreadRow[];
}) {
  return (
    <div className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-text-primary uppercase tracking-wider">
          Notes internes
        </h3>
        <span className="text-xs text-text-muted">
          {notes.length} entrée{notes.length === 1 ? "" : "s"} · privées
        </span>
      </header>

      {notes.length === 0 ? (
        <p className="text-sm text-text-muted italic">
          Aucune note interne. Ce thread est invisible pour le client.
        </p>
      ) : (
        <ol className="space-y-2">
          {notes.map((n) => {
            const { tag, rest } = classifyNote(n.body);
            return (
              <li
                key={n.id}
                className="rounded-md p-3 [background:var(--color-bg-tertiary)] [border:1px_solid_var(--color-bg-secondary)]"
              >
                <div className="flex items-baseline justify-between gap-3 text-[11px] text-text-muted">
                  <span className="font-medium text-text-secondary">
                    {n.authorEmail ?? "—"}
                  </span>
                  <time>{FMT.format(new Date(n.createdAt))}</time>
                </div>
                {tag ? (
                  <span
                    className={
                      tag === "override"
                        ? "mt-1 inline-block rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-warning [background:rgba(255,179,71,0.12)]"
                        : "mt-1 inline-block rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent-cyan [background:rgba(140,255,247,0.10)]"
                    }
                  >
                    {tag}
                  </span>
                ) : null}
                <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {rest}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <NoteComposer projectId={projectId} />
    </div>
  );
}
