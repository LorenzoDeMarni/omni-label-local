"use client";

import type { ProjectBanner } from "../types";

export function LabelerProjectBanner({ banner }: { banner: ProjectBanner }) {
  return (
    <div className="surface-panel" style={{ margin: "0 24px 12px", padding: "12px 16px" }}>
      <p className="small">
        Opened from project <strong>{banner.name}</strong>
        {banner.datasetRoot ? (
          <> · Labeler path matches the project&apos;s dataset binding.</>
        ) : (
          <> · No dataset path on this project; using the global labeler path.</>
        )}
      </p>
    </div>
  );
}
