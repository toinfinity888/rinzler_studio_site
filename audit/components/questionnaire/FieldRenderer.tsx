"use client";

import * as React from "react";

import type { RenderableQuestion } from "@/lib/questionnaire/types";

import { SingleChoice } from "./SingleChoice";
import { MultiSelect } from "./MultiSelect";
import { Dropdown } from "./Dropdown";
import { SliderField } from "./Slider";
import { Ranking } from "./Ranking";
import { YesNoUnknown } from "./YesNoUnknown";
import { ShortText } from "./ShortText";
import { VoiceCapture } from "./VoiceCapture";
import type { FieldProps } from "./types";

export interface FieldRendererProps {
  question: RenderableQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  iDontKnow: boolean;
  onToggleIdk: (next: boolean) => void;
  error?: string | null;
  readOnly?: boolean;
  /** Tokenized client path token. Used by the VoiceCapture component only. */
  token: string;
  /** True when this slug came from the prefill set. UI hint only. */
  prefilledFrom?: "scan" | "consultant" | null;
}

export function FieldRenderer(props: FieldRendererProps) {
  const { question, prefilledFrom, error } = props;
  const fieldProps: FieldProps = {
    question,
    value: props.value,
    onChange: props.onChange,
    iDontKnow: props.iDontKnow,
    onToggleIdk: props.onToggleIdk,
    readOnly: props.readOnly,
    error: props.error,
  };

  let inner: React.ReactNode;
  switch (question.answer_type) {
    case "single":
      inner = <SingleChoice {...fieldProps} />;
      break;
    case "multi":
      inner = <MultiSelect {...fieldProps} />;
      break;
    case "dropdown":
      inner = <Dropdown {...fieldProps} />;
      break;
    case "slider":
      inner = <SliderField {...fieldProps} />;
      break;
    case "ranking":
      inner = <Ranking {...fieldProps} />;
      break;
    case "yes_no_unknown":
      inner = <YesNoUnknown {...fieldProps} />;
      break;
    case "short_text":
      inner = <ShortText {...fieldProps} />;
      break;
    case "voice":
      inner = <VoiceCapture {...fieldProps} token={props.token} />;
      break;
    default: {
      const _exhaustive: never = question.answer_type;
      inner = (
        <p className="text-xs text-error">
          Type de champ inconnu : {String(_exhaustive)}
        </p>
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <label
          id={`q-${question.slug}-label`}
          htmlFor={`q-${question.slug}`}
          className="block text-sm font-medium text-text-primary"
        >
          {question.prompt}
          {question.definition.required ? (
            <span className="text-accent-cyan ml-1" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-text-muted cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={props.iDontKnow}
            onChange={(e) => props.onToggleIdk(e.target.checked)}
            disabled={props.readOnly}
            className="accent-[var(--color-accent-cyan)]"
          />
          Je ne sais pas
        </label>
      </div>
      {question.helper ? (
        <p className="text-xs text-text-muted">{question.helper}</p>
      ) : null}
      {prefilledFrom ? (
        <p className="text-xs text-accent-cyan">
          {prefilledFrom === "scan"
            ? "Pré-rempli depuis l’analyse de votre site"
            : "Pré-rempli par votre consultant"}
        </p>
      ) : null}
      {question.fallback_language_used ? (
        <p className="text-xs text-warning">
          Traduction non disponible — version française affichée par défaut.
        </p>
      ) : null}
      {inner}
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
