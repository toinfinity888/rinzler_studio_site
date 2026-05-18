"use client";

import * as React from "react";
import { Select } from "@/components/ui/Input";
import type { FieldProps } from "./types";

export function Dropdown({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  const v = iDontKnow ? "" : typeof value === "string" ? value : "";
  return (
    <Select
      id={`q-${question.slug}`}
      value={v}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={readOnly}
      placeholder="Choisir…"
      options={question.options.map((o) => ({ value: o.slug, label: o.label }))}
    />
  );
}
