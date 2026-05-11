"use client";

import * as React from "react";

export interface SliderProps {
  id: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  lowLabel?: string;
  highLabel?: string;
  /** When true OR viewport ≤ 360px, renders a numeric input instead. */
  forceNumeric?: boolean;
}

/**
 * 1–10 difficulty slider with labelled poles. Mirrors the marketing site's
 * cyan/purple accent pattern. Auto-degrades to a numeric input below 360 px
 * (FR edge case + T038 task spec) using a CSS-only check with a media query.
 */
export function Slider({
  id,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  lowLabel,
  highLabel,
  forceNumeric = false,
}: SliderProps) {
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value));
  const v = value ?? Math.round((min + max) / 2);

  return (
    <div className="space-y-2">
      {/* Numeric fallback (always rendered, hidden above 360px via CSS) */}
      {forceNumeric ? (
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={handleSlider}
          className="w-24 min-h-11 px-3 py-2 rounded-md text-text-primary text-base [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] focus:outline-none focus:border-accent-cyan focus:[box-shadow:var(--color-input-shadow-focus)]"
        />
      ) : (
        <>
          <div className="hidden max-[360px]:block">
            <input
              id={id}
              type="number"
              min={min}
              max={max}
              step={step}
              value={value ?? ""}
              onChange={handleSlider}
              className="w-24 min-h-11 px-3 py-2 rounded-md text-text-primary [background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] focus:outline-none focus:border-accent-cyan focus:[box-shadow:var(--color-input-shadow-focus)]"
            />
          </div>
          <div className="block max-[360px]:hidden">
            <input
              id={id}
              type="range"
              min={min}
              max={max}
              step={step}
              value={v}
              onChange={handleSlider}
              className="w-full accent-[var(--color-accent-cyan)] cursor-pointer"
            />
            <div className="flex justify-between mt-1 text-xs text-text-muted">
              <span>{lowLabel ?? min}</span>
              <span className="text-text-primary font-medium">{v}</span>
              <span>{highLabel ?? max}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
