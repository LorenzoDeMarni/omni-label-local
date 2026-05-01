import { useCallback, useEffect, useRef, useState } from "react";

import type { Box } from "../types";

type Params = {
  imageSize: { w: number; h: number } | null;
  canvasSize: { w: number; h: number };
  scale: number;
  offset: { x: number; y: number };
  classes: string[];
  boxes: Box[];
  setBoxes: React.Dispatch<React.SetStateAction<Box[]>>;
  boxesRef: React.MutableRefObject<Box[]>;
  boxesStemRef: React.MutableRefObject<string | null>;
  currentStem: string | null;
  selectedClassIndex: number;
  selectedBoxIndex: number | null;
  setSelectedBoxIndex: React.Dispatch<React.SetStateAction<number | null>>;
  inProgressBoxColor: string;
  crosshairLineColor: string;
  resizeMode: boolean;
  setResizeMode: React.Dispatch<React.SetStateAction<boolean>>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  imageBufferRef: React.MutableRefObject<HTMLCanvasElement | null>;
  bufferBuildTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pushUndoSnapshot: (snapshot: Box[]) => void;
  redoStackRef: React.MutableRefObject<Box[][]>;
};

const BOX_LABEL_FONT =
  "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, 'Courier New', monospace";

export function useLabelerInteraction({
  imageSize,
  canvasSize,
  scale,
  offset,
  classes,
  boxes,
  setBoxes,
  boxesRef,
  boxesStemRef,
  currentStem,
  selectedClassIndex,
  selectedBoxIndex,
  setSelectedBoxIndex,
  inProgressBoxColor,
  crosshairLineColor,
  resizeMode,
  setResizeMode,
  canvasRef,
  imageRef,
  imageBufferRef,
  bufferBuildTimerRef,
  pushUndoSnapshot,
  redoStackRef
}: Params) {
  const [crosshairReadout, setCrosshairReadout] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [draggingBox, setDraggingBox] = useState<{
    idx: number;
    startMouse: { x: number; y: number };
    startBox: Box;
  } | null>(null);
  const [resizingBox, setResizingBox] = useState<{
    idx: number;
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    startRect: { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);

  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  const hoverBoxIndexRef = useRef<number | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const drawCanvasRef = useRef<() => void>(() => {});
  const hoverTsRef = useRef(0);
  const crosshairReadoutTsRef = useRef(0);
  const crosshairRoundedRef = useRef<{ x: number; y: number } | null>(null);

  const scheduleDraw = useCallback(() => {
    if (drawRafRef.current !== null) return;
    drawRafRef.current = window.requestAnimationFrame(() => {
      drawRafRef.current = null;
      drawCanvasRef.current();
    });
  }, []);

  useEffect(() => {
    if (!resizeMode) setResizingBox(null);
  }, [resizeMode]);

  const canvasToImage = useCallback(
    (cx: number, cy: number): { x: number; y: number } | null => {
      if (!imageSize) return null;
      const x = (cx - offset.x) / scale;
      const y = (cy - offset.y) / scale;
      if (x < 0 || y < 0 || x > imageSize.w || y > imageSize.h) return null;
      return { x, y };
    },
    [imageSize, offset, scale]
  );

  const canvasToImageClamped = useCallback(
    (cx: number, cy: number): { x: number; y: number } | null => {
      if (!imageSize) return null;
      const x = (cx - offset.x) / scale;
      const y = (cy - offset.y) / scale;
      return { x: Math.max(0, Math.min(imageSize.w, x)), y: Math.max(0, Math.min(imageSize.h, y)) };
    },
    [imageSize, offset, scale]
  );

  const imageRectToYolo = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      if (!imageSize) return { x_center: 0, y_center: 0, width: 0, height: 0 };
      const xMin = Math.max(0, Math.min(x1, x2));
      const xMax = Math.min(imageSize.w, Math.max(x1, x2));
      const yMin = Math.max(0, Math.min(y1, y2));
      const yMax = Math.min(imageSize.h, Math.max(y1, y2));
      return {
        x_center: Math.max(0, Math.min(1, (xMin + xMax) / 2 / imageSize.w)),
        y_center: Math.max(0, Math.min(1, (yMin + yMax) / 2 / imageSize.h)),
        width: Math.max(0, Math.min(1, (xMax - xMin) / imageSize.w)),
        height: Math.max(0, Math.min(1, (yMax - yMin) / imageSize.h))
      };
    },
    [imageSize]
  );

  const yoloToCanvas = useCallback(
    (b: Box) => {
      if (!imageSize) return { cx: 0, cy: 0, cw: 0, ch: 0 };
      return {
        cx: b.x_center * imageSize.w * scale + offset.x,
        cy: b.y_center * imageSize.h * scale + offset.y,
        cw: b.width * imageSize.w * scale,
        ch: b.height * imageSize.h * scale
      };
    },
    [imageSize, scale, offset]
  );

  const yoloToImageRect = useCallback(
    (b: Box) => {
      if (!imageSize) return { x1: 0, y1: 0, x2: 0, y2: 0 };
      const cx = b.x_center * imageSize.w;
      const cy = b.y_center * imageSize.h;
      const w = b.width * imageSize.w;
      const h = b.height * imageSize.h;
      return {
        x1: Math.max(0, Math.min(imageSize.w, cx - w / 2)),
        y1: Math.max(0, Math.min(imageSize.h, cy - h / 2)),
        x2: Math.max(0, Math.min(imageSize.w, cx + w / 2)),
        y2: Math.max(0, Math.min(imageSize.h, cy + h / 2))
      };
    },
    [imageSize]
  );

  const getResizeHandle = useCallback(
    (px: number, py: number, idx: number): ("nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w") | null => {
      const b = boxesRef.current[idx];
      if (!b) return null;
      const { cx, cy, cw, ch } = yoloToCanvas(b);
      const left = cx - cw / 2;
      const top = cy - ch / 2;
      const right = cx + cw / 2;
      const bottom = cy + ch / 2;
      const mx = (left + right) / 2;
      const my = (top + bottom) / 2;
      const s = 8;
      const hit = (hx: number, hy: number) => Math.abs(px - hx) <= s && Math.abs(py - hy) <= s;
      if (hit(left, top)) return "nw";
      if (hit(mx, top)) return "n";
      if (hit(right, top)) return "ne";
      if (hit(right, my)) return "e";
      if (hit(right, bottom)) return "se";
      if (hit(mx, bottom)) return "s";
      if (hit(left, bottom)) return "sw";
      if (hit(left, my)) return "w";
      return null;
    },
    [boxesRef, yoloToCanvas]
  );

  const getLabelTagRect = useCallback(
    (left: number, top: number, label: string, ctx: CanvasRenderingContext2D) => {
      const padX = 6;
      const tagH = 16;
      ctx.font = BOX_LABEL_FONT;
      const textW = Math.ceil(ctx.measureText(label).width);
      const tagW = textW + padX * 2;
      let tagX = left;
      let tagY = top - tagH - 2;
      if (tagY < 0) tagY = top + 2;
      if (tagX + tagW > canvasSize.w) tagX = canvasSize.w - tagW;
      if (tagX < 0) tagX = 0;
      return { tagX, tagY, tagW, tagH };
    },
    [canvasSize.w]
  );

  const getHoveredBoxIndex = useCallback(
    (px: number, py: number): number | null => {
      if (!imageSize) return null;
      const tol = 5;
      for (let i = boxes.length - 1; i >= 0; i -= 1) {
        const b = boxes[i];
        const { cx, cy, cw, ch } = yoloToCanvas(b);
        const left = cx - cw / 2;
        const top = cy - ch / 2;
        const right = left + cw;
        const bottom = top + ch;
        const withinX = px >= left - tol && px <= right + tol;
        const withinY = py >= top - tol && py <= bottom + tol;
        const onVerticalEdge = withinY && (Math.abs(px - left) <= tol || Math.abs(px - right) <= tol);
        const onHorizontalEdge = withinX && (Math.abs(py - top) <= tol || Math.abs(py - bottom) <= tol);
        if ((onVerticalEdge || onHorizontalEdge) || (px >= left && px <= right && py >= top && py <= bottom)) return i;
      }
      return null;
    },
    [boxes, yoloToCanvas, imageSize]
  );

  const getClassColor = useCallback((classId: number): string => {
    const id = Math.max(0, classId);
    const hue = (id * 137.508) % 360;
    const sat = 68 + (id % 3) * 10;
    const light = 45 + (Math.floor(id / 3) % 3) * 8;
    return `hsl(${hue.toFixed(1)} ${sat}% ${light}%)`;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imageSize) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hoverIdx = getHoveredBoxIndex(x, y);
      if (hoverIdx !== null) {
        setSelectedBoxIndex(hoverIdx);
        if (resizeMode) {
          const handle = getResizeHandle(x, y, hoverIdx);
          if (handle) {
            const current = boxesRef.current;
            boxesStemRef.current = currentStem;
            pushUndoSnapshot([...current]);
            redoStackRef.current = [];
            setResizingBox({ idx: hoverIdx, handle, startRect: yoloToImageRect(current[hoverIdx]) });
          }
          return;
        }
        const pt = canvasToImageClamped(x, y);
        if (pt) {
          const current = boxesRef.current;
          boxesStemRef.current = currentStem;
          pushUndoSnapshot([...current]);
          redoStackRef.current = [];
          setDraggingBox({ idx: hoverIdx, startMouse: pt, startBox: { ...current[hoverIdx] } });
        }
        return;
      }
      setSelectedBoxIndex(null);
      const pt = canvasToImage(x, y);
      if (pt) setDragStart({ x: pt.x, y: pt.y });
    },
    [imageSize, canvasRef, getHoveredBoxIndex, resizeMode, getResizeHandle, boxesRef, boxesStemRef, currentStem, pushUndoSnapshot, redoStackRef, yoloToImageRect, canvasToImageClamped, setSelectedBoxIndex, canvasToImage]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      crosshairRef.current = { x, y };
      if (draggingBox !== null || resizingBox !== null) hoverBoxIndexRef.current = null;
      else if (dragStart !== null) {
        const pt = canvasToImageClamped(x, y);
        if (pt) setDragEnd(pt);
        hoverBoxIndexRef.current = null;
      } else if (now - hoverTsRef.current > 16) {
        hoverBoxIndexRef.current = getHoveredBoxIndex(x, y);
        hoverTsRef.current = now;
      }
      if (now - crosshairReadoutTsRef.current > 90) {
        const pt = canvasToImageClamped(x, y);
        if (!pt) {
          crosshairRoundedRef.current = null;
          setCrosshairReadout(null);
        } else {
          const rounded = { x: Math.round(pt.x), y: Math.round(pt.y) };
          const prev = crosshairRoundedRef.current;
          if (!prev || prev.x !== rounded.x || prev.y !== rounded.y) {
            crosshairRoundedRef.current = rounded;
            setCrosshairReadout(pt);
          }
        }
        crosshairReadoutTsRef.current = now;
      }
      scheduleDraw();
    },
    [canvasRef, draggingBox, resizingBox, dragStart, canvasToImageClamped, getHoveredBoxIndex, scheduleDraw]
  );

  const handleMouseLeave = useCallback(() => {
    crosshairRef.current = null;
    hoverBoxIndexRef.current = null;
    setCrosshairReadout(null);
    scheduleDraw();
  }, [scheduleDraw]);

  const handleMouseUp = useCallback(() => {
    if (dragStart && dragEnd && imageSize && classes.length > 0) {
      const { x_center, y_center, width, height } = imageRectToYolo(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
      if (width > 0 && height > 0) {
        boxesStemRef.current = currentStem;
        setBoxes((prev) => {
          pushUndoSnapshot([...prev]);
          redoStackRef.current = [];
          return [...prev, { class_id: selectedClassIndex, x_center, y_center, width, height }];
        });
      }
    }
    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, imageSize, classes.length, imageRectToYolo, boxesStemRef, currentStem, setBoxes, pushUndoSnapshot, redoStackRef, selectedClassIndex]);

  useEffect(() => {
    if (!dragStart && !draggingBox && !resizingBox) return;
    const onWindowMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      crosshairRef.current = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
      const pt = canvasToImageClamped(x, y);
      const now = performance.now();
      if (pt) {
        if (now - crosshairReadoutTsRef.current > 90) {
          const rounded = { x: Math.round(pt.x), y: Math.round(pt.y) };
          const prev = crosshairRoundedRef.current;
          if (!prev || prev.x !== rounded.x || prev.y !== rounded.y) {
            crosshairRoundedRef.current = rounded;
            setCrosshairReadout(pt);
          }
          crosshairReadoutTsRef.current = now;
        }
      } else {
        crosshairRoundedRef.current = null;
        setCrosshairReadout(null);
      }
      if (!pt) return;
      if (dragStart) {
        setDragEnd(pt);
      } else if (resizingBox && imageSize) {
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        const minSizePx = 4;
        let { x1, y1, x2, y2 } = resizingBox.startRect;
        const cx = pt.x;
        const cy = pt.y;
        if (["nw", "w", "sw"].includes(resizingBox.handle)) x1 = cx;
        if (["ne", "e", "se"].includes(resizingBox.handle)) x2 = cx;
        if (["nw", "n", "ne"].includes(resizingBox.handle)) y1 = cy;
        if (["sw", "s", "se"].includes(resizingBox.handle)) y2 = cy;
        x1 = clamp(x1, 0, imageSize.w); x2 = clamp(x2, 0, imageSize.w); y1 = clamp(y1, 0, imageSize.h); y2 = clamp(y2, 0, imageSize.h);
        if (x2 < x1) [x1, x2] = [x2, x1];
        if (y2 < y1) [y1, y2] = [y2, y1];
        if (x2 - x1 < minSizePx) { const mid = (x1 + x2) / 2; x1 = mid - minSizePx / 2; x2 = mid + minSizePx / 2; }
        if (y2 - y1 < minSizePx) { const mid = (y1 + y2) / 2; y1 = mid - minSizePx / 2; y2 = mid + minSizePx / 2; }
        x1 = clamp(x1, 0, imageSize.w); x2 = clamp(x2, 0, imageSize.w); y1 = clamp(y1, 0, imageSize.h); y2 = clamp(y2, 0, imageSize.h);
        const nextBox: Box = { ...boxesRef.current[resizingBox.idx], ...imageRectToYolo(x1, y1, x2, y2) };
        setBoxes((current) => {
          if (resizingBox.idx < 0 || resizingBox.idx >= current.length) return current;
          const existing = current[resizingBox.idx];
          if (
            Math.abs(existing.x_center - nextBox.x_center) < 0.00001 &&
            Math.abs(existing.y_center - nextBox.y_center) < 0.00001 &&
            Math.abs(existing.width - nextBox.width) < 0.00001 &&
            Math.abs(existing.height - nextBox.height) < 0.00001
          ) return current;
          const next = [...current];
          next[resizingBox.idx] = nextBox;
          return next;
        });
      } else if (draggingBox && imageSize) {
        const dx = pt.x - draggingBox.startMouse.x;
        const dy = pt.y - draggingBox.startMouse.y;
        const bwPx = draggingBox.startBox.width * imageSize.w;
        const bhPx = draggingBox.startBox.height * imageSize.h;
        const cxPx = draggingBox.startBox.x_center * imageSize.w + dx;
        const cyPx = draggingBox.startBox.y_center * imageSize.h + dy;
        const clampedCx = Math.max(bwPx / 2, Math.min(imageSize.w - bwPx / 2, cxPx));
        const clampedCy = Math.max(bhPx / 2, Math.min(imageSize.h - bhPx / 2, cyPx));
        const nextBox: Box = { ...draggingBox.startBox, x_center: clampedCx / imageSize.w, y_center: clampedCy / imageSize.h };
        setBoxes((current) => {
          if (draggingBox.idx < 0 || draggingBox.idx >= current.length) return current;
          const existing = current[draggingBox.idx];
          if (Math.abs(existing.x_center - nextBox.x_center) < 0.00001 && Math.abs(existing.y_center - nextBox.y_center) < 0.00001) return current;
          const next = [...current];
          next[draggingBox.idx] = nextBox;
          return next;
        });
      }
      scheduleDraw();
    };
    const onWindowMouseUp = () => {
      if (dragStart) handleMouseUp();
      if (draggingBox) setDraggingBox(null);
      if (resizingBox) setResizingBox(null);
      hoverBoxIndexRef.current = null;
      scheduleDraw();
    };
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [dragStart, draggingBox, resizingBox, imageSize, canvasToImageClamped, handleMouseUp, scheduleDraw, canvasRef, imageRectToYolo, boxesRef, setBoxes]);

  useEffect(() => {
    if (bufferBuildTimerRef.current) clearTimeout(bufferBuildTimerRef.current);
    if (!imageRef.current || !imageSize || !canvasSize.w || !canvasSize.h) return;
    bufferBuildTimerRef.current = setTimeout(() => {
      if (!imageRef.current) return;
      const buffer = document.createElement("canvas");
      buffer.width = canvasSize.w;
      buffer.height = canvasSize.h;
      const bctx = buffer.getContext("2d");
      if (!bctx) return;
      bctx.fillStyle = "#12121a";
      bctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      bctx.drawImage(imageRef.current, 0, 0, imageSize.w, imageSize.h, offset.x, offset.y, imageSize.w * scale, imageSize.h * scale);
      imageBufferRef.current = buffer;
      scheduleDraw();
    }, 48);
    return () => {
      if (bufferBuildTimerRef.current) clearTimeout(bufferBuildTimerRef.current);
    };
  }, [imageSize, canvasSize, offset, scale, scheduleDraw, imageRef, imageBufferRef, bufferBuildTimerRef]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.w || !canvasSize.h) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hoverBoxIndex = hoverBoxIndexRef.current;
    const crosshair = crosshairRef.current;
    ctx.fillStyle = "#12121a";
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
    if (imageBufferRef.current) ctx.drawImage(imageBufferRef.current, 0, 0);
    else if (imageRef.current && imageSize) ctx.drawImage(imageRef.current, 0, 0, imageSize.w, imageSize.h, offset.x, offset.y, imageSize.w * scale, imageSize.h * scale);
    boxes.forEach((b, i) => {
      const { cx, cy, cw, ch } = yoloToCanvas(b);
      const color = getClassColor(b.class_id);
      const isHovered = hoverBoxIndex === i;
      const isSelected = selectedBoxIndex === i;
      const emphasize = isHovered || isSelected;
      ctx.strokeStyle = emphasize ? "#ffffff" : color;
      ctx.lineWidth = emphasize ? 3 : 2;
      const left = cx - cw / 2;
      const top = cy - ch / 2;
      ctx.strokeRect(left, top, cw, ch);
      if (isSelected && resizeMode) {
        const right = cx + cw / 2;
        const bottom = cy + ch / 2;
        const mx = (left + right) / 2;
        const my = (top + bottom) / 2;
        const pts = [[left, top],[mx, top],[right, top],[right, my],[right, bottom],[mx, bottom],[left, bottom],[left, my]] as const;
        ctx.fillStyle = "#ffffff";
        for (const [hx, hy] of pts) ctx.fillRect(hx - 4, hy - 4, 8, 8);
      }
      const label = classes[b.class_id] ?? `class ${b.class_id}`;
      const { tagX, tagY, tagW, tagH } = getLabelTagRect(left, top, label, ctx);
      ctx.fillStyle = emphasize ? "#ffffff" : color;
      ctx.fillRect(tagX, tagY, tagW, tagH);
      ctx.fillStyle = emphasize ? "#111111" : "#ffffff";
      ctx.textBaseline = "middle";
      ctx.font = BOX_LABEL_FONT;
      ctx.fillText(label, tagX + 6, tagY + tagH / 2);
    });
    if (dragStart && dragEnd) {
      const x1 = dragStart.x * scale + offset.x;
      const y1 = dragStart.y * scale + offset.y;
      const x2 = dragEnd.x * scale + offset.x;
      const y2 = dragEnd.y * scale + offset.y;
      ctx.setLineDash([4, 2]);
      ctx.strokeStyle = inProgressBoxColor;
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.setLineDash([]);
    }
    if (crosshair) {
      ctx.strokeStyle = crosshairLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, crosshair.y); ctx.lineTo(canvasSize.w, crosshair.y);
      ctx.moveTo(crosshair.x, 0); ctx.lineTo(crosshair.x, canvasSize.h);
      ctx.stroke();
      ctx.lineWidth = 2;
    }
  }, [canvasRef, canvasSize, imageBufferRef, imageRef, imageSize, offset, scale, boxes, yoloToCanvas, getClassColor, selectedBoxIndex, resizeMode, classes, getLabelTagRect, dragStart, dragEnd, inProgressBoxColor, crosshairLineColor]);

  useEffect(() => {
    drawCanvasRef.current = drawCanvas;
  }, [drawCanvas]);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw, boxes, selectedBoxIndex, dragStart, dragEnd, resizeMode, inProgressBoxColor, crosshairLineColor]);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw, imageSize, canvasSize.w, canvasSize.h, scale, offset.x, offset.y]);

  useEffect(() => {
    return () => {
      if (drawRafRef.current !== null) window.cancelAnimationFrame(drawRafRef.current);
      if (bufferBuildTimerRef.current) clearTimeout(bufferBuildTimerRef.current);
    };
  }, [bufferBuildTimerRef]);

  return {
    crosshairImagePoint: crosshairReadout,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    resizeMode,
    setResizeMode,
    yoloToImageRect,
    setHoveredBoxIndex: (idx: number | null) => {
      hoverBoxIndexRef.current = idx;
      scheduleDraw();
    },
    deleteSelectedBoxWithHistory: useCallback(() => {
      if (selectedBoxIndex === null) return;
      boxesStemRef.current = currentStem;
      setBoxes((prev) => {
        pushUndoSnapshot([...prev]);
        redoStackRef.current = [];
        return prev.filter((_, i) => i !== selectedBoxIndex);
      });
      setSelectedBoxIndex(null);
    }, [selectedBoxIndex, boxesStemRef, currentStem, setBoxes, pushUndoSnapshot, redoStackRef, setSelectedBoxIndex]),
    clearBoxesWithHistory: useCallback(() => {
      boxesStemRef.current = currentStem;
      setBoxes((prev) => {
        if (prev.length === 0) return prev;
        pushUndoSnapshot([...prev]);
        redoStackRef.current = [];
        return [];
      });
      setSelectedBoxIndex(null);
    }, [boxesStemRef, currentStem, setBoxes, pushUndoSnapshot, redoStackRef, setSelectedBoxIndex])
  };
}
