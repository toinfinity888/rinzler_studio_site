"use client";

import * as React from "react";
import type { FieldProps } from "./types";

export function SingleChoice({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  return (
    <div role="radiogroup" aria-labelledby={`q-${question.slug}-label`} className="flex flex-col gap-2">
      {question.options.map((opt) => {
        const id = `q-${question.slug}-${opt.slug}`;
        const checked = !iDontKnow && value === opt.slug;
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
              readOnly ? "pointer-events-none opacity-70" : "",
            ].join(" ")}
          >
            <input
              id={id}
              type="radio"
              name={`q-${question.slug}`}
              className="accent-[var(--color-accent-cyan)]"
              value={opt.slug}
              checked={checked}
              disabled={readOnly}
              onChange={() => onChange(opt.slug)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
