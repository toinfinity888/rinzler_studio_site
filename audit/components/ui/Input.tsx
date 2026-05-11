import * as React from "react";

/**
 * Form-field affordance: input bg is one step lighter than the surrounding
 * card (so it always pops within a Card), border is visible at rest, hover
 * lifts the border further, focus snaps to the brand cyan with a soft glow.
 * The subtle inset highlight on the top edge gives a tiny "depressed
 * surface" feel — without resorting to shadows that look heavy on a dark
 * gray canvas.
 */
const FIELD_BASE =
  "w-full min-h-11 px-4 py-3 rounded-md text-text-primary text-base " +
  "[background:var(--color-input-bg)] " +
  "[border:1px_solid_var(--color-input-border)] " +
  "[box-shadow:inset_0_1px_0_0_var(--color-input-highlight)] " +
  "transition-[border-color,box-shadow] duration-[var(--duration-fast)] " +
  "placeholder:text-text-muted " +
  "hover:[border-color:var(--color-input-border-hover)] " +
  "focus:outline-none focus:border-accent-cyan focus:[box-shadow:var(--color-input-shadow-focus)] " +
  "aria-[invalid=true]:border-error";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={[FIELD_BASE, className].join(" ")} {...props} />
  ),
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", rows = 5, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={[FIELD_BASE, "resize-y min-h-[120px]", className].join(" ")}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", options, placeholder, ...props }, ref) => (
    <select ref={ref} className={[FIELD_BASE, "appearance-none pr-10", className].join(" ")} {...props}>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
);
Select.displayName = "Select";

export interface FieldLabelProps {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="block mb-2 text-sm font-medium text-text-primary">
      {children}
      {required ? <span className="text-accent-cyan ml-1" aria-hidden="true">*</span> : null}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs text-error">
      {message}
    </p>
  );
}
