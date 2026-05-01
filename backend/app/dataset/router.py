"""
Dataset API: serve and persist YOLO-format dataset (images + labels + classes).

Default root comes from OMNI_LABEL_DATASET env var, but the active root can also
be set at runtime via API to support switching datasets from the UI.
All paths are validated to prevent traversal; splits are train/val/test only.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import FileResponse, PlainTextResponse, Response

from app.dataset.root import get_effective_dataset_root, set_runtime_dataset_root, validate_yolo_dataset_root

ALLOWED_SPLITS = frozenset({"train", "val", "test"})
IMAGE_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"})


def _validate_dataset_root(root: Path) -> Path:
    try:
        return validate_yolo_dataset_root(root)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


def _validate_split(split: str) -> None:
    if split not in ALLOWED_SPLITS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid split. Must be one of: {sorted(ALLOWED_SPLITS)}",
        )


def _safe_basename(name: str, param: str) -> str:
    if not name or "/" in name or "\\" in name or name == ".." or name.startswith(".."):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {param}: must be a single filename or stem with no path separators.",
        )
    return name


def build_dataset_router() -> APIRouter:
    router = APIRouter(prefix="/api/v1/datasets/current", tags=["dataset"])

    def _current_root() -> Path | None:
        return get_effective_dataset_root()

    def _ensure_current_root() -> Path:
        root = _current_root()
        if root is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dataset not configured. Set OMNI_LABEL_DATASET, or set the dataset path in the labeler UI.",
            )
        return root

    @router.get("/root")
    def get_current_root() -> dict:
        root = _current_root()
        return {"path": str(root) if root else None}

    @router.put("/root")
    def set_current_root(payload: dict) -> dict:
        raw = payload.get("path")
        if not isinstance(raw, str) or not raw.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Body must be { "path": "/path/to/dataset" }',
            )
        validated = _validate_dataset_root(Path(raw.strip()))
        set_runtime_dataset_root(validated)
        return {"path": str(validated)}

    @router.post("/root/pick")
    def pick_current_root() -> dict:
        """Open a native folder picker on the backend machine."""
        try:
            import tkinter as tk
            from tkinter import filedialog
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Folder picker is unavailable on this backend: {exc}",
            ) from exc

        try:
            root_win = tk.Tk()
            root_win.withdraw()
            root_win.attributes("-topmost", True)
            selected = filedialog.askdirectory(
                title="Select YOLO dataset root (contains images/ and labels/)"
            )
            root_win.destroy()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to open folder picker: {exc}",
            ) from exc

        if not selected:
            current = _current_root()
            return {"path": str(current) if current else None}

        validated = _validate_dataset_root(Path(selected))
        set_runtime_dataset_root(validated)
        return {"path": str(validated)}

    @router.get("/classes")
    def get_classes() -> dict:
        root = _ensure_current_root()
        classes_file = root / "classes.txt"
        classes: list[str] = []
        if classes_file.exists():
            try:
                text = classes_file.read_text(encoding="utf-8")
                for line in text.splitlines():
                    name = line.strip()
                    if name:
                        classes.append(name)
            except OSError as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to read classes: {e}",
                )
        if not classes:
            classes = ["object"]
        return {"classes": classes}

    @router.put("/classes")
    def put_classes(payload: dict) -> dict:
        root = _ensure_current_root()
        raw = payload.get("classes")
        if not isinstance(raw, list) or not all(isinstance(c, str) for c in raw):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Body must be { "classes": [ "name1", "name2", ... ] }',
            )
        classes_file = root / "classes.txt"
        try:
            classes_file.write_text("\n".join(raw) + "\n", encoding="utf-8")
        except OSError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write classes: {e}",
            )
        return {"classes": raw}

    @router.get("/splits/{split}/images")
    def list_images(split: str) -> dict:
        root = _ensure_current_root()
        _validate_split(split)
        images_dir = root / "images" / split
        images_dir.mkdir(parents=True, exist_ok=True)
        filenames: list[str] = []
        for ext in IMAGE_EXTENSIONS:
            for p in images_dir.glob(f"*{ext}"):
                if p.is_file():
                    filenames.append(p.name)
        filenames.sort()
        return {"filenames": filenames}

    @router.get("/splits/{split}/images/{filename}")
    def get_image(split: str, filename: str) -> Response:
        root = _ensure_current_root()
        _validate_split(split)
        safe_name = _safe_basename(filename, "filename")
        images_dir = root / "images" / split
        file_path = images_dir / safe_name
        if not file_path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
        suffix = file_path.suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".bmp": "image/bmp",
            ".tif": "image/tiff",
            ".tiff": "image/tiff",
        }
        media_type = media_types.get(suffix, "application/octet-stream")
        return FileResponse(path=str(file_path), media_type=media_type)

    @router.get("/splits/{split}/stats")
    def get_split_stats(split: str) -> dict:
        root = _ensure_current_root()
        _validate_split(split)
        labels_dir = root / "labels" / split
        labels_dir.mkdir(parents=True, exist_ok=True)

        class_counts: dict[int, int] = {}
        total_boxes = 0
        labeled_images = 0

        for p in labels_dir.glob("*.txt"):
            if not p.is_file():
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except OSError:
                continue
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            if not lines:
                continue
            labeled_images += 1
            for ln in lines:
                parts = ln.split()
                if not parts:
                    continue
                try:
                    cid = int(parts[0])
                except ValueError:
                    continue
                class_counts[cid] = class_counts.get(cid, 0) + 1
                total_boxes += 1

        return {
            "split": split,
            "class_counts": class_counts,
            "total_boxes": total_boxes,
            "labeled_images": labeled_images,
        }

    @router.get("/splits/{split}/labels/{stem}.txt")
    def get_label_file(split: str, stem: str) -> PlainTextResponse:
        root = _ensure_current_root()
        _validate_split(split)
        safe_stem = _safe_basename(stem, "stem")
        labels_dir = root / "labels" / split
        label_path = labels_dir / f"{safe_stem}.txt"
        if not label_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label file not found")
        try:
            text = label_path.read_text(encoding="utf-8")
        except OSError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read label file: {e}",
            )
        return PlainTextResponse(content=text)

    @router.put("/splits/{split}/labels/{stem}.txt")
    async def put_label_file(split: str, stem: str, request: Request) -> Response:
        root = _ensure_current_root()
        _validate_split(split)
        safe_stem = _safe_basename(stem, "stem")
        body = (await request.body()).decode("utf-8")
        labels_dir = root / "labels" / split
        labels_dir.mkdir(parents=True, exist_ok=True)
        label_path = labels_dir / f"{safe_stem}.txt"
        try:
            if not body.strip():
                if label_path.exists():
                    label_path.unlink()
            else:
                label_path.write_text(body, encoding="utf-8")
        except OSError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write label file: {e}",
            )
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
