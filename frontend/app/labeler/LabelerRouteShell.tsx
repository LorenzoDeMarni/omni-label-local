"use client";

import { LabelerCanvas } from "./LabelerCanvas";

export function LabelerSuspenseFallback() {
  return (
    <main className="tool-shell">
      <div style={{ padding: 48 }}>
        <p className="eyebrow">Labeler</p>
        <h1>Loading…</h1>
      </div>
    </main>
  );
}

export function LabelerRouteShell() {
  return <LabelerCanvas />;
}
