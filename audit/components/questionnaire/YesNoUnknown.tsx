"use client";

import * as React from "react";
import type { FieldProps } from "./types";

const CHOICES = [
  { slug: "yes", label: "Oui" },
  { slug: "no", label: "Non" },
  { slug: "unknown", label: "Je ne sais pas" },
] as const;

export function YesNoUnknown({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  const v = iDontKnow ? "" : typeof value === "string" ? value : "";
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {CHOICES.map((opt) => {
        const id = `q-${question.slug}-${opt.slug}`;
        const checked = v === opt.slug;
        return (
          <label
            key={opt.slug}
            htmlFor={id}
            className={[
              "cursor-pointer select-none rounded-md px-4 py-2 text-sm min-h-11 inline-flex items-center",
              "transition-[background-color,border-color,color] duration-[var(--duration-fast)]",
              checked
                ? "[background:rgba(0,255,255,0.10)] [border:1px_solid_var(--color-accent-cyan)] text-text-primary"
                : "[background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-secondary hover:[border-color:var(--color-input-border-hover)]",
              readOnly ? "pointer-events-none opacity-70" : "",
            ].join(" ")}
          >
            <input
              id={id}
              type="radio"
              name={`q-${question.slug}`}
              value={opt.slug}
              checked={checked}
              disabled={readOnly}
              onChange={() => onChange(opt.slug)}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
