/**
 * Client-side prop types for the questionnaire components.
 *
 * Mirrors `lib/questionnaire/types.ts` but kept under the components/
 * boundary so the component tree doesn't import server-only modules.
 */

import type { RenderableQuestion } from "@/lib/questionnaire/types";

export interface FieldProps {
  question: RenderableQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  /** True when the hotelier toggled the "I don't know" affordance. */
  iDontKnow: boolean;
  onToggleIdk: (next: boolean) => void;
  /** Set when the validator rejected the previous value. */
  error?: string | null;
  /** Read-only mode (e.g. submitted audits). */
  readOnly?: boolean;
}
