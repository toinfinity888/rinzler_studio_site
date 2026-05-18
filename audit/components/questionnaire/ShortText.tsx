"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";
import type { FieldProps } from "./types";

export function ShortText({
  question,
  value,
  onChange,
  iDontKnow,
  readOnly,
}: FieldProps) {
  const v = iDontKnow ? "" : typeof value === "string" ? value : "";
  return (
    <Input
      id={`q-${question.slug}`}
      type="text"
      value={v}
      maxLength={question.definition.maxLength}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      placeholder={question.helper ?? ""}
    />
  );
}
