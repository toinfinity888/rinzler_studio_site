import * as React from "react";

/**
 * Layout shell for the consultant workspace (T091).
 *
 * Two-pane responsive layout: left = scan + answers (read), right =
 * recommendation reasoning + override controls + private notes. The
 * left pane is the "what the client said" view; the right pane is the
 * "what we're going to do with it" view. Both are server-rendered.
 *
 * The shell deliberately keeps zero client-side state — interactivity
 * lives in the smaller leaf components (OverrideControl, InternalNotePane,
 * ScenarioSideBySide) that are explicitly `"use client"`.
 */
export function WorkspaceOverlay({
  header,
  left,
  right,
}: {
  header?: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {header ? <div>{header}</div> : null}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
        <aside className="space-y-4">{left}</aside>
        <section className="space-y-4">{right}</section>
      </div>
    </div>
  );
}
