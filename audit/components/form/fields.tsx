"use client";

import * as React from "react";
import type { FieldDef } from "@/lib/form-schema/types";
import { t } from "@/lib/form-schema/i18n";
import {
  Input,
  Textarea,
  Select,
  FieldLabel,
  FieldError,
} from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { HelpTooltip } from "@/components/form/HelpTooltip";

export interface FieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  adminMode?: boolean;
  error?: string;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

function FieldShell({
  field,
  adminMode,
  error,
  children,
}: {
  field: FieldDef;
  adminMode?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const entry = t(field.id);
  const isRequired = !adminMode && Boolean(field.required);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor={field.id} required={isRequired}>
          {entry.label}
        </FieldLabel>
        {entry.help ? <HelpTooltip id={field.id} text={entry.help} /> : null}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function TextField(props: FieldProps) {
  const entry = t(props.field.id);
  return (
    <FieldShell {...props}>
      <Input
        id={props.field.id}
        type="text"
        placeholder={entry.placeholder}
        value={asString(props.value)}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={props.field.validation?.maxLength}
        aria-invalid={Boolean(props.error)}
      />
    </FieldShell>
  );
}

export function EmailField(props: FieldProps) {
  const entry = t(props.field.id);
  return (
    <FieldShell {...props}>
      <Input
        id={props.field.id}
        type="email"
        placeholder={entry.placeholder}
        value={asString(props.value)}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={props.field.validation?.maxLength}
        aria-invalid={Boolean(props.error)}
      />
    </FieldShell>
  );
}

export function UrlField(props: FieldProps) {
  const entry = t(props.field.id);
  return (
    <FieldShell {...props}>
      <Input
        id={props.field.id}
        type="url"
        placeholder={entry.placeholder}
        value={asString(props.value)}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={props.field.validation?.maxLength}
        aria-invalid={Boolean(props.error)}
      />
    </FieldShell>
  );
}

export function NumberField(props: FieldProps) {
  const entry = t(props.field.id);
  const v = asNumber(props.value);
  return (
    <FieldShell {...props}>
      <Input
        id={props.field.id}
        type="number"
        placeholder={entry.placeholder}
        value={v ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          props.onChange(raw === "" ? null : Number(raw));
        }}
        min={props.field.validation?.min}
        max={props.field.validation?.max}
        aria-invalid={Boolean(props.error)}
      />
    </FieldShell>
  );
}

export function TextareaField(props: FieldProps) {
  const entry = t(props.field.id);
  const v = asString(props.value);
  const max = props.field.validation?.maxLength ?? 5000;
  return (
    <FieldShell {...props}>
      <Textarea
        id={props.field.id}
        placeholder={entry.placeholder}
        value={v}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={max}
        aria-invalid={Boolean(props.error)}
      />
      <p className="text-xs text-text-muted text-right">
        {v.length} / {max}
      </p>
    </FieldShell>
  );
}

export function SelectField(props: FieldProps) {
  const entry = t(props.field.id);
  const optionLabels = entry.options ?? {};
  const optionList = (props.field.validation?.options ?? []).map((value) => ({
    value,
    label: optionLabels[value] ?? value,
  }));
  return (
    <FieldShell {...props}>
      <Select
        id={props.field.id}
        options={optionList}
        placeholder="— Sélectionnez —"
        value={asString(props.value)}
        onChange={(e) => props.onChange(e.target.value || null)}
        aria-invalid={Boolean(props.error)}
      />
    </FieldShell>
  );
}

export function MultiSelectField(props: FieldProps) {
  const entry = t(props.field.id);
  const optionLabels = entry.options ?? {};
  const optionList = props.field.validation?.options ?? [];
  const current = new Set(asStringArray(props.value));
  const toggle = (value: string) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    props.onChange(Array.from(next));
  };
  return (
    <FieldShell {...props}>
      <div className="flex flex-wrap gap-2">
        {optionList.map((value) => {
          const checked = current.has(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={checked}
              className={[
                "rounded-md px-3 py-2 text-sm min-h-11 transition-[background-color,border-color,color] duration-[var(--duration-fast)]",
                checked
                  ? "[background:rgba(122,235,255,0.12)] [border:1px_solid_var(--color-accent-cyan)] text-text-primary"
                  : "[background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)] text-text-secondary hover:text-text-primary hover:[border-color:var(--color-input-border-hover)]",
              ].join(" ")}
            >
              {optionLabels[value] ?? value}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function SliderField(props: FieldProps) {
  const entry = t(props.field.id);
  const poles = props.field.sliderPoles;
  const lowLabel = poles ? entry.options?.[poles.low] : undefined;
  const highLabel = poles ? entry.options?.[poles.high] : undefined;
  return (
    <FieldShell {...props}>
      <Slider
        id={props.field.id}
        value={asNumber(props.value)}
        onChange={(n) => props.onChange(n)}
        min={props.field.validation?.min ?? 1}
        max={props.field.validation?.max ?? 10}
        lowLabel={lowLabel}
        highLabel={highLabel}
      />
    </FieldShell>
  );
}

export function RadioGroupField(props: FieldProps) {
  const entry = t(props.field.id);
  const optionLabels = entry.options ?? {};
  const optionList = (props.field.validation?.options ?? []).map((value) => ({
    value,
    label: optionLabels[value] ?? value,
  }));
  return (
    <FieldShell {...props}>
      <RadioGroup
        name={props.field.id}
        value={asString(props.value) || undefined}
        onChange={(v) => props.onChange(v)}
        options={optionList}
      />
    </FieldShell>
  );
}

/* ----------------------------------------------------------------------- *
 * SystemBlockField — Section 2 composite. Renders the system category
 * label + 5 sub-fields (provider, monthly_cost, contract_status,
 * satisfaction, frustrations). Each sub-field id is the composite
 * `s2.<category>.<sub>`. Values flow up via onSubChange(subId, value).
 * ----------------------------------------------------------------------- */

import type { SystemBlockSubfield } from "@/lib/form-schema/types";
import { systemFieldId, SYSTEM_BLOCK_SUBFIELDS } from "@/lib/form-schema/types";
import { SYSTEM_LABELS, SYSTEM_SUB_LABELS } from "@/lib/form-schema/fr";
import { Card, CardHeader } from "@/components/ui/Card";

export interface SystemBlockFieldProps {
  field: FieldDef;
  values: Record<string, unknown>; // keyed by composite id (e.g. s2.pms.provider)
  onSubChange: (subId: string, value: unknown) => void;
  errors?: Record<string, string>;
}

const CONTRACT_OPTIONS: { value: string; label: string }[] = [
  { value: "month_to_month", label: "Mensuel reconductible" },
  { value: "annual", label: "Annuel" },
  { value: "multi_year", label: "Pluriannuel" },
  { value: "expired", label: "Expiré / hors contrat" },
  { value: "unknown", label: "Je ne sais pas" },
];

const SATISFACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "very_unsatisfied", label: "Très insatisfait" },
  { value: "unsatisfied", label: "Insatisfait" },
  { value: "neutral", label: "Neutre" },
  { value: "satisfied", label: "Satisfait" },
  { value: "very_satisfied", label: "Très satisfait" },
];

export function SystemBlockField({ field, values, onSubChange }: SystemBlockFieldProps) {
  const category = field.systemCategory ?? "";
  const sys = SYSTEM_LABELS[category];
  if (!sys) return null;
  const id = (sub: SystemBlockSubfield) => systemFieldId(field.id, sub);

  return (
    <Card>
      <CardHeader title={sys.name} description={sys.help} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor={id("provider")}>{SYSTEM_SUB_LABELS.provider!.label}</FieldLabel>
          <Input
            id={id("provider")}
            type="text"
            value={asString(values[id("provider")])}
            onChange={(e) => onSubChange(id("provider"), e.target.value)}
            maxLength={200}
            placeholder="Ex: Mews, Cloudbeds, Apaleo…"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor={id("monthly_cost")}>{SYSTEM_SUB_LABELS.monthly_cost!.label}</FieldLabel>
          <Input
            id={id("monthly_cost")}
            type="number"
            min={0}
            value={asNumber(values[id("monthly_cost")]) ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              onSubChange(id("monthly_cost"), raw === "" ? null : Number(raw));
            }}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor={id("contract_status")}>
            {SYSTEM_SUB_LABELS.contract_status!.label}
          </FieldLabel>
          <Select
            id={id("contract_status")}
            options={CONTRACT_OPTIONS}
            placeholder="— Sélectionnez —"
            value={asString(values[id("contract_status")])}
            onChange={(e) => onSubChange(id("contract_status"), e.target.value || null)}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor={id("satisfaction")}>
            {SYSTEM_SUB_LABELS.satisfaction!.label}
          </FieldLabel>
          <Select
            id={id("satisfaction")}
            options={SATISFACTION_OPTIONS}
            placeholder="— Sélectionnez —"
            value={asString(values[id("satisfaction")])}
            onChange={(e) => onSubChange(id("satisfaction"), e.target.value || null)}
          />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <FieldLabel htmlFor={id("frustrations")}>{SYSTEM_SUB_LABELS.frustrations!.label}</FieldLabel>
        <Textarea
          id={id("frustrations")}
          rows={3}
          value={asString(values[id("frustrations")])}
          onChange={(e) => onSubChange(id("frustrations"), e.target.value)}
          maxLength={5000}
          placeholder="Ce qui vous coûte le plus de temps ou d'argent au quotidien."
        />
      </div>
    </Card>
  );
}

export const _SUBFIELDS = SYSTEM_BLOCK_SUBFIELDS;
