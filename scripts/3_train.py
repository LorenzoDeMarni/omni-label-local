"""
Train YOLOv11 medium on your labeled dataset.

STEP 1 — edit the config block below to match your setup.
STEP 2 — activate the training venv:
    source .venv-train/bin/activate   (Linux/macOS)
    .venv-train\\Scripts\\activate      (Windows)
STEP 3 — run:
    python scripts/3_train.py

Trained weights will be saved to runs/<run_name>/weights/best.pt
"""
from __future__ import annotations

# ── Training config — edit these before running ──────────────────────────────
MODEL    = "yolo11m.pt"   # model size: yolo11n (nano), yolo11s, yolo11m (medium), yolo11l, yolo11x
EPOCHS   = 100            # number of training epochs
BATCH    = 8              # batch size (reduce to 4 if you run out of GPU memory)
IMGSZ    = 640            # input image size in pixels (use same value for train, export, inference)
PATIENCE = 30             # early stopping patience (0 = disable)
WORKERS  = 0              # dataloader workers (0 is safest on Windows)
DEVICE   = None           # None = auto-detect GPU; set "cpu" to force CPU training
RUN_NAME = "run1"         # name for this training run (results saved to runs/<RUN_NAME>)
# ─────────────────────────────────────────────────────────────────────────────

import os
import sys
from pathlib import Path

os.environ.setdefault("YOLO_AUTOINSTALL", "False")

REPO_ROOT   = Path(__file__).resolve().parents[1]
DATASET_DIR = REPO_ROOT / "dataset"
DATA_YAML   = DATASET_DIR / "data.yaml"
RUNS_DIR    = REPO_ROOT / "runs"


def _build_resolved_yaml(dataset_dir: Path, classes_txt: Path) -> Path:
    """Write a temporary data.yaml with absolute paths that Ultralytics can resolve."""
    import tempfile

    # Read class names from classes.txt
    names: dict[int, str] = {}
    if classes_txt.is_file():
        for i, line in enumerate(classes_txt.read_text().splitlines()):
            name = line.strip()
            if name:
                names[i] = name
    if not names:
        names = {0: "object"}

    lines = [
        f"path: {dataset_dir.as_posix()}",
        "train: images/train",
        "val: images/val",
        "test: images/test",
        "names:",
    ]
    for idx, name in sorted(names.items()):
        lines.append(f"  {idx}: {name}")

    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False, prefix="omni_train_"
    )
    tmp.write("\n".join(lines) + "\n")
    tmp.close()
    return Path(tmp.name)


def main() -> None:
    try:
        import torch
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(
            "ultralytics / torch not found.\n"
            "Activate the training venv and install deps:\n\n"
            "    source .venv-train/bin/activate\n"
            "    pip install -r requirements-train.txt\n"
        ) from exc

    if not DATASET_DIR.is_dir():
        raise SystemExit(
            f"[ERROR] dataset/ directory not found at {DATASET_DIR}\n"
            "Make sure you are running this script from the repo root."
        )

    classes_txt = DATASET_DIR / "classes.txt"

    # Resolve device
    if DEVICE is not None:
        device = DEVICE
    elif torch.cuda.is_available():
        device = 0
        print(f"[INFO] GPU detected: {torch.cuda.get_device_name(0)}")
    else:
        print("[WARN] No CUDA GPU found — training on CPU (will be slow).")
        print("       Pass DEVICE = 'cpu' to silence this warning, or install CUDA torch.")
        device = "cpu"

    resolved_yaml = _build_resolved_yaml(DATASET_DIR, classes_txt)

    print(f"[INFO] Model   : {MODEL}")
    print(f"[INFO] Epochs  : {EPOCHS}  Batch: {BATCH}  Imgsz: {IMGSZ}")
    print(f"[INFO] Device  : {device}")
    print(f"[INFO] Data    : {resolved_yaml}  (resolved from {DATA_YAML})")
    print(f"[INFO] Output  : {RUNS_DIR / RUN_NAME}")

    model = YOLO(MODEL)
    try:
        model.train(
            data=str(resolved_yaml),
            epochs=EPOCHS,
            patience=PATIENCE,
            batch=BATCH,
            imgsz=IMGSZ,
            device=device,
            workers=WORKERS,
            seed=42,
            deterministic=True,
            pretrained=True,
            project=str(RUNS_DIR),
            name=RUN_NAME,
            exist_ok=True,
            plots=False,
        )
    finally:
        Path(resolved_yaml).unlink(missing_ok=True)

    best_weights = RUNS_DIR / RUN_NAME / "weights" / "best.pt"
    print(f"\n[DONE] Training complete.")
    print(f"       Best weights: {best_weights}")


if __name__ == "__main__":
    main()
