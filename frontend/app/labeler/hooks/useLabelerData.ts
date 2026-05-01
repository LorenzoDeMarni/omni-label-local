import { useCallback, useEffect, useRef, useState } from "react";

import {
  getApiBase,
  getDatasetClasses,
  getDatasetRoot,
  getLabelFile,
  getSplitImages,
  getSplitStats,
  pickDatasetRoot,
  putLabelFile,
  setDatasetClasses,
  setDatasetRoot
} from "../../../lib/api";
import { Box, boxesSnapshot, imageIndexStorageKey, Split, SPLITS, stemFromFilename, STORAGE_SELECTED_CLASS_KEY } from "../types";

type Params = {
  split: Split;
};

export function useLabelerData({ split }: Params) {
  const [classes, setClasses] = useState<string[]>([]);
  const [splitCounts, setSplitCounts] = useState<Record<Split, number>>({ train: 0, val: 0, test: 0 });
  const [classCountsBySplit, setClassCountsBySplit] = useState<Record<Split, Record<number, number>>>({
    train: {},
    val: {},
    test: {}
  });
  const [filenames, setFilenames] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [currentDatasetRoot, setCurrentDatasetRoot] = useState<string | null>(null);
  const [datasetRootInput, setDatasetRootInput] = useState("");
  const [datasetRootError, setDatasetRootError] = useState<string | null>(null);
  const [isDatasetRootSaving, setIsDatasetRootSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLabelsLoading, setIsLabelsLoading] = useState(false);

  const boxesRef = useRef<Box[]>([]);
  const labelLoadSeqRef = useRef(0);
  const lastStemRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const boxesStemRef = useRef<string | null>(null);
  const selectedClassHydratedRef = useRef(false);
  const imageIndexHydratedRef = useRef<Record<Split, boolean>>({ train: false, val: false, test: false });

  const currentFilename = filenames[imageIndex] ?? null;
  const currentStem = currentFilename ? stemFromFilename(currentFilename) : null;

  const formatApiError = useCallback((error: unknown) => {
    const raw = error instanceof Error ? error.message : String(error);
    if (/failed to fetch|cannot reach api|networkerror|load failed/i.test(raw)) {
      return `Cannot reach backend API at ${getApiBase()}. Start backend server, or set NEXT_PUBLIC_API_BASE to the correct URL.`;
    }
    return raw;
  }, []);

  const chooseDatasetRoot = useCallback(async () => {
    setDatasetRootError(null);
    setIsDatasetRootSaving(true);
    try {
      const res = await pickDatasetRoot();
      setCurrentDatasetRoot(res.path);
      setDatasetRootInput(res.path ?? "");
      if (res.path) window.location.reload();
    } catch (e) {
      setDatasetRootError(
        `${formatApiError(e)} If picker is unavailable on this machine, paste a dataset path and click "Set dataset path".`
      );
    } finally {
      setIsDatasetRootSaving(false);
    }
  }, [formatApiError]);

  const saveDatasetRootPath = useCallback(async () => {
    const trimmed = datasetRootInput.trim();
    if (!trimmed) {
      setDatasetRootError("Enter a dataset folder path first.");
      return;
    }
    setDatasetRootError(null);
    setIsDatasetRootSaving(true);
    try {
      const res = await setDatasetRoot(trimmed);
      setCurrentDatasetRoot(res.path);
      setDatasetRootInput(res.path ?? "");
      if (res.path) window.location.reload();
    } catch (e) {
      setDatasetRootError(formatApiError(e));
    } finally {
      setIsDatasetRootSaving(false);
    }
  }, [datasetRootInput, formatApiError]);

  const loadClasses = useCallback(async () => {
    try {
      setDatasetError(null);
      const res = await getDatasetClasses();
      const nextClasses = res.classes.length ? res.classes : ["object"];
      setClasses(nextClasses);
      let restored = 0;
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(STORAGE_SELECTED_CLASS_KEY);
        const parsed = raw === null ? Number.NaN : parseInt(raw, 10);
        if (!Number.isNaN(parsed)) restored = parsed;
      }
      setSelectedClassIndex(Math.max(0, Math.min(nextClasses.length - 1, restored)));
      selectedClassHydratedRef.current = true;
    } catch (e) {
      setDatasetError(formatApiError(e));
      setClasses(["object"]);
      setSelectedClassIndex(0);
      selectedClassHydratedRef.current = true;
    }
  }, [formatApiError]);

  const loadCurrentDatasetRoot = useCallback(async () => {
    try {
      const res = await getDatasetRoot();
      setCurrentDatasetRoot(res.path);
      setDatasetRootInput(res.path ?? "");
    } catch {
      // informational only
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      setDatasetError(null);
      const res = await getSplitImages(split);
      setFilenames(res.filenames);
      let restored = 0;
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(imageIndexStorageKey(split));
        const parsed = raw === null ? Number.NaN : parseInt(raw, 10);
        if (!Number.isNaN(parsed)) restored = parsed;
      }
      const maxIndex = Math.max(0, res.filenames.length - 1);
      setImageIndex(Math.max(0, Math.min(maxIndex, restored)));
      imageIndexHydratedRef.current[split] = true;
    } catch (e) {
      setDatasetError(formatApiError(e));
      setFilenames([]);
      setImageIndex(0);
      imageIndexHydratedRef.current[split] = true;
    }
  }, [split, formatApiError]);

  const saveLabels = useCallback(async (targetSplit: Split, targetStem: string, targetBoxes: Box[]) => {
    setSaveError(null);
    const body = boxesSnapshot(targetBoxes);
    try {
      await putLabelFile(targetSplit, targetStem, body);
      lastSavedSnapshotRef.current = body;
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }, []);

  const saveCurrentLabels = useCallback(async () => {
    if (!currentStem || isLabelsLoading) return;
    if (boxesStemRef.current !== currentStem) return;
    await saveLabels(split, currentStem, boxesRef.current);
  }, [currentStem, isLabelsLoading, saveLabels, split]);

  const goPrev = useCallback(() => {
    if (filenames.length === 0) return;
    void saveCurrentLabels();
    setImageIndex((i) => (i - 1 + filenames.length) % filenames.length);
  }, [filenames.length, saveCurrentLabels]);

  const goNext = useCallback(() => {
    if (filenames.length === 0) return;
    void saveCurrentLabels();
    setImageIndex((i) => (i + 1) % filenames.length);
  }, [filenames.length, saveCurrentLabels]);

  const clearBoxes = useCallback(() => {
    boxesStemRef.current = currentStem;
    setBoxes([]);
    setSelectedBoxIndex(null);
  }, [currentStem]);

  const deleteSelectedBox = useCallback(() => {
    if (selectedBoxIndex === null) return;
    boxesStemRef.current = currentStem;
    setBoxes((prev) => prev.filter((_, i) => i !== selectedBoxIndex));
    setSelectedBoxIndex(null);
  }, [currentStem, selectedBoxIndex]);

  const addClass = useCallback(() => {
    const name = newClassName.trim();
    if (!name || classes.includes(name)) return;
    const next = [...classes, name];
    setClasses(next);
    setSelectedClassIndex(next.length - 1);
    setNewClassName("");
    setDatasetClasses(next).catch(() => {});
  }, [classes, newClassName]);

  const removeClass = useCallback(
    (idx: number) => {
      if (classes.length <= 1) return;
      const next = classes.filter((_, i) => i !== idx);
      setClasses(next);
      setSelectedClassIndex((i) => (i >= next.length ? next.length - 1 : i));
      setDatasetClasses(next).catch(() => {});
    },
    [classes]
  );

  useEffect(() => { void loadClasses(); }, [loadClasses]);
  useEffect(() => { void loadCurrentDatasetRoot(); }, [loadCurrentDatasetRoot]);
  useEffect(() => { void loadImages(); }, [loadImages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(SPLITS.map(async (s) => [s, (await getSplitImages(s)).filenames.length] as const));
        if (cancelled) return;
        const next: Record<Split, number> = { train: 0, val: 0, test: 0 };
        for (const [s, count] of results) next[s] = count;
        setSplitCounts(next);
      } catch { /* informational */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          SPLITS.map(async (s) => {
            const stats = await getSplitStats(s);
            const parsed: Record<number, number> = {};
            for (const [k, v] of Object.entries(stats.class_counts ?? {})) {
              const cid = parseInt(k, 10);
              if (!Number.isNaN(cid)) parsed[cid] = v;
            }
            return [s, parsed] as const;
          })
        );
        if (cancelled) return;
        const next: Record<Split, Record<number, number>> = { train: {}, val: {}, test: {} };
        for (const [s, counts] of results) next[s] = counts;
        setClassCountsBySplit(next);
      } catch {
        if (!cancelled) setClassCountsBySplit({ train: {}, val: {}, test: {} });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedClassHydratedRef.current) return;
    window.localStorage.setItem(STORAGE_SELECTED_CLASS_KEY, String(selectedClassIndex));
  }, [selectedClassIndex]);

  useEffect(() => {
    if (typeof window === "undefined" || !imageIndexHydratedRef.current[split]) return;
    window.localStorage.setItem(imageIndexStorageKey(split), String(imageIndex));
  }, [split, imageIndex]);

  useEffect(() => { boxesRef.current = boxes; }, [boxes]);

  useEffect(() => {
    if (!currentStem || isLabelsLoading) return;
    if (boxesStemRef.current !== currentStem) return;
    const currentSnapshot = boxesSnapshot(boxes);
    if (currentSnapshot === lastSavedSnapshotRef.current) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void saveLabels(split, currentStem, boxesRef.current);
    }, 450);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [boxes, currentStem, isLabelsLoading, saveLabels, split]);

  useEffect(() => {
    if (!currentStem) {
      boxesStemRef.current = null;
      setBoxes([]);
      setSelectedBoxIndex(null);
      setIsLabelsLoading(false);
      lastSavedSnapshotRef.current = "";
      return;
    }
    const seq = ++labelLoadSeqRef.current;
    boxesStemRef.current = null;
    setIsLabelsLoading(true);
    setBoxes([]);
    setSelectedBoxIndex(null);
    (async () => {
      try {
        const text = await getLabelFile(split, currentStem);
        if (seq !== labelLoadSeqRef.current) return;
        const newBoxes: Box[] = [];
        text.split("\n").forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length !== 5) return;
          const class_id = parseInt(parts[0], 10);
          const x_center = parseFloat(parts[1]);
          const y_center = parseFloat(parts[2]);
          const width = parseFloat(parts[3]);
          const height = parseFloat(parts[4]);
          if (!Number.isNaN(class_id + x_center + y_center + width + height)) {
            newBoxes.push({ class_id, x_center, y_center, width, height });
          }
        });
        boxesStemRef.current = currentStem;
        setBoxes(newBoxes);
        setSelectedBoxIndex(null);
        setIsLabelsLoading(false);
        lastSavedSnapshotRef.current = boxesSnapshot(newBoxes);
      } catch {
        if (seq !== labelLoadSeqRef.current) return;
        boxesStemRef.current = currentStem;
        setBoxes([]);
        setSelectedBoxIndex(null);
        setIsLabelsLoading(false);
        lastSavedSnapshotRef.current = "";
      }
    })();
  }, [currentStem, split]);

  useEffect(() => { lastStemRef.current = currentStem; }, [currentStem]);

  const selectedClassName = classes[selectedClassIndex] ?? "N/A";
  const selectedClassDistribution = {
    train: classCountsBySplit.train[selectedClassIndex] ?? 0,
    val: classCountsBySplit.val[selectedClassIndex] ?? 0,
    test: classCountsBySplit.test[selectedClassIndex] ?? 0
  };

  return {
    classes,
    setClasses,
    splitCounts,
    classCountsBySplit,
    filenames,
    setFilenames,
    imageIndex,
    setImageIndex,
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
    setDatasetError,
    currentDatasetRoot,
    datasetRootInput,
    setDatasetRootInput,
    datasetRootError,
    isDatasetRootSaving,
    saveError,
    setSaveError,
    isLabelsLoading,
    currentFilename,
    currentStem,
    selectedClassName,
    selectedClassDistribution,
    chooseDatasetRoot,
    saveDatasetRootPath,
    saveLabels,
    saveCurrentLabels,
    goPrev,
    goNext,
    clearBoxes,
    deleteSelectedBox,
    addClass,
    removeClass,
    formatApiError
  };
}
