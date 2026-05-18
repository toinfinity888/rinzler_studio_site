"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { trackEvent } from "@/lib/analytics/events";

type Status = "idle" | "submitting" | "error";

export function ScanStartForm() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Impossible de lancer le scan pour le moment.",
        );
        return;
      }
      trackEvent("scan_started");
      router.push(`/scan/${data.scan_id}`);
    } catch {
      setStatus("error");
      setError("Une erreur réseau est survenue. Réessayez.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass rounded-md p-5 grid gap-3 sm:grid-cols-[1fr_auto]"
      aria-label="Lancer un diagnostic gratuit"
    >
      <input
        type="url"
        inputMode="url"
        required
        placeholder="https://votre-hotel.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="bg-transparent border border-white/15 rounded-sm px-4 py-3 text-base focus:outline-none focus:border-accent-cyan"
        aria-label="URL de votre hôtel"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="glass min-h-11 px-6 py-3 rounded-sm font-medium hover:[background:rgba(255,255,255,0.14)] disabled:opacity-60"
      >
        {status === "submitting" ? "Démarrage…" : "Lancer le diagnostic"}
      </button>
      {error ? (
        <p className="sm:col-span-2 text-sm text-rose-400">{error}</p>
      ) : (
        <p className="sm:col-span-2 text-xs text-text-muted">
          Gratuit, sans inscription, environ 60 secondes. Aucun cookie publicitaire.
        </p>
      )}
    </form>
  );
}
