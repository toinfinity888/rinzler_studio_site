"use client";

import * as React from "react";
import type { SectionDef, FieldDef } from "@/lib/form-schema/types";
import { sectionTitle, sectionIntro } from "@/lib/form-schema/i18n";
import { systemFieldId, SYSTEM_BLOCK_SUBFIELDS } from "@/lib/form-schema/types";
import {
  TextField,
  EmailField,
  UrlField,
  NumberField,
  TextareaField,
  SelectField,
  MultiSelectField,
  SliderField,
  RadioGroupField,
  SystemBlockField,
} from "./fields";

export interface SectionRendererProps {
  section: SectionDef;
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  /** When true, hides the required-indicator and never blocks (admin pre-fill mode). */
  adminMode?: boolean;
  errors?: Record<string, string>;
  showHeader?: boolean;
}

export function SectionRenderer({
  section,
  values,
  onChange,
  adminMode = false,
  errors,
  showHeader = true,
}: SectionRendererProps) {
  return (
    <section className="space-y-6">
      {showHeader ? (
        <header className="space-y-1">
          <h2 className="text-h2 font-semibold text-text-primary">{sectionTitle(section.id)}</h2>
          {sectionIntro(section.id) ? (
            <p className="text-text-secondary text-base leading-relaxed">
              {sectionIntro(section.id)}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="space-y-6">
        {section.fields.map((field) => (
          <FieldDispatch
            key={field.id}
            field={field}
            values={values}
            onChange={onChange}
            adminMode={adminMode}
            errors={errors}
          />
        ))}
      </div>
    </section>
  );
}

interface FieldDispatchProps {
  field: FieldDef;
  values: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  adminMode?: boolean;
  errors?: Record<string, string>;
}

function FieldDispatch({ field, values, onChange, adminMode, errors }: FieldDispatchProps) {
  if (field.type === "system-block") {
    // Hand sub-field values to the composite component.
    const subValues: Record<string, unknown> = {};
    for (const sub of SYSTEM_BLOCK_SUBFIELDS) {
      const id = systemFieldId(field.id, sub);
      subValues[id] = values[id];
    }
    return <SystemBlockField field={field} values={subValues} onSubChange={onChange} />;
  }

  const common = {
    field,
    value: values[field.id],
    onChange: (v: unknown) => onChange(field.id, v),
    adminMode,
    error: errors?.[field.id],
  };

  switch (field.type) {
    case "text":
      return <TextField {...common} />;
    case "email":
      return <EmailField {...common} />;
    case "url":
      return <UrlField {...common} />;
    case "number":
      return <NumberField {...common} />;
    case "textarea":
      return <TextareaField {...common} />;
    case "select":
      return <SelectField {...common} />;
    case "multiselect":
      return <MultiSelectField {...common} />;
    case "slider":
      return <SliderField {...common} />;
    case "radio-group":
      return <RadioGroupField {...common} />;
  }
}
