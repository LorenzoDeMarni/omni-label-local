"""Train YOLOv11 medium on a labeled dataset.

Example:
  python ml/scripts/train_yolo11m.py --verify-only
  python ml/scripts/train_yolo11m.py --imgsz 640 --epochs 100 --batch 16
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

os.environ.setdefault("YOLO_AUTOINSTALL", "False")

import torch
from ultralytics import YOLO

_CUDA_INSTALL_HINT = (
    "Install CUDA PyTorch in your environment:\n"
    "  pip uninstall -y torch torchvision\n"
    "  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124"
)


def main() -> None:
    ml_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Train YOLOv11 medium on your dataset.")
    
    parser.add_argument(
        "--data",
        type=Path,
        default=ml_root / "datasets" / "data.yaml",
        help="YOLO data YAML (default: ml/datasets/data.yaml)",
    )
    parser.add_argument(
        "--classes-file",
        type=Path,
        default=ml_root / "datasets" / "classes.txt",
        help="Canonical class list.",
    )
    parser.add_argument(
        "--model",
        default="yolo11m.pt",
        help="Base checkpoint (default: yolo11m.pt medium)",
    )
    parser.add_argument("--epochs", type=int, default=150)
    parser.add_argument("--patience", type=int, default=40)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--name",
        default="yolo11m_train",
        help="Run name under project/",
    )
    parser.add_argument(
        "--project",
        type=Path,
        default=ml_root / "artifacts" / "runs" / "detect",
        help="Project directory for outputs",
    )
    parser.add_argument(
        "--device",
        default=None,
        help="cuda device index (e.g. 0) or 'cpu'; default is GPU 0",
    )
    parser.add_argument(
        "--cpu",
        action="store_true",
        help="Force CPU training",
    )
    parser.add_argument(
        "--allow-class-mismatch",
        action="store_true",
        help="Allow class order mismatch (not recommended)",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Validate config and exit without training",
    )
    
    args = parser.parse_args()

    if not args.data.is_file():
        raise SystemExit(f"Data YAML not found: {args.data}")

    yaml_names = _load_yaml_names(args.data)
    classes_txt = _load_classes_txt(args.classes_file) if args.classes_file.exists() else []
    
    if not yaml_names:
        raise SystemExit(f"Could not parse class names from {args.data}")
    
    if classes_txt and yaml_names != classes_txt and not args.allow_class_mismatch:
        raise SystemExit(
            "Class mismatch detected between data YAML and classes.txt.\n"
            f"data YAML names ({len(yaml_names)}): {yaml_names}\n"
            f"classes.txt ({len(classes_txt)}): {classes_txt}\n"
            "Fix the config or rerun with --allow-class-mismatch."
        )

    print(f"✓ Class check OK: nc={len(yaml_names)}")
    print(f"✓ Class order: {', '.join(yaml_names)}")
    print(f"✓ Training imgsz: {args.imgsz}")

    if args.verify_only:
        print("✓ Verification complete. No training started.")
        return

    if args.cpu:
        device: int | str = "cpu"
    elif args.device is not None:
        device = args.device
    elif torch.cuda.is_available():
        device = 0
    else:
        sys.exit(
            f"ERROR: No CUDA GPU available, but GPU training is default.\n{_CUDA_INSTALL_HINT}\nOr pass --cpu to train on CPU."
        )

    runtime_data_yaml, tmp_yaml = _prepare_runtime_data_yaml(args.data)
    try:
        print(f"\n{'='*60}")
        print(f"Starting training: YOLOv11 medium")
        print(f"{'='*60}\n")
        
        model = YOLO(args.model)
        model.train(
            data=str(runtime_data_yaml),
            epochs=args.epochs,
            patience=args.patience,
            batch=args.batch,
            imgsz=args.imgsz,
            device=device,
            workers=args.workers,
            seed=args.seed,
            deterministic=True,
            pretrained=True,
            project=str(args.project),
            name=args.name,
            exist_ok=True,
        )
        
        _write_training_manifest(model, args, yaml_names)
        
        print(f"\n{'='*60}")
        print(f"✓ Training complete!")
        print(f"✓ Model saved to: {args.project / args.name}")
        print(f"{'='*60}\n")
        
    finally:
        if tmp_yaml is not None:
            try:
                shutil.rmtree(tmp_yaml.parent)
            except Exception:
                pass


def _load_classes_txt(path: Path) -> list[str]:
    return [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]


def _load_yaml_names(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")

    try:
        import yaml
        raw: dict[str, Any] = yaml.safe_load(text) or {}
        names = raw.get("names")
        if isinstance(names, list):
            return [str(x).strip() for x in names]
        if isinstance(names, dict):
            ordered = []
            for key in sorted(names.keys(), key=lambda k: int(k)):
                ordered.append(str(names[key]).strip())
            return ordered
    except Exception:
        pass

    lines = text.splitlines()
    names_started = False
    names_map: dict[int, str] = {}
    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not names_started and stripped == "names:":
            names_started = True
            continue
        if names_started:
            if raw.startswith(" ") or raw.startswith("\t"):
                if ":" in stripped:
                    key, val = stripped.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key.isdigit():
                        names_map[int(key)] = val
                continue
            break
    if not names_map:
        return []
    return [names_map.get(i, "") for i in range(max(names_map.keys()) + 1)]


def _write_training_manifest(model: YOLO, args: argparse.Namespace, class_names: list[str]) -> None:
    save_dir = Path(getattr(getattr(model, "trainer", None), "save_dir", ""))
    if not save_dir:
        return
    save_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model": str(args.model),
        "data_yaml": str(args.data.resolve()),
        "classes_file": str(args.classes_file.resolve()) if args.classes_file else None,
        "nc": len(class_names),
        "names": class_names,
        "imgsz": int(args.imgsz),
        "epochs": int(args.epochs),
        "batch": int(args.batch),
        "device": str(args.device or "GPU 0"),
        "notes": "Use weights/best.pt for deployment and further fine-tuning.",
    }
    (save_dir / "training_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Training manifest saved: {save_dir / 'training_manifest.json'}")


def _prepare_runtime_data_yaml(data_yaml: Path) -> tuple[Path, Path | None]:
    try:
        import yaml
    except Exception:
        return data_yaml, None

    parsed = yaml.safe_load(data_yaml.read_text(encoding="utf-8")) or {}
    if not isinstance(parsed, dict):
        return data_yaml, None

    raw_path = parsed.get("path")
    if isinstance(raw_path, str) and raw_path.strip():
        resolved_str = _translate_cross_platform_path(raw_path)
        resolved = Path(resolved_str)
        if not resolved.is_absolute():
            resolved = (data_yaml.parent / resolved).resolve()
    else:
        resolved = data_yaml.parent.resolve()

    parsed["path"] = resolved.as_posix()
    tmp_dir = Path(tempfile.mkdtemp(prefix="yolo_data_yaml_"))
    tmp_yaml = tmp_dir / data_yaml.name
    tmp_yaml.write_text(yaml.safe_dump(parsed, sort_keys=False), encoding="utf-8")
    print(f"Using runtime data YAML: {tmp_yaml} (path={parsed['path']})")
    return tmp_yaml, tmp_yaml


def _translate_cross_platform_path(value: str) -> str:
    raw = value.strip()
    if os.name != "nt":
        m = re.match(r"^([a-zA-Z]):[\\/](.*)$", raw)
        if m:
            drive = m.group(1).lower()
            tail = m.group(2).replace("\\", "/")
            return f"/mnt/{drive}/{tail}"
    else:
        m = re.match(r"^/mnt/([a-zA-Z])/(.*)$", raw)
        if m:
            drive = m.group(1).upper()
            tail = m.group(2).replace("/", "\\")
            return f"{drive}:\\{tail}"
    return raw


if __name__ == "__main__":
    main()
