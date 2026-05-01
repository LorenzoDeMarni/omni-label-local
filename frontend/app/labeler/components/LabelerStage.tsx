import type React from "react";
import { Split, SPLITS } from "../types";

type Props = {
  selectedClassIndex: number;
  selectedClassName: string;
  currentFilename: string | null;
  progressCompact: string;
  progressFull: string;
  progressPct: number;
  filenamesLength: number;
  goPrev: () => void;
  goNext: () => void;
  split: Split;
  setSplit: (split: Split) => void;
  splitCounts: Record<Split, number>;
  inProgressBoxColor: string;
  setInProgressBoxColor: (value: string) => void;
  crosshairLineColor: string;
  setCrosshairLineColor: (value: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasSize: { w: number; h: number };
  handleMouseDown: React.MouseEventHandler<HTMLCanvasElement>;
  handleMouseMove: React.MouseEventHandler<HTMLCanvasElement>;
  handleMouseUp: React.MouseEventHandler<HTMLCanvasElement>;
  handleWheel: React.WheelEventHandler<HTMLCanvasElement>;
  handleMouseLeave: React.MouseEventHandler<HTMLCanvasElement>;
  crosshairImagePoint: { x: number; y: number } | null;
  currentDatasetRoot: string | null;
  datasetError: string | null;
  saveError: string | null;
};

export function LabelerStage({
  selectedClassIndex,
  selectedClassName,
  currentFilename,
  progressCompact,
  progressFull,
  progressPct,
  filenamesLength,
  goPrev,
  goNext,
  split,
  setSplit,
  splitCounts,
  inProgressBoxColor,
  setInProgressBoxColor,
  crosshairLineColor,
  setCrosshairLineColor,
  canvasRef,
  containerRef,
  canvasSize,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleWheel,
  handleMouseLeave,
  crosshairImagePoint,
  currentDatasetRoot,
  datasetError,
  saveError
}: Props) {
  return (
    <section className="tool-stage">
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="tool-statbar">
        <div className="tool-statbar__meta">
          {/* Split tabs */}
          <div className="labeler-split-tabs">
            {SPLITS.map((s) => (
              <button
                key={s}
                type="button"
                className={`labeler-split-tab${split === s ? " labeler-split-tab--active" : ""}`}
                onClick={() => setSplit(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="labeler-split-tab__count">{splitCounts[s]}</span>
              </button>
            ))}
          </div>

          {/* Navigation row */}
          <div className="labeler-nav-row">
            <button
              type="button"
              className="labeler-nav-btn"
              onClick={goPrev}
              disabled={filenamesLength === 0}
              title="Previous image (A)"
            >
              ◀
            </button>
            <div className="labeler-nav-info">
              <span className="labeler-nav-filename" title={currentFilename ?? "No images loaded"}>
                {currentFilename ?? "No images loaded"}
              </span>
              <span className="labeler-nav-progress" title={progressFull}>
                {progressCompact}
              </span>
            </div>
            <button
              type="button"
              className="labeler-nav-btn"
              onClick={goNext}
              disabled={filenamesLength === 0}
              title="Next image (D)"
            >
              ▶
            </button>
          </div>

          {/* Progress bar */}
          <div className="tool-progress" title={progressFull}>
            <div className="tool-progress__fill" style={{ width: `${progressPct.toFixed(2)}%` }} />
          </div>

          {/* Class pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-pill">Class {selectedClassIndex}</span>
            <strong style={{ fontSize: 14 }}>{selectedClassName}</strong>
          </div>
        </div>

        <div className="tool-statbar__controls">
          <label className="tool-color-control">
            <span className="small">Box color</span>
            <input type="color" value={inProgressBoxColor} onChange={(e) => setInProgressBoxColor(e.target.value)} />
          </label>
          <label className="tool-color-control">
            <span className="small">Crosshair</span>
            <input type="color" value={crosshairLineColor} onChange={(e) => setCrosshairLineColor(e.target.value)} />
          </label>
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────── */}
      <div className="tool-canvas-card">
        <div className="tool-canvas-wrap" ref={containerRef}>
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onMouseLeave={handleMouseLeave}
            style={{
              cursor: "none",
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
              touchAction: "none"
            }}
          />
        </div>
        <div className="tool-meta-grid">
          <div>
            <p className="small">Crosshair X</p>
            <strong>{crosshairImagePoint ? Math.round(crosshairImagePoint.x) : "--"}</strong>
          </div>
          <div>
            <p className="small">Crosshair Y</p>
            <strong>{crosshairImagePoint ? Math.round(crosshairImagePoint.y) : "--"}</strong>
          </div>
          <div>
            <p className="small">Dataset root</p>
            <strong title={currentDatasetRoot ?? "Not set"}>{currentDatasetRoot ?? "Not set"}</strong>
          </div>
        </div>
      </div>

      {datasetError && <p className="error">{datasetError}</p>}
      {saveError && <p className="error">Save failed: {saveError}</p>}
    </section>
  );
}
