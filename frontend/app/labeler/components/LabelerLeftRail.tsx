import { ReactNode } from "react";

type Props = {
  boxCount: number;
  boxListItems: ReactNode;
  undo: () => void;
  redo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  canCopy: boolean;
  canPaste: boolean;
  resizeMode: boolean;
  toggleResizeMode: () => void;
  zoomLockEnabled: boolean;
  toggleZoomLock: () => void;
  canToggleZoomLock: boolean;
  deleteSelectedBox: () => void;
  clearBoxes: () => void;
  hasSelectedBox: boolean;
};

export function LabelerLeftRail({
  boxCount,
  boxListItems,
  undo,
  redo,
  onCopy,
  onPaste,
  onDuplicate,
  canCopy,
  canPaste,
  resizeMode,
  toggleResizeMode,
  zoomLockEnabled,
  toggleZoomLock,
  canToggleZoomLock,
  deleteSelectedBox,
  clearBoxes,
  hasSelectedBox
}: Props) {
  return (
    <aside className="tool-shell__rail tool-shell__rail-scroll">
      <section className="tool-config-card">
        <p className="tool-section-title">Boxes</p>
        <div className="tool-list">
          {boxCount === 0 && <p className="muted">No boxes on this image yet.</p>}
          {boxListItems}
        </div>
      </section>

      <section className="tool-config-card">
        <p className="tool-section-title">Edit actions</p>
        <div className="tool-action-group">
          <p className="small tool-action-group__title">History</p>
          <div className="tool-actions-grid">
            <button type="button" className="button button--subtle" onClick={undo}>Undo</button>
            <button type="button" className="button button--subtle" onClick={redo}>Redo</button>
          </div>
        </div>

        <div className="tool-action-group">
          <p className="small tool-action-group__title">Clipboard</p>
          <div className="tool-actions-grid">
            <button type="button" className="button button--subtle" onClick={onCopy} disabled={!canCopy}>
              Copy
            </button>
            <button type="button" className="button button--subtle" onClick={onPaste} disabled={!canPaste}>
              Paste
            </button>
            <button type="button" className="button button--subtle" onClick={onDuplicate} disabled={!canCopy}>
              Duplicate
            </button>
            <button type="button" className="button button--subtle" onClick={toggleResizeMode} disabled={!hasSelectedBox}>
              Resize {resizeMode ? "On" : "Off"}
            </button>
            <button type="button" className="button button--subtle" onClick={toggleZoomLock} disabled={!canToggleZoomLock}>
              Zoom lock {zoomLockEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>

        <div className="tool-action-group">
          <p className="small tool-action-group__title">Commit</p>
          <div className="tool-actions-grid">
            <button type="button" className="button button--danger" onClick={deleteSelectedBox} disabled={!hasSelectedBox}>
              Delete selected
            </button>
            <button type="button" className="button button--danger-ghost" onClick={clearBoxes}>Clear all</button>
          </div>
        </div>
      </section>
    </aside>
  );
}
