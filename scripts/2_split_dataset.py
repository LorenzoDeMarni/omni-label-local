"""
Split extracted frames from dataset/videos/ into train / val / test (70 / 20 / 10).

Frames are grouped by source video and interleaved across splits so each
split gets frames from throughout every video — no temporal block bias.

Re-run safe: frames already moved out of dataset/videos/ are not seen again,
so adding a new video, extracting frames, and re-running is always safe.

Run from repo root:
    python scripts/2_split_dataset.py
"""
import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")

TRAIN_RATIO = 0.70
VAL_RATIO   = 0.20
# test gets the remainder

# Matches filenames produced by 1_extract_frames.py: <stem>_frame_<6digits>
_FRAME_RE = re.compile(r"^(.+)_frame_(\d{6})$")


def list_images(directory: Path) -> List[Path]:
    """Return only image files in directory (not videos or other files)."""
    files: List[Path] = []
    for ext in IMAGE_EXTENSIONS:
        files.extend(directory.glob(f"*{ext}"))
    return sorted(p for p in files if p.is_file())


def video_group_key(path: Path) -> str:
    """Return the video stem for a frame, or the full stem for standalone images."""
    m = _FRAME_RE.match(path.stem)
    return m.group(1) if m else path.stem


def frame_number(path: Path) -> int:
    """Return the frame index for temporal ordering, or 0 for standalone images."""
    m = _FRAME_RE.match(path.stem)
    return int(m.group(2)) if m else 0


def interleave_split(
    frames: List[Path], train_ratio: float, val_ratio: float
) -> Tuple[List[Path], List[Path], List[Path]]:
    """
    Assign frames to train/val/test using evenly-spaced interleaving.

    Instead of putting the first 70% in train as a block, frames are spread
    evenly across splits throughout the video. For example with 10 frames:
    positions 2 and 7 go to val, position 5 goes to test, the rest to train.
    This ensures each split sees frames from all parts of every video.
    """
    n = len(frames)
    if n == 0:
        return [], [], []

    n_val   = max(0, round(n * val_ratio))
    n_test  = max(0, round(n * (1.0 - train_ratio - val_ratio)))
    n_train = max(0, n - n_val - n_test)

    # Evenly-spaced test indices spread across the full range
    if n_test > 0:
        step = n / n_test
        test_indices = {
            min(int(round((i + 0.5) * step)), n - 1) for i in range(n_test)
        }
    else:
        test_indices = set()

    # Evenly-spaced val indices from the remaining (non-test) positions
    remaining = [i for i in range(n) if i not in test_indices]
    if n_val > 0 and remaining:
        step = len(remaining) / n_val
        val_indices = {
            remaining[min(int(round((i + 0.5) * step)), len(remaining) - 1)]
            for i in range(n_val)
        }
    else:
        val_indices = set()

    train_frames, val_frames, test_frames = [], [], []
    for i, frame in enumerate(frames):
        if i in test_indices:
            test_frames.append(frame)
        elif i in val_indices:
            val_frames.append(frame)
        else:
            train_frames.append(frame)

    return train_frames, val_frames, test_frames


def unique_dest_path(dest_dir: Path, filename: str) -> Path:
    base = Path(filename).stem
    ext  = Path(filename).suffix
    candidate = dest_dir / f"{base}{ext}"
    idx = 1
    while candidate.exists():
        candidate = dest_dir / f"{base}_{idx}{ext}"
        idx += 1
    return candidate


def main() -> None:
    videos_dir  = REPO_ROOT / "dataset" / "videos"
    images_root = REPO_ROOT / "dataset" / "images"
    train_dir   = images_root / "train"
    val_dir     = images_root / "val"
    test_dir    = images_root / "test"

    if not videos_dir.exists():
        raise SystemExit(
            f"[ERROR] Videos directory not found: {videos_dir}\n"
            "       Create it and drop your videos inside."
        )

    for d in (train_dir, val_dir, test_dir):
        d.mkdir(parents=True, exist_ok=True)

    # Only pick up image files — video files (.mp4, .mkv, etc.) are left alone
    pending = list_images(videos_dir)
    if not pending:
        raise SystemExit(
            f"[ERROR] No extracted frames found in: {videos_dir}\n"
            "       Run first: .venv/bin/python scripts/1_extract_frames.py"
        )

    print(f"[INFO] Found {len(pending)} frame(s) to split in {videos_dir}")

    # Group by video source
    groups: Dict[str, List[Path]] = defaultdict(list)
    for p in pending:
        groups[video_group_key(p)].append(p)

    group_names = sorted(groups.keys())
    print(f"[INFO] {len(groups)} source group(s): {', '.join(group_names)}")

    counts = {"train": 0, "val": 0, "test": 0}

    for key in group_names:
        # Sort frames in temporal order before interleaving
        frames = sorted(groups[key], key=frame_number)
        tr, vl, te = interleave_split(frames, TRAIN_RATIO, VAL_RATIO)

        print(
            f"       {key!r}: {len(frames)} frames  →  "
            f"train={len(tr)}  val={len(vl)}  test={len(te)}"
        )

        for src in tr:
            dest = unique_dest_path(train_dir, src.name)
            shutil.move(str(src), str(dest))
            counts["train"] += 1

        for src in vl:
            dest = unique_dest_path(val_dir, src.name)
            shutil.move(str(src), str(dest))
            counts["val"] += 1

        for src in te:
            dest = unique_dest_path(test_dir, src.name)
            shutil.move(str(src), str(dest))
            counts["test"] += 1

    print(
        f"\n[DONE] Moved:  train={counts['train']}  "
        f"val={counts['val']}  test={counts['test']}"
    )
    print(f"\nNext step: bash start.sh  (then open http://localhost:3000 to label)")


if __name__ == "__main__":
    main()
