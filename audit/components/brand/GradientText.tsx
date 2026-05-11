import * as React from "react";

export interface GradientTextProps {
  children: React.ReactNode;
  as?: "span" | "h1" | "h2" | "h3";
  className?: string;
}

/** Cyan → purple gradient text. Mirrors `.calc-gradient` on the marketing site. */
export function GradientText({ children, as: Tag = "span", className = "" }: GradientTextProps) {
  return <Tag className={["gradient-text", className].join(" ")}>{children}</Tag>;
}
