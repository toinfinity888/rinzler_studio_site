"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  revokeProjectToken,
  reopenProject,
  markOngoingEngagement,
  deleteProject,
} from "@/app/admin/projects/actions";

export interface ProjectActionsPanelProps {
  projectId: string;
  label: string;
  status: string;
  ongoingEngagement: boolean;
  tokenRevoked: boolean;
}

export function ProjectActionsPanel({
  projectId,
  label,
  status,
  ongoingEngagement,
  tokenRevoked,
}: ProjectActionsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = React.useState(false);
  const [confirmLabel, setConfirmLabel] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function call(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="space-y-3 text-sm">
      {status === "submitted" || status === "purged" ? null : (
        <a
          href={`/admin/projects/${projectId}/export`}
          className="block w-full text-center rounded-sm px-4 py-2 min-h-9 glass hover:[background:rgba(255,255,255,0.14)]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Exporter JSON
        </a>
      )}
      {status === "submitted" ? (
        <>
          <a
            href={`/admin/projects/${projectId}/export`}
            className="block w-full text-center rounded-sm px-4 py-2 min-h-9 glass hover:[background:rgba(255,255,255,0.14)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Exporter JSON
          </a>
          <a
            href={`/admin/projects/${projectId}/report`}
            className="block w-full text-center rounded-sm px-4 py-2 min-h-9 [background:var(--color-bg-tertiary)] hover:[background:rgba(255,255,255,0.04)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vue rapport (impression)
          </a>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => call(() => reopenProject(projectId))}
            className="w-full"
          >
            Réouvrir pour le client
          </Button>
        </>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => call(() => markOngoingEngagement(projectId, !ongoingEngagement))}
        className="w-full"
      >
        {ongoingEngagement ? "Désactiver « engagement actif »" : "Marquer engagement actif"}
      </Button>

      {!tokenRevoked && status !== "purged" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm("Révoquer ce lien client ? Le client ne pourra plus accéder à l'audit."))
              call(() => revokeProjectToken(projectId));
          }}
          className="w-full"
        >
          Révoquer le lien
        </Button>
      ) : (
        <p className="text-xs text-warning">Lien révoqué.</p>
      )}

      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setShowDelete((v) => !v)}
        className="w-full !text-error"
      >
        Supprimer le projet…
      </Button>
      {showDelete ? (
        <div className="space-y-2 rounded-md p-3 [background:rgba(255,77,77,0.06)] [border:1px_solid_rgba(255,77,77,0.3)]">
          <p className="text-xs text-error">
            Cette action est irréversible. Pour confirmer, retapez exactement le nom du projet :
            <strong className="ml-1">{label}</strong>
          </p>
          <input
            type="text"
            value={confirmLabel}
            onChange={(e) => setConfirmLabel(e.target.value)}
            className="w-full rounded-sm px-3 py-2 [background:var(--color-bg-secondary)] [border:1px_solid_var(--color-bg-tertiary)] focus:outline-none focus:border-error text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || confirmLabel !== label}
              onClick={() =>
                call(async () => {
                  await deleteProject(projectId, confirmLabel);
                  router.push("/admin/projects");
                })
              }
              className="!text-error"
            >
              Supprimer définitivement
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
