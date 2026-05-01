import { useCallback, useEffect, useRef } from "react";

import type { Box } from "../types";

type Params = {
  boxesRef: React.MutableRefObject<Box[]>;
  boxesStemRef: React.MutableRefObject<string | null>;
  currentStem: string | null;
  setBoxes: React.Dispatch<React.SetStateAction<Box[]>>;
  setSelectedBoxIndex: React.Dispatch<React.SetStateAction<number | null>>;
  selectedBoxIndex: number | null;
  classesLength: number;
  setSelectedClassIndex: React.Dispatch<React.SetStateAction<number>>;
  pushUndoSnapshot: (snapshot: Box[]) => void;
  goPrev: () => void;
  goNext: () => void;
  deleteSelectedBox: () => void;
  undo: () => void;
  redo: () => void;
  resizeMode: boolean;
  setResizeMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useLabelerShortcuts({
  boxesRef,
  boxesStemRef,
  currentStem,
  setBoxes,
  setSelectedBoxIndex,
  selectedBoxIndex,
  classesLength,
  setSelectedClassIndex,
  pushUndoSnapshot,
  goPrev,
  goNext,
  deleteSelectedBox,
  undo,
  redo,
  resizeMode,
  setResizeMode
}: Params) {
  const copiedBoxRef = useRef<Box | null>(null);
  const selectedBoxIndexRef = useRef<number | null>(selectedBoxIndex);
  const classesLengthRef = useRef(classesLength);
  const goPrevRef = useRef(goPrev);
  const goNextRef = useRef(goNext);
  const deleteSelectedBoxRef = useRef(deleteSelectedBox);
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);

  useEffect(() => { selectedBoxIndexRef.current = selectedBoxIndex; }, [selectedBoxIndex]);
  useEffect(() => { classesLengthRef.current = classesLength; }, [classesLength]);
  useEffect(() => { goPrevRef.current = goPrev; }, [goPrev]);
  useEffect(() => { goNextRef.current = goNext; }, [goNext]);
  useEffect(() => { deleteSelectedBoxRef.current = deleteSelectedBox; }, [deleteSelectedBox]);
  useEffect(() => { undoRef.current = undo; }, [undo]);
  useEffect(() => { redoRef.current = redo; }, [redo]);

  const handleCopyBox = useCallback(() => {
    if (selectedBoxIndexRef.current === null) return;
    const idx = selectedBoxIndexRef.current;
    const current = boxesRef.current;
    if (idx < 0 || idx >= current.length) return;
    copiedBoxRef.current = { ...current[idx] };
  }, [boxesRef]);

  const handlePasteBox = useCallback(() => {
    if (!copiedBoxRef.current) return;
    const copied = copiedBoxRef.current;
    boxesStemRef.current = currentStem;
    setBoxes((existing) => {
      pushUndoSnapshot([...existing]);
      const next = [...existing, { ...copied }];
      setSelectedBoxIndex(next.length - 1);
      return next;
    });
  }, [boxesStemRef, currentStem, setBoxes, pushUndoSnapshot, setSelectedBoxIndex]);

  const handleDuplicateBox = useCallback(() => {
    if (selectedBoxIndexRef.current === null) return;
    const idx = selectedBoxIndexRef.current;
    const current = boxesRef.current;
    if (idx < 0 || idx >= current.length) return;
    const copied = current[idx];
    copiedBoxRef.current = { ...copied };
    boxesStemRef.current = currentStem;
    setBoxes((existing) => {
      pushUndoSnapshot([...existing]);
      const next = [...existing, { ...copied }];
      setSelectedBoxIndex(next.length - 1);
      return next;
    });
  }, [boxesRef, boxesStemRef, currentStem, setBoxes, pushUndoSnapshot, setSelectedBoxIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === "c" || e.key === "C")) {
        if (!inInput && selectedBoxIndexRef.current !== null) { e.preventDefault(); handleCopyBox(); }
        return;
      }
      if (mod && (e.key === "v" || e.key === "V")) {
        if (!inInput && copiedBoxRef.current) { e.preventDefault(); handlePasteBox(); }
        return;
      }
      if (mod && (e.key === "d" || e.key === "D")) {
        if (!inInput && selectedBoxIndexRef.current !== null) { e.preventDefault(); handleDuplicateBox(); }
        return;
      }
      if (!inInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (selectedBoxIndexRef.current !== null) setResizeMode((v) => !v);
        return;
      }
      if (!inInput && e.key === "Escape") {
        if (resizeMode) setResizeMode(false);
        return;
      }
      if ((e.key === "z" || e.key === "Z") && mod) {
        e.preventDefault();
        if (e.shiftKey) redoRef.current();
        else undoRef.current();
        return;
      }
      if (inInput) return;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
        e.preventDefault(); goPrevRef.current();
      } else if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        e.preventDefault(); goNextRef.current();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBoxIndexRef.current !== null) { e.preventDefault(); deleteSelectedBoxRef.current(); }
      } else if (e.key >= "0" && e.key <= "9") {
        const idx = parseInt(e.key, 10);
        if (idx < classesLengthRef.current) { e.preventDefault(); setSelectedClassIndex(idx); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCopyBox, handlePasteBox, handleDuplicateBox, resizeMode, setResizeMode, setSelectedClassIndex]);

  return {
    canPaste: !!copiedBoxRef.current,
    handleCopyBox,
    handlePasteBox,
    handleDuplicateBox
  };
}
