import * as React from "react";

export interface ConflictBannerProps {
  /** Number of distinct sources / contributors that disagreed. */
  sourceCount: number;
  /** Optional human-readable note explaining what disagrees. */
  note?: string | null;
  audience?: "internal" | "client";
  className?: string;
}

/**
 * Surfaces FR-112: when multiple sources disagree, we do NOT silently
 * pick one — we tell the consumer there is a conflict. The client-facing
 * variant softens the wording; the internal variant exposes the note.
 */
export function ConflictBanner({
  sourceCount,
  note,
  audience = "client",
  className = "",
}: ConflictBannerProps) {
  if (sourceCount < 2 && !note) return null;

  const headline =
    audience === "internal"
      ? `${sourceCount} sources divergent sur ce point — résoudre avant publication.`
      : "Plusieurs sources divergent sur cette information — à confirmer avec Rinzler.";

  return (
    <div
      role="alert"
      className={[
        "rounded-sm px-3 py-2 text-xs leading-relaxed",
        "text-[#e74c3c] [background:rgba(231,76,60,0.08)] [border:1px_solid_rgba(231,76,60,0.30)]",
        className,
      ].join(" ")}
    >
      <p className="font-medium">{headline}</p>
      {audience === "internal" && note ? (
        <p className="mt-1 text-text-secondary">{note}</p>
      ) : null}
    </div>
  );
}
