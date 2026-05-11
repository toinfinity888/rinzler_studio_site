"use client";

import * as React from "react";

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: readonly RadioOption[];
}

export function RadioGroup({ name, value, onChange, options }: RadioGroupProps) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const id = `${name}__${opt.value}`;
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={[
              "cursor-pointer select-none rounded-md px-4 py-2 text-sm min-h-11 inline-flex items-center",
              "transition-[background-color,border-color,color] duration-[var(--duration-fast)]",
              checked
                ? "[background:rgba(122,235,255,0.12)] [border:1px_solid_var(--color-accent-cyan)] text-text-primary"
                : "[background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-secondary hover:text-text-primary hover:[border-color:var(--color-input-border-hover)]",
            ].join(" ")}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
