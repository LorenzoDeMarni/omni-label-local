"use client";

import { formatDenseNumber } from "../../lib/format";
import { useCallback, useEffect, useRef, useState } from "react";
import { LabelerBoxList } from "./components/LabelerBoxList";
import { DatasetEmptyState } from "./components/DatasetEmptyState";
import { LabelerLeftRail } from "./components/LabelerLeftRail";
import { LabelerRightRail } from "./components/LabelerRightRail";
import { LabelerStage } from "./components/LabelerStage";
import { useLabelerCanvas } from "./hooks/useLabelerCanvas";
import { useLabelerData } from "./hooks/useLabelerData";
import { useLabelerInteraction } from "./hooks/useLabelerInteraction";
import { useLabelerShortcuts } from "./hooks/useLabelerShortcuts";
import { Box, Split } from "./types";

export function LabelerCanvas() {
  const HISTORY_LIMIT = 300;
  const [split, setSplit] = useState<Split>("train");
  const [resizeMode, setResizeMode] = useState(false);
  const undoStackRef = useRef<Box[][]>([]);
  const redoStackRef = useRef<Box[][]>([]);
  const {
    classes,
    splitCounts,
    filenames,
    imageIndex,
    boxes,
    setBoxes,
    boxesRef,
    boxesStemRef,
    selectedClassIndex,
    setSelectedClassIndex,
    selectedBoxIndex,
    setSelectedBoxIndex,
    newClassName,
    setNewClassName,
    datasetError,
    currentDatasetRoot,
    datasetRootInput,
    setDatasetRootInput,
    datasetRootError,
    isDatasetRootSaving,
    saveError,
    isLabelsLoading,
    currentFilename,
    currentStem,
    selectedClassName,
    selectedClassDistribution,
    chooseDatasetRoot,
    saveDatasetRootPath,
    saveCurrentLabels,
    goPrev,
    goNext,
    addClass,
    removeClass
  } = useLabelerData({ split });

  const {
    imageSize,
    canvasSize,
    scale,
    offset,
    zoomLockEnabled,
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
  } = useLabelerCanvas({ split, currentFilename });

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [currentStem]);

  const pushUndoSnapshot = useCallback((snapshot: Box[]) => {
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift();
    }
  }, []);

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    boxesStemRef.current = currentStem;
    setBoxes((current) => {
      redoStackRef.current.push(current);
      return prev;
    });
    setSelectedBoxIndex(null);
  }, [currentStem]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    boxesStemRef.current = currentStem;
    setBoxes((current) => {
      pushUndoSnapshot(current);
      return next;
    });
    setSelectedBoxIndex(null);
  }, [currentStem, pushUndoSnapshot]);

  const {
    crosshairImagePoint,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    yoloToImageRect,
    setHoveredBoxIndex,
    deleteSelectedBoxWithHistory,
    clearBoxesWithHistory
  } = useLabelerInteraction({
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
  });

  const {
    canPaste,
    handleCopyBox,
    handlePasteBox,
    handleDuplicateBox
  } = useLabelerShortcuts({
    boxesRef,
    boxesStemRef,
    currentStem,
    setBoxes,
    setSelectedBoxIndex,
    selectedBoxIndex,
    classesLength: classes.length,
    setSelectedClassIndex,
    pushUndoSnapshot,
    goPrev,
    goNext,
    deleteSelectedBox: deleteSelectedBoxWithHistory,
    undo,
    redo,
    resizeMode,
    setResizeMode
  });

  const progressFull =
    filenames.length === 0
      ? "0/0"
      : `${formatDenseNumber(imageIndex + 1).full}/${formatDenseNumber(filenames.length).full}`;
  const progressPct = filenames.length > 0 ? ((imageIndex + 1) / filenames.length) * 100 : 0;

  if (datasetError && (datasetError.includes("503") || datasetError.includes("not configured"))) {
    return (
      <DatasetEmptyState
        isDatasetRootSaving={isDatasetRootSaving}
        chooseDatasetRoot={() => void chooseDatasetRoot()}
        datasetRootInput={datasetRootInput}
        setDatasetRootInput={setDatasetRootInput}
        saveDatasetRootPath={() => void saveDatasetRootPath()}
        datasetRootError={datasetRootError}
      />
    );
  }

  return (
    <main className="tool-shell">
      <div className="tool-shell__frame">
        <LabelerLeftRail
          boxCount={boxes.length}
          boxListItems={
            <LabelerBoxList
              boxes={boxes}
              classes={classes}
              selectedBoxIndex={selectedBoxIndex}
              onSelectBox={setSelectedBoxIndex}
              onHoverBox={setHoveredBoxIndex}
              yoloToImageRect={yoloToImageRect}
            />
          }
          undo={undo}
          redo={redo}
          onCopy={handleCopyBox}
          onPaste={handlePasteBox}
          onDuplicate={handleDuplicateBox}
          canCopy={selectedBoxIndex !== null}
          canPaste={canPaste}
          resizeMode={resizeMode}
          toggleResizeMode={() => setResizeMode((v) => !v)}
          zoomLockEnabled={zoomLockEnabled}
          toggleZoomLock={toggleZoomLock}
          canToggleZoomLock={!!imageSize}
          deleteSelectedBox={deleteSelectedBoxWithHistory}
          clearBoxes={clearBoxesWithHistory}
          hasSelectedBox={selectedBoxIndex !== null}
        />

        <LabelerStage
          selectedClassIndex={selectedClassIndex}
          selectedClassName={classes[selectedClassIndex] ?? "No class selected"}
          currentFilename={currentFilename}
          progressCompact={
            filenames.length === 0
              ? "0/0"
              : `${formatDenseNumber(imageIndex + 1).compact}/${formatDenseNumber(filenames.length).compact}`
          }
          progressFull={progressFull}
          progressPct={progressPct}
          filenamesLength={filenames.length}
          goPrev={goPrev}
          goNext={goNext}
          split={split}
          setSplit={setSplit}
          splitCounts={splitCounts}
          inProgressBoxColor={inProgressBoxColor}
          setInProgressBoxColor={setInProgressBoxColor}
          crosshairLineColor={crosshairLineColor}
          setCrosshairLineColor={setCrosshairLineColor}
          canvasRef={canvasRef}
          containerRef={containerRef}
          canvasSize={canvasSize}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleWheel={handleWheel}
          handleMouseLeave={handleMouseLeave}
          crosshairImagePoint={crosshairImagePoint}
          currentDatasetRoot={currentDatasetRoot}
          datasetError={datasetError}
          saveError={saveError}
        />

        <LabelerRightRail
          isDatasetRootSaving={isDatasetRootSaving}
          chooseDatasetRoot={() => void chooseDatasetRoot()}
          datasetRootInput={datasetRootInput}
          setDatasetRootInput={setDatasetRootInput}
          saveDatasetRootPath={() => void saveDatasetRootPath()}
          datasetRootError={datasetRootError}
          split={split}
          splitCounts={splitCounts}
          selectedClassName={selectedClassName}
          selectedClassDistribution={selectedClassDistribution}
          formatCountCompact={(value) => formatDenseNumber(value).compact}
          formatCountFull={(value) => formatDenseNumber(value).full}
          classes={classes}
          selectedClassIndex={selectedClassIndex}
          setSelectedClassIndex={setSelectedClassIndex}
          newClassName={newClassName}
          setNewClassName={setNewClassName}
          addClass={addClass}
          removeClass={removeClass}
        />
      </div>
    </main>
  );
}
