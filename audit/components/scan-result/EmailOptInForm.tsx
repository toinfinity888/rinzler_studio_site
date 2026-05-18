"use client";

import * as React from "react";

import { optInToEmail } from "@/lib/scanner/email-opt-in";
import { trackEvent } from "@/lib/analytics/events";

export interface EmailOptInFormProps {
  scanId: string;
}

type Status = "idle" | "submitting" | "ok" | "error";

export function EmailOptInForm({ scanId }: EmailOptInFormProps) {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) {
      setError("Cochez la case pour confirmer le consentement.");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const res = await optInToEmail(scanId, email, consent);
      if (!res.ok) {
        setStatus("error");
        setError(
          res.reason === "invalid_email"
            ? "Adresse email invalide."
            : "Impossible d'enregistrer l'email pour le moment.",
        );
        return;
      }
      setStatus("ok");
      trackEvent("scan_email_opt_in");
    } catch {
      setStatus("error");
      setError("Une erreur réseau est survenue.");
    }
  }

  if (status === "ok") {
    return (
      <div className="glass rounded-md p-5">
        <h3 className="text-base font-semibold">Merci.</h3>
        <p className="mt-1.5 text-sm text-text-secondary">
          Nous vous enverrons un rappel avec une version PDF de ce diagnostic.
          Vous pouvez fermer cette page : le lien actuel reste valable.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass rounded-md p-5 grid gap-3"
      aria-label="Recevoir une copie du diagnostic par email (optionnel)"
    >
      <header>
        <h3 className="text-base font-semibold">Recevoir une copie par email (optionnel)</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Cette étape n'est pas nécessaire pour voir votre diagnostic — il est
          déjà affiché. Saisissez votre email seulement si vous souhaitez
          recevoir une copie PDF.
        </p>
      </header>
      <label className="grid gap-1.5 text-sm">
        <span className="text-text-secondary">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent border border-white/15 rounded-sm px-3 py-2 focus:outline-none focus:border-accent-cyan"
          placeholder="vous@hotel.com"
        />
      </label>
      <label className="grid grid-cols-[auto_1fr] gap-2 text-sm text-text-secondary items-start">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          J'accepte que Rinzler Studio m'envoie une copie de ce diagnostic et
          un message de suivi unique. Mon email ne sera pas partagé avec un
          tiers.
        </span>
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="glass min-h-11 px-6 py-3 rounded-sm font-medium hover:[background:rgba(255,255,255,0.14)] disabled:opacity-60"
      >
        {status === "submitting" ? "Envoi…" : "Recevoir une copie"}
      </button>
    </form>
  );
}
