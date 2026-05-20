"use client";

import * as React from "react";
import { useRef } from "react";

import { trackEvent } from "@/lib/analytics/events";
import type { EventName, EventProps } from "@/lib/analytics/events";

interface Props {
  eventName: EventName;
  eventProps?: EventProps;
  /** Wrap-around: render the children inside a styled <details>. */
  children: React.ReactNode;
  summary: React.ReactNode;
  className?: string;
  summaryClassName?: string;
}

/**
 * Tiny client island that emits a Plausible event the FIRST time a
 * `<details>` element is opened in the current session. Used by the
 * report view to instrument `recommendation_inspected` and
 * `scenario_compared` without polluting the server-rendered tree.
 *
 * The "fire-once" guard is intentional — open/close cycles shouldn't
 * inflate the event count, but a fresh page load is a new "session" for
 * Plausible's purposes anyway, so we don't try to persist the flag.
 */
export function TrackOnOpen({
  eventName,
  eventProps,
  children,
  summary,
  className = "",
  summaryClassName = "cursor-pointer text-text-muted",
}: Props) {
  const fired = useRef(false);
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (fired.current) return;
    if (!e.currentTarget.open) return;
    fired.current = true;
    trackEvent(eventName, eventProps);
  };
  return (
    <details className={className} onToggle={handleToggle}>
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
