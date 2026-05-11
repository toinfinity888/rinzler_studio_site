import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={[
        "rounded-lg p-6 md:p-8 shadow-md",
        "[background:var(--color-bg-secondary)] [border:1px_solid_rgba(255,255,255,0.06)]",
        hover
          ? "transition-[transform,box-shadow] duration-[var(--duration-normal)] hover:-translate-y-1 hover:shadow-lg"
          : "",
        className,
      ].join(" ")}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export function CardHeader({ icon, title, description, className = "", ...props }: CardHeaderProps) {
  return (
    <div className={["mb-4 flex items-start gap-3", className].join(" ")} {...props}>
      {icon ? <div className="text-accent-cyan shrink-0 mt-0.5">{icon}</div> : null}
      <div className="min-w-0">
        <h3 className="text-lg md:text-xl font-semibold text-text-primary">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-text-secondary leading-relaxed">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
