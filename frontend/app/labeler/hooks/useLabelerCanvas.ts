import { useCallback, useEffect, useRef, useState } from "react";

import { getImageUrl } from "../../../lib/api";
import type { Split } from "../types";

type Params = {
  split: Split;
  currentFilename: string | null;
};

export function useLabelerCanvas({ split, currentFilename }: Params) {
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoomLockEnabled, setZoomLockEnabled] = useState(false);
  const [inProgressBoxColor, setInProgressBoxColor] = useState("#7ece8a");
  const [crosshairLineColor, setCrosshairLineColor] = useState("#64c8ff");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageBufferRef = useRef<HTMLCanvasElement | null>(null);
  const imageLoadSeqRef = useRef(0);
  const zoomLockRef = useRef<{ zoom: number; anchorXNorm: number; anchorYNorm: number } | null>(null);
  const bufferBuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentFilename) return;
    const seq = ++imageLoadSeqRef.current;
    setImageSize(null);
    imageRef.current = null;
    imageBufferRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = getImageUrl(split, currentFilename);
    img.onload = () => {
      if (seq !== imageLoadSeqRef.current) return;
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
      imageRef.current = img;
      imageBufferRef.current = null;
    };
    img.onerror = () => {
      if (seq !== imageLoadSeqRef.current) return;
      setImageSize(null);
    };
  }, [split, currentFilename]);

  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({ w: Math.max(320, Math.floor(rect.width)), h: Math.max(360, Math.floor(rect.height)) });
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!imageSize || !canvasSize.w || !canvasSize.h) return;
    const s = Math.min(canvasSize.w / imageSize.w, canvasSize.h / imageSize.h);
    setFitScale(s);
    if (zoomLockEnabled && zoomLockRef.current) {
      const locked = zoomLockRef.current;
      const nextScale = s * locked.zoom;
      setZoom(locked.zoom);
      setScale(nextScale);
      const canvasCenterX = canvasSize.w / 2;
      const canvasCenterY = canvasSize.h / 2;
      const anchorXpx = locked.anchorXNorm * imageSize.w;
      const anchorYpx = locked.anchorYNorm * imageSize.h;
      setOffset({ x: canvasCenterX - anchorXpx * nextScale, y: canvasCenterY - anchorYpx * nextScale });
    } else {
      setZoom(1);
      setScale(s);
      setOffset({ x: (canvasSize.w - imageSize.w * s) / 2, y: (canvasSize.h - imageSize.h * s) / 2 });
    }
    imageBufferRef.current = null;
  }, [imageSize, canvasSize, zoomLockEnabled]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!imageSize) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ix = (mx - offset.x) / scale;
    const iy = (my - offset.y) / scale;
    const nextZoom = Math.max(0.2, Math.min(8, zoom * Math.exp(-e.deltaY * 0.0016)));
    const nextScale = fitScale * nextZoom;
    const nextOffset = { x: mx - ix * nextScale, y: my - iy * nextScale };
    if (zoomLockEnabled) {
      const canvasCenterX = canvasSize.w / 2;
      const canvasCenterY = canvasSize.h / 2;
      zoomLockRef.current = {
        zoom: nextZoom,
        anchorXNorm: Math.max(0, Math.min(1, (canvasCenterX - nextOffset.x) / nextScale / imageSize.w)),
        anchorYNorm: Math.max(0, Math.min(1, (canvasCenterY - nextOffset.y) / nextScale / imageSize.h))
      };
    }
    setZoom(nextZoom);
    setScale(nextScale);
    setOffset(nextOffset);
    imageBufferRef.current = null;
  }, [imageSize, offset, scale, zoom, fitScale, zoomLockEnabled, canvasSize]);

  const toggleZoomLock = useCallback(() => {
    if (!imageSize || !canvasSize.w || !canvasSize.h) return;
    if (!zoomLockEnabled) {
      const canvasCenterX = canvasSize.w / 2;
      const canvasCenterY = canvasSize.h / 2;
      const anchorXpx = (canvasCenterX - offset.x) / scale;
      const anchorYpx = (canvasCenterY - offset.y) / scale;
      zoomLockRef.current = {
        zoom,
        anchorXNorm: Math.max(0, Math.min(1, anchorXpx / imageSize.w)),
        anchorYNorm: Math.max(0, Math.min(1, anchorYpx / imageSize.h))
      };
      setZoomLockEnabled(true);
    } else {
      setZoomLockEnabled(false);
      zoomLockRef.current = null;
      const s = fitScale;
      setZoom(1);
      setScale(s);
      setOffset({ x: (canvasSize.w - imageSize.w * s) / 2, y: (canvasSize.h - imageSize.h * s) / 2 });
      imageBufferRef.current = null;
    }
  }, [imageSize, canvasSize, zoomLockEnabled, offset, scale, zoom, fitScale]);

  return {
    imageSize,
    canvasSize,
    fitScale,
    zoom,
    scale,
    offset,
    setOffset,
    setScale,
    setZoom,
    zoomLockEnabled,
    setZoomLockEnabled,
    toggleZoomLock,
    inProgressBoxColor,
    setInProgressBoxColor,
    crosshairLineColor,
    setCrosshairLineColor,
    canvasRef,
    containerRef,
    imageRef,
    imageBufferRef,
    bufferBuildTimerRef,
    handleWheel
  };
}
