import * as React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "glass text-text-primary hover:[background:rgba(255,255,255,0.14)] hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100",
  secondary:
    "bg-transparent text-accent-cyan border-2 border-accent-cyan hover:bg-accent-cyan hover:text-bg-primary",
  outline:
    "bg-transparent text-text-primary border-2 border-text-secondary hover:border-accent-cyan hover:text-accent-cyan",
  ghost:
    "bg-transparent text-text-primary hover:[background:rgba(255,255,255,0.06)]",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "min-h-9 px-4 py-2 text-sm",
  md: "min-h-11 px-6 py-3 text-[15px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2.5 rounded-sm font-medium tracking-tight",
        "transition-[background,box-shadow,transform] duration-[var(--duration-normal)] ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      ].join(" ")}
      {...props}
    />
  ),
);
Button.displayName = "Button";
