"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { trackEvent } from "@/lib/analytics/events";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 60; // 3 minutes hard cap on the client side

interface StatusPayload {
  scan_id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "blocked";
  progress_hint?: number;
}

export function ScanStatusPoller({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [hint, setHint] = React.useState<number>(0.1);
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    let polls = 0;
    let cancelled = false;
    const id = setInterval(async () => {
      polls += 1;
      if (polls > MAX_POLLS || cancelled || completedRef.current) {
        clearInterval(id);
        return;
      }
      try {
        const res = await fetch(`/api/scan/${encodeURIComponent(scanId)}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as StatusPayload;
        if (payload.progress_hint != null) setHint(payload.progress_hint);
        if (
          payload.status === "succeeded" ||
          payload.status === "failed" ||
          payload.status === "blocked"
        ) {
          completedRef.current = true;
          trackEvent("scan_completed", { status: payload.status });
          // Refresh the RSC tree so the server component re-fetches result.
          router.refresh();
          clearInterval(id);
        }
      } catch {
        // Silent — the next tick will retry.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [scanId, router]);

  React.useEffect(() => {
    trackEvent("scan_completed_viewed");
  }, []);

  const pct = Math.max(5, Math.min(95, Math.round(hint * 100)));
  return (
    <div className="mt-4">
      <div
        className="h-1.5 rounded-sm bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="h-full bg-accent-cyan transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-text-muted">{pct}%</p>
    </div>
  );
}
