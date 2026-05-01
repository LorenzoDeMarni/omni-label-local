"use client";

import { Suspense } from "react";
import { LabelerRouteShell, LabelerSuspenseFallback } from "./LabelerRouteShell";

export default function LabelerPage() {
  return (
    <Suspense fallback={<LabelerSuspenseFallback />}>
      <LabelerRouteShell />
    </Suspense>
  );
}
