import * as React from "react";

export interface InternalNoteRow {
  id: string;
  authorEmail: string;
  body: string;
  createdAt: Date | number;
}

const FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function NotesThread({ notes }: { notes: InternalNoteRow[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-text-muted italic">Aucune note interne pour l'instant.</p>;
  }
  return (
    <ol className="space-y-3">
      {notes.map((n) => (
        <li
          key={n.id}
          className="rounded-md p-4 [background:var(--color-bg-tertiary)] [border:1px_solid_var(--color-bg-secondary)]"
        >
          <div className="flex items-baseline justify-between gap-3 text-xs text-text-muted">
            <span className="text-text-secondary font-medium">{n.authorEmail}</span>
            <time>{FMT.format(new Date(n.createdAt))}</time>
          </div>
          <p className="mt-2 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{n.body}</p>
        </li>
      ))}
    </ol>
  );
}
