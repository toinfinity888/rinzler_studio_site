"use client";

import * as React from "react";

import {
  createDeepgramBridge,
  type DeepgramSessionConfig,
  type DeepgramBridge,
} from "@/lib/transcribe/client-bridge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { trackEvent } from "@/lib/analytics/events";
import type { FieldProps } from "./types";

type Phase = "idle" | "requesting_session" | "recording" | "review" | "error";

interface SessionResponse {
  provider: "deepgram_eu";
  session_token: string;
  websocket_url: string;
  expires_at: string;
  fallback_provider: "webspeech" | null;
  /** Streaming options the bridge needs to open the socket. */
  streaming_options: DeepgramSessionConfig["streamingOptions"];
}

export interface VoiceCaptureProps extends FieldProps {
  /** The tokenized client path token. Required to fetch a session. */
  token: string;
}

/**
 * VoiceCapture — T061.
 *
 * The hotelier records a voice answer. The recording flows BROWSER →
 * DEEPGRAM directly; this component never holds a buffer of the raw audio.
 * Only the post-edit transcript is surfaced + committed.
 *
 * NO raw audio is persisted anywhere (FR-013, R3). NO Claude call is made
 * in this task set — the structured-extraction worker (T062) is deferred
 * pending Bedrock model-access form approval, so the user sees only the
 * transcript editor at this point.
 */
export function VoiceCapture(props: VoiceCaptureProps) {
  const { question, value, onChange, iDontKnow, readOnly, token } = props;
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [partial, setPartial] = React.useState("");
  const [transcript, setTranscript] = React.useState(
    typeof value === "string" ? value : "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const bridgeRef = React.useRef<DeepgramBridge | null>(null);
  const recordingStartedAt = React.useRef<number>(0);

  const maxSeconds = question.definition.maxDurationSeconds ?? 120;

  React.useEffect(() => {
    return () => {
      // Best-effort cleanup if the component unmounts mid-recording.
      void bridgeRef.current?.stop();
    };
  }, []);

  async function startRecording() {
    if (readOnly) return;
    setError(null);
    setPhase("requesting_session");
    try {
      const res = await fetch("/api/transcribe/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Session refused: ${res.status} ${text}`);
      }
      const session = (await res.json()) as SessionResponse;
      const config: DeepgramSessionConfig = {
        apiKey: session.session_token,
        expiresAtMs: Date.parse(session.expires_at),
        region: "eu",
        streamingOptions: session.streaming_options,
      };
      const bridge = createDeepgramBridge(config);
      bridgeRef.current = bridge;
      bridge.onPartial((t) => setPartial(t));
      bridge.onFinal((t) => {
        setTranscript(t);
        setPartial("");
      });
      bridge.onError((e) => {
        setError(e.message);
        setPhase("error");
      });
      await bridge.start();
      recordingStartedAt.current = Date.now();
      setPhase("recording");
      trackEvent("audit_voice_used", { question_slug: question.slug });

      // Hard cap.
      setTimeout(
        () => {
          if (bridgeRef.current && !bridgeRef.current.isStopped()) {
            void stopRecording();
          }
        },
        maxSeconds * 1000,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function stopRecording() {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    const final = await bridge.stop();
    if (final) setTranscript(final);
    setPartial("");
    setPhase("review");
  }

  function commitTranscript() {
    onChange(transcript.trim());
  }

  function discard() {
    setTranscript("");
    setPartial("");
    setPhase("idle");
    onChange("");
  }

  if (iDontKnow) {
    return (
      <p className="text-sm text-text-muted">
        Réponse marquée &laquo;&nbsp;je ne sais pas&nbsp;&raquo; — la dictée vocale est désactivée.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {phase === "idle" || phase === "error" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={startRecording} disabled={readOnly} size="sm">
            ◉ Dicter ma réponse
          </Button>
          <span className="text-xs text-text-muted">
            Audio envoyé directement à Deepgram (EU). Aucun audio n&apos;est conservé.
          </span>
        </div>
      ) : null}

      {phase === "requesting_session" ? (
        <p className="text-sm text-text-muted">Connexion au service de transcription…</p>
      ) : null}

      {phase === "recording" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-error animate-pulse" aria-hidden />
            <span className="text-sm text-text-primary">Enregistrement en cours…</span>
            <Button onClick={stopRecording} size="sm" variant="secondary">
              ■ Arrêter
            </Button>
          </div>
          <div className="rounded-md px-3 py-2 text-sm [background:var(--color-input-bg)] [border:1px_dashed_var(--color-input-border)] min-h-[3em] text-text-secondary">
            {partial || transcript || "…"}
          </div>
        </div>
      ) : null}

      {phase === "review" || (phase === "idle" && transcript) ? (
        <div className="space-y-2">
          <label
            htmlFor={`q-${question.slug}-transcript`}
            className="block text-sm font-medium text-text-primary"
          >
            Relisez et corrigez la transcription avant de valider :
          </label>
          <Textarea
            id={`q-${question.slug}-transcript`}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={readOnly}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={commitTranscript} disabled={readOnly} size="sm">
              ✓ Utiliser cette réponse
            </Button>
            <Button
              onClick={() => {
                discard();
                void startRecording();
              }}
              disabled={readOnly}
              size="sm"
              variant="outline"
            >
              ↻ Réenregistrer
            </Button>
            <Button onClick={discard} disabled={readOnly} size="sm" variant="ghost">
              ✕ Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-error">Transcription indisponible : {error}</p> : null}
    </div>
  );
}
