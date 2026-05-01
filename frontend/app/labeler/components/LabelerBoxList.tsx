"use client";

import { useMemo } from "react";
import type { Box } from "../types";

type ImageRect = { x1: number; y1: number; x2: number; y2: number };

type LabelerBoxListProps = {
  boxes: Box[];
  classes: string[];
  selectedBoxIndex: number | null;
  onSelectBox: (index: number) => void;
  onHoverBox: (index: number | null) => void;
  yoloToImageRect: (box: Box) => ImageRect;
};

export function LabelerBoxList({
  boxes,
  classes,
  selectedBoxIndex,
  onSelectBox,
  onHoverBox,
  yoloToImageRect
}: LabelerBoxListProps) {
  const items = useMemo(
    () =>
      boxes.map((b, i) => {
        const r = yoloToImageRect(b);
        return (
          <button
            key={i}
            type="button"
            className={`tool-list__item ${selectedBoxIndex === i ? "tool-list__item--active" : ""}`}
            onClick={() => onSelectBox(i)}
            onMouseEnter={() => onHoverBox(i)}
            onMouseLeave={() => onHoverBox(null)}
            style={{ width: "100%" }}
          >
            <div className="tool-list__item-text">
              <strong>{classes[b.class_id] ?? b.class_id}</strong>
              <p className="small">
                Box {i + 1} | x1:{Math.round(r.x1)} y1:{Math.round(r.y1)} x2:{Math.round(r.x2)} y2:{Math.round(r.y2)}
              </p>
            </div>
          </button>
        );
      }),
    [boxes, classes, onHoverBox, onSelectBox, selectedBoxIndex, yoloToImageRect]
  );
  return <>{items}</>;
}
