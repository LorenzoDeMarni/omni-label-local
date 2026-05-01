import { Split } from "../types";

type Props = {
  isDatasetRootSaving: boolean;
  chooseDatasetRoot: () => void;
  datasetRootInput: string;
  setDatasetRootInput: (value: string) => void;
  saveDatasetRootPath: () => void;
  datasetRootError: string | null;
  split: Split;
  splitCounts: Record<Split, number>;
  selectedClassName: string;
  selectedClassDistribution: Record<Split, number>;
  formatCountCompact: (value: number) => string;
  formatCountFull: (value: number) => string;
  classes: string[];
  selectedClassIndex: number;
  setSelectedClassIndex: (index: number) => void;
  newClassName: string;
  setNewClassName: (value: string) => void;
  addClass: () => void;
  removeClass: (index: number) => void;
};

export function LabelerRightRail({
  isDatasetRootSaving,
  chooseDatasetRoot,
  datasetRootInput,
  setDatasetRootInput,
  saveDatasetRootPath,
  datasetRootError,
  split,
  splitCounts,
  selectedClassName,
  selectedClassDistribution,
  formatCountCompact,
  formatCountFull,
  classes,
  selectedClassIndex,
  setSelectedClassIndex,
  newClassName,
  setNewClassName,
  addClass,
  removeClass
}: Props) {
  return (
    <aside className="tool-shell__rail tool-shell__rail-scroll">
      <section className="tool-config-card">
        <p className="tool-section-title">Dataset and split</p>
        <div className="stack">
          <button type="button" disabled={isDatasetRootSaving} onClick={chooseDatasetRoot}>
            Browse dataset
          </button>
          <input
            value={datasetRootInput}
            onChange={(e) => setDatasetRootInput(e.target.value)}
            placeholder="/path/to/dataset"
          />
          <button type="button" className="button button--ghost" disabled={isDatasetRootSaving} onClick={saveDatasetRootPath}>
            Set dataset path
          </button>
          {datasetRootError && <p className="error">{datasetRootError}</p>}
        </div>
        <div className="tool-split-grid" style={{ marginTop: 14 }}>
          <div className="metric-row"><span>Train</span><strong className="numeric-value" title={formatCountFull(splitCounts.train)}>{formatCountCompact(splitCounts.train)}</strong></div>
          <div className="metric-row"><span>Val</span><strong className="numeric-value" title={formatCountFull(splitCounts.val)}>{formatCountCompact(splitCounts.val)}</strong></div>
          <div className="metric-row"><span>Test</span><strong className="numeric-value" title={formatCountFull(splitCounts.test)}>{formatCountCompact(splitCounts.test)}</strong></div>
          <div className="metric-row"><span title={selectedClassName}>{selectedClassName}</span><strong className="numeric-value" title={formatCountFull(selectedClassDistribution[split])}>{formatCountCompact(selectedClassDistribution[split])}</strong></div>
        </div>
      </section>

      <section className="tool-config-card">
        <p className="tool-section-title">Classes</p>
        <div className="tool-class-list">
          {classes.map((name, i) => (
            <button
              key={i}
              type="button"
              className={`tool-class-list__item ${selectedClassIndex === i ? "tool-class-list__item--active" : ""}`}
              onClick={() => setSelectedClassIndex(i)}
              title={`${name} (hotkey: ${i})`}
            >
              <div className="tool-class-list__item-text">
                <strong>{name}</strong>
                <span className="small">Class {i} • key {i}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="stack" style={{ marginTop: 14 }}>
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="New class"
            onKeyDown={(e) => e.key === "Enter" && addClass()}
          />
          <button type="button" onClick={addClass}>Add class</button>
          {classes.length > 1 && (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => window.confirm("Delete this class?") && removeClass(selectedClassIndex)}
            >
              Delete selected class
            </button>
          )}
        </div>
      </section>

      <section className="tool-config-card">
        <p className="tool-section-title">Shortcuts</p>
        <div className="tool-shortcuts">
          <div className="tool-shortcut"><span>A / D</span><span className="small">Prev / next image</span></div>
          <div className="tool-shortcut"><span>0 - 9</span><span className="small">Select class</span></div>
          <div className="tool-shortcut"><span>Ctrl+C / Ctrl+V</span><span className="small">Copy / paste box</span></div>
          <div className="tool-shortcut"><span>Ctrl+Z / Shift+Ctrl+Z</span><span className="small">Undo / redo</span></div>
          <div className="tool-shortcut"><span>R</span><span className="small">Toggle resize mode</span></div>
          <div className="tool-shortcut"><span>Delete</span><span className="small">Remove selected box</span></div>
        </div>
      </section>
    </aside>
  );
}
