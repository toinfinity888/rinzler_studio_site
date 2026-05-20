"use client";

import * as React from "react";
import { useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { publishConsultantReport } from "@/lib/consultant/publish";

/**
 * Publish button (T091/T090) — triggers `publishConsultantReport`, then
 * shows the resulting snapshot id (or the strip-failure error). Client
 * island because the action must run from a user gesture.
 */
export function PublishButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function publish() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await publishConsultantReport(projectId);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMessage(
        `Snapshot publié (status=${result.status}, id=${result.snapshotId.slice(0, 8)}…).`,
      );
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={publish} disabled={pending}>
        {pending ? "Publication…" : "Publier (consultant_finalized)"}
      </Button>
      {message ? (
        <p role="status" className="text-xs text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
