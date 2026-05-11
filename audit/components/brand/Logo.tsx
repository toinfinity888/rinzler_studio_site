import * as React from "react";
// Static import lets Next.js inline + optimize.

export interface LogoProps {
  height?: number;
  className?: string;
}

export function Logo({ height = 28, className = "" }: LogoProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/brand/logo.svg"
      alt="Rinzler Studio"
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
      className={className}
    />
  );
}
