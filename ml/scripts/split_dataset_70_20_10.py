import random
import shutil
from pathlib import Path
from typing import List


IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")


def list_all_images(images_root: Path) -> List[Path]:
    files: List[Path] = []
    for ext in IMAGE_EXTENSIONS:
        files.extend(images_root.rglob(f"*{ext}"))
    files = [p for p in files if p.is_file()]
    return sorted(files)


def unique_dest_path(dest_dir: Path, filename: str) -> Path:
    """Ensure we don't overwrite if two different source files share the same name."""
    base = Path(filename).stem
    ext = Path(filename).suffix
    candidate = dest_dir / f"{base}{ext}"
    idx = 1
    while candidate.exists():
        candidate = dest_dir / f"{base}_{idx}{ext}"
        idx += 1
    return candidate


def main() -> None:
    """
    Flatten all existing images under dataset/images into a single pool,
    then randomly split them into 70% train, 20% val, 10% test.
    """
    repo_root = Path(__file__).resolve().parent.parent
    images_root = repo_root / "datasets" / "images"

    if not images_root.exists():
        raise SystemExit(f"Images root does not exist: {images_root}")

    all_images = list_all_images(images_root)
    if not all_images:
        raise SystemExit(f"No images found under: {images_root}")

    print(f"Found {len(all_images)} image(s) under {images_root}")

    random.seed(42)
    random.shuffle(all_images)

    n_total = len(all_images)
    n_train = int(round(n_total * 0.7))
    n_val = int(round(n_total * 0.2))
    n_test = n_total - n_train - n_val

    print(f"Target split (train/val/test): {n_train}/{n_val}/{n_test}")

    train_dir = images_root / "train"
    val_dir = images_root / "val"
    test_dir = images_root / "test"

    train_dir.mkdir(parents=True, exist_ok=True)
    val_dir.mkdir(parents=True, exist_ok=True)
    test_dir.mkdir(parents=True, exist_ok=True)

    train_set = set(all_images[:n_train])
    val_set = set(all_images[n_train : n_train + n_val])
    test_set = set(all_images[n_train + n_val :])

    moved_counts = {"train": 0, "val": 0, "test": 0, "skipped": 0}

    for src in all_images:
        if src in train_set:
            target_dir = train_dir
            split_name = "train"
        elif src in val_set:
            target_dir = val_dir
            split_name = "val"
        else:
            target_dir = test_dir
            split_name = "test"

        try:
            rel = src.relative_to(target_dir)
            if len(rel.parts) == 1:
                moved_counts["skipped"] += 1
                continue
        except ValueError:
            pass

        dest = unique_dest_path(target_dir, src.name)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dest))
        moved_counts[split_name] += 1
        print(f"{src} -> {dest}")

    print("Done.")
    print(
        f"Moved: train={moved_counts['train']}, val={moved_counts['val']}, "
        f"test={moved_counts['test']}, skipped={moved_counts['skipped']}"
    )


if __name__ == "__main__":
    main()
