"use client";

import * as React from "react";
import type { FieldProps } from "./types";

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

export function MultiSelect({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  const current = iDontKnow ? [] : asArray(value);
  const maxItems = question.definition.maxItems ?? null;

  const toggle = (slug: string) => {
    if (readOnly) return;
    if (current.includes(slug)) {
      onChange(current.filter((s) => s !== slug));
    } else {
      if (maxItems !== null && current.length >= maxItems) return;
      onChange([...current, slug]);
    }
  };

  return (
    <div role="group" className="flex flex-col gap-2">
      {question.options.map((opt) => {
        const id = `q-${question.slug}-${opt.slug}`;
        const checked = current.includes(opt.slug);
        const disabled =
          readOnly || (maxItems !== null && current.length >= maxItems && !checked);
        return (
          <label
            key={opt.slug}
            htmlFor={id}
            className={[
              "cursor-pointer select-none rounded-md px-4 py-3 text-sm inline-flex items-center gap-3 min-h-11",
              "transition-[background-color,border-color,color] duration-[var(--duration-fast)]",
              checked
                ? "[background:rgba(0,255,255,0.10)] [border:1px_solid_var(--color-accent-cyan)] text-text-primary"
                : "[background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-secondary hover:[border-color:var(--color-input-border-hover)]",
              disabled && !checked ? "opacity-60 pointer-events-none" : "",
            ].join(" ")}
          >
            <input
              id={id}
              type="checkbox"
              className="accent-[var(--color-accent-cyan)]"
              checked={checked}
              disabled={disabled && !checked}
              onChange={() => toggle(opt.slug)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
      {maxItems !== null ? (
        <p className="text-xs text-text-muted">
          {current.length} / {maxItems} sélectionné(s)
        </p>
      ) : null}
    </div>
  );
}
