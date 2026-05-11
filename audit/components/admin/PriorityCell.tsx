"use client";

import * as React from "react";
import { useTransition } from "react";
import type { Priority } from "@/db/schema";
import { updateProjectPriority } from "@/app/admin/projects/actions";

const OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
];

const COLOR: Record<Priority, string> = {
  low: "text-text-muted",
  medium: "text-text-secondary",
  high: "text-accent-cyan",
};

/**
 * Inline priority editor in the dashboard row. Calls updateProjectPriority
 * server action on change — closes the C2 finding (FR-026 update path).
 */
export function PriorityCell({ projectId, priority }: { projectId: string; priority: Priority }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={priority}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Priority;
        startTransition(async () => {
          await updateProjectPriority(projectId, next);
        });
      }}
      className={[
        "min-h-9 px-2 py-1 rounded-sm text-sm appearance-none cursor-pointer",
        "[background:var(--color-input-bg)] [border:1px_solid_var(--color-input-border)]",
        "focus:outline-none focus:border-accent-cyan focus:[box-shadow:var(--color-input-shadow-focus)]",
        COLOR[priority],
      ].join(" ")}
      aria-label="Changer la priorité"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
