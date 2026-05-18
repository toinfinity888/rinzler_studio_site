"use client";

import * as React from "react";
import type { FieldProps } from "./types";

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

/**
 * Lightweight ranking input — up/down buttons (no drag-and-drop for
 * accessibility + mobile reliability). The hotelier ranks the top-N items;
 * unranked options stay in the "available" pool.
 */
export function Ranking({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  const topN = question.definition.topN ?? question.options.length;
  const ranked = iDontKnow ? [] : asArray(value);
  const labelMap = Object.fromEntries(
    question.options.map((o) => [o.slug, o.label]),
  );
  const available = question.options
    .map((o) => o.slug)
    .filter((s) => !ranked.includes(s));

  const move = (slug: string, dir: "up" | "down") => {
    if (readOnly) return;
    const idx = ranked.indexOf(slug);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= ranked.length) return;
    const next = [...ranked];
    [next[idx], next[target]] = [next[target] as string, next[idx] as string];
    onChange(next);
  };

  const add = (slug: string) => {
    if (readOnly) return;
    if (ranked.length >= topN) return;
    onChange([...ranked, slug]);
  };

  const remove = (slug: string) => {
    if (readOnly) return;
    onChange(ranked.filter((s) => s !== slug));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {ranked.length === 0 ? (
          <p className="text-xs text-text-muted">
            Sélectionnez vos {topN} priorités principales dans la liste ci-dessous.
          </p>
        ) : (
          ranked.map((slug, idx) => (
            <div
              key={slug}
              className="flex items-center gap-3 rounded-md px-3 py-2 [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)]"
            >
              <span className="font-semibold text-accent-cyan w-6">{idx + 1}.</span>
              <span className="flex-1 text-sm text-text-primary">{labelMap[slug] ?? slug}</span>
              <button
                type="button"
                aria-label="Monter"
                disabled={readOnly || idx === 0}
                className="px-2 py-1 text-xs rounded [background:rgba(255,255,255,0.06)] hover:[background:rgba(255,255,255,0.10)] disabled:opacity-40"
                onClick={() => move(slug, "up")}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Descendre"
                disabled={readOnly || idx === ranked.length - 1}
                className="px-2 py-1 text-xs rounded [background:rgba(255,255,255,0.06)] hover:[background:rgba(255,255,255,0.10)] disabled:opacity-40"
                onClick={() => move(slug, "down")}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Retirer"
                disabled={readOnly}
                className="px-2 py-1 text-xs rounded [background:rgba(255,170,0,0.10)] text-warning hover:[background:rgba(255,170,0,0.18)] disabled:opacity-40"
                onClick={() => remove(slug)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {available.length > 0 && ranked.length < topN ? (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">À ajouter :</p>
          <div className="flex flex-wrap gap-2">
            {available.map((slug) => (
              <button
                key={slug}
                type="button"
                disabled={readOnly}
                onClick={() => add(slug)}
                className="rounded-md px-3 py-2 text-sm [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-secondary hover:[border-color:var(--color-accent-cyan)] hover:text-text-primary disabled:opacity-40"
              >
                + {labelMap[slug] ?? slug}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-text-muted">
        {ranked.length} / {topN} priorité(s) classée(s)
      </p>
    </div>
  );
}
