"""
FastAPI backend for omni-label-local.
Handles video/image uploads, dataset splitting, label management.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import os
import json
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any
import base64

app = FastAPI(title="omni-label-local", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
ML_ROOT = PROJECT_ROOT / "ml"
DATASETS_ROOT = ML_ROOT / "datasets"
IMAGES_ROOT = DATASETS_ROOT / "images"
LABELS_ROOT = DATASETS_ROOT / "labels"
TEMP_DIR = PROJECT_ROOT / ".temp"

# Ensure directories exist
IMAGES_ROOT.mkdir(parents=True, exist_ok=True)
LABELS_ROOT.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Supported file types
ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm"}
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/upload/videos")
async def upload_videos(files: List[UploadFile] = File(...)):
    """Accept video files and store in temp directory."""
    temp_videos = TEMP_DIR / "videos"
    temp_videos.mkdir(exist_ok=True)
    
    uploaded = []
    for file in files:
        if Path(file.filename).suffix.lower() not in ALLOWED_VIDEO_EXTS:
            return JSONResponse(
                {"error": f"Unsupported video format: {file.filename}"},
                status_code=400,
            )
        
        file_path = temp_videos / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        uploaded.append(file.filename)
    
    return {"uploaded": uploaded, "count": len(uploaded)}


@app.post("/api/extract-frames")
async def extract_frames(background_tasks: BackgroundTasks):
    """Extract frames from uploaded videos."""
    temp_videos = TEMP_DIR / "videos"
    
    if not temp_videos.exists() or not list(temp_videos.glob("*")):
        raise HTTPException(status_code=400, detail="No videos uploaded")
    
    try:
        # Call extract_video_frames.py
        cmd = [
            "python",
            str(ML_ROOT / "scripts" / "extract_video_frames.py"),
            "--input-dir", str(temp_videos),
            "--output-dir", str(IMAGES_ROOT),
            "--frames-per-video", "50",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            return JSONResponse(
                {"error": f"Frame extraction failed: {result.stderr}"},
                status_code=500,
            )
        
        # Clean up temp videos after extraction
        background_tasks.add_task(shutil.rmtree, temp_videos)
        
        image_count = len(list(IMAGES_ROOT.glob("*.*")))
        return {
            "status": "success",
            "message": "Frames extracted successfully",
            "total_images": image_count,
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Frame extraction timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/images")
async def upload_images(files: List[UploadFile] = File(...)):
    """Accept image files directly."""
    uploaded = []
    for file in files:
        if Path(file.filename).suffix.lower() not in ALLOWED_IMAGE_EXTS:
            return JSONResponse(
                {"error": f"Unsupported image format: {file.filename}"},
                status_code=400,
            )
        
        file_path = IMAGES_ROOT / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        uploaded.append(file.filename)
    
    total_images = len(list(IMAGES_ROOT.glob("*.*")))
    return {
        "uploaded": uploaded,
        "count": len(uploaded),
        "total_images": total_images,
    }


@app.post("/api/split-dataset")
async def split_dataset():
    """Split dataset into train/val/test (70/20/10)."""
    try:
        cmd = [
            "python",
            str(ML_ROOT / "scripts" / "split_dataset_70_20_10.py"),
        ]
        
        # Set working directory to ML root for relative path handling
        result = subprocess.run(
            cmd,
            cwd=str(ML_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )
        
        if result.returncode != 0:
            return JSONResponse(
                {"error": f"Dataset split failed: {result.stderr}"},
                status_code=500,
            )
        
        # Auto-generate data.yaml and classes.txt if needed
        _ensure_dataset_config()
        
        return {
            "status": "success",
            "message": "Dataset split complete",
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Dataset split timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _ensure_dataset_config():
    """Ensure data.yaml and classes.txt exist."""
    classes_file = DATASETS_ROOT / "classes.txt"
    if not classes_file.exists():
        classes_file.write_text("object\n", encoding="utf-8")
    
    data_yaml = DATASETS_ROOT / "data.yaml"
    if not data_yaml.exists():
        classes = [
            ln.strip()
            for ln in classes_file.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
        yaml_content = (
            f"path: {DATASETS_ROOT.as_posix()}\n"
            f"train: images/train\n"
            f"val: images/val\n"
            f"test: images/test\n"
            f"\nnames:\n"
        )
        for i, cls in enumerate(classes):
            yaml_content += f"  {i}: {cls}\n"
        data_yaml.write_text(yaml_content, encoding="utf-8")


@app.get("/api/dataset-status")
async def dataset_status():
    """Return dataset statistics."""
    splits = ["train", "val", "test"]
    status = {}
    
    total_images = 0
    total_labeled = 0
    
    for split in splits:
        img_dir = IMAGES_ROOT / split
        lbl_dir = LABELS_ROOT / split
        
        images = list(img_dir.glob("*.*")) if img_dir.exists() else []
        labels = list(lbl_dir.glob("*.txt")) if lbl_dir.exists() else []
        
        labeled_count = sum(
            1 for img in images
            if (lbl_dir / (img.stem + ".txt")).exists()
        )
        
        status[split] = {
            "total": len(images),
            "labeled": labeled_count,
            "unlabeled": len(images) - labeled_count,
        }
        
        total_images += len(images)
        total_labeled += labeled_count
    
    # Load classes
    classes_file = DATASETS_ROOT / "classes.txt"
    classes = []
    if classes_file.exists():
        classes = [
            ln.strip()
            for ln in classes_file.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
    
    return {
        "total_images": total_images,
        "total_labeled": total_labeled,
        "total_unlabeled": total_images - total_labeled,
        "splits": status,
        "classes": classes,
        "class_count": len(classes),
    }


@app.get("/api/images/{split}")
async def get_images_for_split(split: str):
    """List all images in a split (base64 encoded)."""
    if split not in ["train", "val", "test"]:
        raise HTTPException(status_code=400, detail="Invalid split")
    
    img_dir = IMAGES_ROOT / split
    if not img_dir.exists():
        return {"images": []}
    
    images = sorted(img_dir.glob("*.*"))
    result = []
    
    for img_path in images:
        try:
            # Read and encode image as base64
            with open(img_path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode()
            
            # Check if labeled
            lbl_path = LABELS_ROOT / split / (img_path.stem + ".txt")
            is_labeled = lbl_path.exists()
            
            result.append({
                "filename": img_path.name,
                "stem": img_path.stem,
                "data": img_data,
                "labeled": is_labeled,
            })
        except Exception as e:
            print(f"Error reading {img_path}: {e}")
    
    return {"split": split, "images": result}


@app.get("/api/labels/{split}/{image_stem}")
async def get_labels(split: str, image_stem: str):
    """Load labels for an image."""
    if split not in ["train", "val", "test"]:
        raise HTTPException(status_code=400, detail="Invalid split")
    
    lbl_path = LABELS_ROOT / split / (image_stem + ".txt")
    
    if not lbl_path.exists():
        return {"labels": []}
    
    try:
        labels = []
        for line in lbl_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                parts = line.split()
                if len(parts) == 5:
                    labels.append({
                        "class_id": int(parts[0]),
                        "x_center": float(parts[1]),
                        "y_center": float(parts[2]),
                        "width": float(parts[3]),
                        "height": float(parts[4]),
                    })
        return {"labels": labels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/save-labels")
async def save_labels(data: Dict[str, Any]):
    """Save labels for an image."""
    split = data.get("split")
    image_stem = data.get("image_stem")
    labels = data.get("labels", [])
    
    if split not in ["train", "val", "test"]:
        raise HTTPException(status_code=400, detail="Invalid split")
    
    lbl_dir = LABELS_ROOT / split
    lbl_dir.mkdir(parents=True, exist_ok=True)
    lbl_path = lbl_dir / (image_stem + ".txt")
    
    try:
        with open(lbl_path, "w", encoding="utf-8") as f:
            for label in labels:
                line = (
                    f"{label['class_id']} "
                    f"{label['x_center']:.6f} "
                    f"{label['y_center']:.6f} "
                    f"{label['width']:.6f} "
                    f"{label['height']:.6f}\n"
                )
                f.write(line)
        return {"status": "success", "message": f"Labels saved for {image_stem}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/class/add")
async def add_class(data: Dict[str, Any]):
    """Add a new class."""
    class_name = data.get("name", "").strip()
    
    if not class_name:
        raise HTTPException(status_code=400, detail="Class name cannot be empty")
    
    classes_file = DATASETS_ROOT / "classes.txt"
    classes = []
    if classes_file.exists():
        classes = [
            ln.strip()
            for ln in classes_file.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
    
    if class_name in classes:
        raise HTTPException(status_code=400, detail="Class already exists")
    
    classes.append(class_name)
    classes_file.write_text("\n".join(classes) + "\n", encoding="utf-8")
    
    return {"status": "success", "classes": classes}


@app.post("/api/class/rename")
async def rename_class(data: Dict[str, Any]):
    """Rename a class."""
    old_name = data.get("old_name", "").strip()
    new_name = data.get("new_name", "").strip()
    
    if not old_name or not new_name:
        raise HTTPException(status_code=400, detail="Names cannot be empty")
    
    classes_file = DATASETS_ROOT / "classes.txt"
    classes = []
    if classes_file.exists():
        classes = [
            ln.strip()
            for ln in classes_file.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
    
    if old_name not in classes:
        raise HTTPException(status_code=400, detail="Class not found")
    
    idx = classes.index(old_name)
    classes[idx] = new_name
    classes_file.write_text("\n".join(classes) + "\n", encoding="utf-8")
    
    return {"status": "success", "classes": classes}


@app.get("/api/training-info")
async def training_info():
    """Return training script info and default parameters."""
    return {
        "script": "ml/scripts/train_yolo11m.py",
        "description": "Train YOLOv11 medium model on your labeled dataset",
        "default_params": {
            "epochs": 150,
            "batch": 16,
            "imgsz": 640,
            "patience": 40,
            "learning_rate": 0.001,
        },
        "usage": "python ml/scripts/train_yolo11m.py --epochs 150 --batch 16 --imgsz 640 --patience 40",
        "output_location": "ml/artifacts/runs/detect/",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
