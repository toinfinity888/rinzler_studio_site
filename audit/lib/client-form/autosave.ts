"use client";

import * as React from "react";

export type AutosaveState = "idle" | "saving" | "saved" | "offline";

export interface UseAutosaveOptions<T> {
  /** Token used to scope localStorage retry queue keys. */
  token: string;
  /** Server action that persists a partial payload; returns updatedAt on success. */
  save: (partial: Record<string, unknown>, expectedUpdatedAt: number | undefined) => Promise<{
    ok: true;
    updatedAt: number;
    completionPct: number;
  } | { ok: false; reason: string; invalid?: { fieldId: string; reason: string }[] }>;
  debounceMs?: number;
  initialUpdatedAt?: number;
}

export interface UseAutosaveResult<T> {
  state: AutosaveState;
  enqueue: (partial: Record<string, unknown>) => void;
  flushNow: () => Promise<void>;
  completionPct: number | null;
  lastUpdatedAt: number | null;
  staleConflict: boolean;
  resetStaleConflict: () => void;
}

/**
 * Debounced server-side autosave with localStorage retry queue and
 * `beforeunload` flush (R5, T074, T076).
 */
export function useAutosave<T>(opts: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const debounceMs = opts.debounceMs ?? 1500;
  const queueKey = `audit:autosave:queue:${opts.token}`;
  const [state, setState] = React.useState<AutosaveState>("idle");
  const [completionPct, setCompletionPct] = React.useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<number | null>(opts.initialUpdatedAt ?? null);
  const [staleConflict, setStaleConflict] = React.useState(false);
  const pendingRef = React.useRef<Record<string, unknown>>({});
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = React.useRef(false);

  // Hydrate any leftover queued payload on mount.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(queueKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        pendingRef.current = { ...parsed, ...pendingRef.current };
        scheduleFlush(0);
      } catch {
        window.localStorage.removeItem(queueKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueKey]);

  const persistQueue = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (Object.keys(pendingRef.current).length === 0) {
      window.localStorage.removeItem(queueKey);
    } else {
      window.localStorage.setItem(queueKey, JSON.stringify(pendingRef.current));
    }
  }, [queueKey]);

  const flush = React.useCallback(async () => {
    if (flushingRef.current) return;
    if (Object.keys(pendingRef.current).length === 0) return;
    flushingRef.current = true;
    setState("saving");
    const payload = pendingRef.current;
    pendingRef.current = {};
    persistQueue();
    try {
      const expected = lastUpdatedAt ?? undefined;
      const result = await opts.save(payload, expected);
      if (result.ok) {
        setLastUpdatedAt(result.updatedAt);
        setCompletionPct(result.completionPct);
        setState("saved");
      } else if (result.reason === "stale") {
        setStaleConflict(true);
        setState("idle");
      } else if (result.reason === "rate_limited" || result.reason === "revoked") {
        // Re-queue for retry; revoked won't recover but at least we don't lose user input.
        pendingRef.current = { ...payload, ...pendingRef.current };
        persistQueue();
        setState("offline");
      } else {
        // invalid: drop the failing fields silently (server already filtered),
        // surface "saved" because server persisted what it could.
        setState("saved");
      }
    } catch {
      // Network or unexpected error — re-queue.
      pendingRef.current = { ...payload, ...pendingRef.current };
      persistQueue();
      setState("offline");
    } finally {
      flushingRef.current = false;
    }
  }, [lastUpdatedAt, opts, persistQueue]);

  const scheduleFlush = React.useCallback(
    (delayMs: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    [flush],
  );

  const enqueue = React.useCallback(
    (partial: Record<string, unknown>) => {
      pendingRef.current = { ...pendingRef.current, ...partial };
      persistQueue();
      setState("saving");
      scheduleFlush(debounceMs);
    },
    [debounceMs, persistQueue, scheduleFlush],
  );

  const flushNow = React.useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
  }, [flush]);

  // beforeunload flush (T076): synchronous best-effort persist to localStorage,
  // then attempt a normal flush (the browser may not finish it but the queue
  // will be replayed on next mount).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      persistQueue();
      void flush();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flush, persistQueue]);

  // Periodic offline retry: every 10s while offline, attempt to flush.
  React.useEffect(() => {
    if (state !== "offline") return;
    const id = setInterval(() => {
      if (Object.keys(pendingRef.current).length > 0) void flush();
    }, 10_000);
    return () => clearInterval(id);
  }, [state, flush]);

  return {
    state,
    enqueue,
    flushNow,
    completionPct,
    lastUpdatedAt,
    staleConflict,
    resetStaleConflict: () => setStaleConflict(false),
  };
}
