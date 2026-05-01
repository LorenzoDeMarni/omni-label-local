from __future__ import annotations

import os
from pathlib import Path

_runtime_dataset_root: Path | None = None

_IMAGE_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"})
_SPLIT_ORDER = ("train", "val", "test")


def set_runtime_dataset_root(path: Path | None) -> None:
    global _runtime_dataset_root
    _runtime_dataset_root = path.resolve() if path is not None else None


def get_env_dataset_root() -> Path | None:
    raw = os.environ.get("OMNI_LABEL_DATASET", "").strip()
    if raw:
        root = Path(raw).resolve()
        if root.is_dir():
            return root
    # Auto-detect: look for dataset/ next to the repo root (two levels above this file)
    auto = Path(__file__).resolve().parents[3] / "dataset"
    if auto.is_dir():
        return auto
    return None


def get_effective_dataset_root() -> Path | None:
    if _runtime_dataset_root is not None:
        return _runtime_dataset_root
    return get_env_dataset_root()


def validate_yolo_dataset_root(root: Path) -> Path:
    resolved = root.expanduser().resolve()
    if not resolved.is_dir():
        raise ValueError(f"Dataset path is not a directory: {resolved}")
    expected = (
        resolved / "images" / "train",
        resolved / "images" / "val",
        resolved / "images" / "test",
        resolved / "labels" / "train",
        resolved / "labels" / "val",
        resolved / "labels" / "test",
    )
    missing = [str(p) for p in expected if not p.exists()]
    if missing:
        raise ValueError(f"Dataset path is missing required folders: {missing}")
    return resolved


def list_dataset_image_filenames(limit: int, *, root: Path | None = None) -> list[str]:
    if limit <= 0:
        return []
    base = root if root is not None else get_effective_dataset_root()
    if base is None:
        return []
    names: list[str] = []
    for split in _SPLIT_ORDER:
        if len(names) >= limit:
            break
        images_dir = base / "images" / split
        if not images_dir.is_dir():
            continue
        batch: list[str] = []
        try:
            for p in images_dir.iterdir():
                if p.is_file() and p.suffix.lower() in _IMAGE_EXTENSIONS:
                    batch.append(p.name)
        except OSError:
            continue
        for name in sorted(batch):
            names.append(name)
            if len(names) >= limit:
                return names
    return names
