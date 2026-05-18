"use client";

import * as React from "react";
import { Slider as UiSlider } from "@/components/ui/Slider";
import type { FieldProps } from "./types";

export function SliderField({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  const range = question.definition.range ?? { min: 0, max: 100, step: 1 };
  const v = iDontKnow ? undefined : typeof value === "number" ? value : undefined;
  return (
    <div className={readOnly ? "pointer-events-none opacity-70" : ""}>
      <UiSlider
        id={`q-${question.slug}`}
        value={v}
        onChange={(n) => onChange(n)}
        min={range.min}
        max={range.max}
        step={range.step ?? 1}
        lowLabel={`${range.min}${range.unit ? " " + range.unit : ""}`}
        highLabel={`${range.max}${range.unit ? " " + range.unit : ""}`}
      />
    </div>
  );
}
