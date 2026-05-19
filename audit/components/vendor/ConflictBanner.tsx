import * as React from "react";

export interface ConflictBannerProps {
  fieldPath: string;
  sources: string[];
  note?: string | null;
}

export function ConflictBanner({ fieldPath, sources, note }: ConflictBannerProps) {
  return (
    <div
      role="status"
      className="mt-1 rounded-sm border border-warning/40 bg-warning/5 px-2 py-1.5 text-[11px] text-warning"
    >
      Conflit de provenance sur <strong>{fieldPath}</strong> · sources :{" "}
      {sources.join(", ")}
      {note ? <span className="block text-text-muted mt-0.5">{note}</span> : null}
    </div>
  );
}
