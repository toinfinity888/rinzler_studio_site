/**
 * T060 — Deepgram browser bridge.
 *
 * Opens a WebSocket from the BROWSER directly to Deepgram's EU endpoint
 * using a short-lived session token issued by `app/api/transcribe/session`.
 * No audio passes through our server (FR-013, R3).
 *
 * This module is browser-only — never imported from a server module.
 */

export interface DeepgramSessionConfig {
  apiKey: string;
  expiresAtMs: number;
  region: string;
  streamingOptions: {
    encoding: "linear16" | "opus";
    sample_rate?: number;
    language: string;
    model: string;
    keep_audio: false;
    interim_results: boolean;
  };
}

export interface DeepgramBridge {
  /** Start microphone capture + open the WebSocket. */
  start: () => Promise<void>;
  /** Stop capture + close the WebSocket. */
  stop: () => Promise<string>;
  /** Listen for partial transcripts. */
  onPartial: (cb: (text: string) => void) => void;
  /** Listen for the final transcript when stop() resolves. */
  onFinal: (cb: (text: string) => void) => void;
  /** Listen for transport / permission errors. */
  onError: (cb: (err: Error) => void) => void;
  /** True iff stop() has been called. */
  isStopped: () => boolean;
}

/**
 * Build a bridge object. The caller invokes `start()` to begin recording.
 * The bridge holds no audio buffers; PCM frames are sent directly to
 * Deepgram and discarded after `socket.send`.
 *
 * Browser support: requires Web Audio + MediaStream APIs (every modern
 * browser). The Web Speech API fallback is NOT implemented here — that is
 * a feature-flag rollout (see T060 follow-up). When the websocket open
 * fails, the bridge surfaces an error and the UI should offer a text-only
 * fallback.
 */
export function createDeepgramBridge(
  config: DeepgramSessionConfig,
): DeepgramBridge {
  let socket: WebSocket | null = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let processor: ScriptProcessorNode | null = null;
  let stopped = false;
  let aggregated = "";

  const partials: Array<(s: string) => void> = [];
  const finals: Array<(s: string) => void> = [];
  const errors: Array<(e: Error) => void> = [];

  function emitError(err: Error) {
    for (const fn of errors) fn(err);
  }

  async function start() {
    try {
      // Build the URL with the session token + streaming options.
      const params = new URLSearchParams();
      params.set("encoding", config.streamingOptions.encoding);
      if (config.streamingOptions.sample_rate) {
        params.set("sample_rate", String(config.streamingOptions.sample_rate));
      }
      params.set("language", config.streamingOptions.language);
      params.set("model", config.streamingOptions.model);
      params.set("interim_results", String(config.streamingOptions.interim_results));
      params.set("keep_audio", "false");
      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

      socket = new WebSocket(wsUrl, ["token", config.apiKey]);
      socket.binaryType = "arraybuffer";

      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data as string);
          const t = data?.channel?.alternatives?.[0]?.transcript;
          const isFinal = data?.is_final === true;
          if (typeof t === "string" && t.length > 0) {
            if (isFinal) {
              aggregated = aggregated.length > 0 ? `${aggregated} ${t}` : t;
              for (const fn of finals) fn(aggregated);
            } else {
              for (const fn of partials) fn(t);
            }
          }
        } catch {
          /* non-JSON status frame; ignore */
        }
      };
      socket.onerror = () => emitError(new Error("Deepgram websocket error."));

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx: any = window.AudioContext ?? (window as any).webkitAudioContext;
      audioContext = new Ctx({ sampleRate: 16_000 });
      const ctxInstance = audioContext as AudioContext;
      const source = ctxInstance.createMediaStreamSource(mediaStream);
      processor = ctxInstance.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const channelData = e.inputBuffer.getChannelData(0);
        // Convert float32 [-1..1] → int16 PCM.
        const pcm = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          const s = Math.max(-1, Math.min(1, channelData[i] ?? 0));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        socket.send(pcm.buffer);
      };
      source.connect(processor);
      processor.connect(ctxInstance.destination);
    } catch (err) {
      emitError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async function stop(): Promise<string> {
    stopped = true;
    try {
      processor?.disconnect();
      mediaStream?.getTracks().forEach((t) => t.stop());
      await audioContext?.close();
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Send Deepgram's close-stream sentinel + half-close.
        try {
          socket.send(JSON.stringify({ type: "CloseStream" }));
        } catch {
          /* socket may have closed in the meantime */
        }
        socket.close();
      }
    } catch (err) {
      emitError(err instanceof Error ? err : new Error(String(err)));
    }
    return aggregated;
  }

  return {
    start,
    stop,
    onPartial: (cb) => partials.push(cb),
    onFinal: (cb) => finals.push(cb),
    onError: (cb) => errors.push(cb),
    isStopped: () => stopped,
  };
}
