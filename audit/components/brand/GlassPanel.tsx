import * as React from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Glass-morphism container — mirrors marketing site's button/header chrome. */
export function GlassPanel({ children, className = "", ...props }: GlassPanelProps) {
  return (
    <div className={["glass rounded-lg p-6", className].join(" ")} {...props}>
      {children}
    </div>
  );
}
