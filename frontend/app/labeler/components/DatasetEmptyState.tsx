import Link from "next/link";

type Props = {
  isDatasetRootSaving: boolean;
  chooseDatasetRoot: () => void;
  datasetRootInput: string;
  setDatasetRootInput: (value: string) => void;
  saveDatasetRootPath: () => void;
  datasetRootError: string | null;
};

export function DatasetEmptyState({
  isDatasetRootSaving,
  chooseDatasetRoot,
  datasetRootInput,
  setDatasetRootInput,
  saveDatasetRootPath,
  datasetRootError
}: Props) {
  return (
    <main className="dataset-empty">
      <span className="status-pill">Dataset setup</span>
      <h2>Connect a dataset before opening the labeling workspace.</h2>
      <p className="muted">
        Browse to the dataset root that contains <code>images/train|val|test</code> and
        <code> labels/train|val|test</code> so the canvas can load media and labels.
      </p>
      <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: 20 }}>
        <button type="button" disabled={isDatasetRootSaving} onClick={chooseDatasetRoot}>
          Open dataset
        </button>
        <input
          value={datasetRootInput}
          onChange={(e) => setDatasetRootInput(e.target.value)}
          placeholder="/path/to/dataset"
          aria-label="Dataset root path"
          style={{ minWidth: 280 }}
        />
        <button type="button" disabled={isDatasetRootSaving} onClick={saveDatasetRootPath}>
          Set dataset path
        </button>
        <Link href="/" className="button button--ghost">
          Back
        </Link>
      </div>
      {datasetRootError && <p className="error">{datasetRootError}</p>}
    </main>
  );
}
