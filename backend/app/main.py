from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.dataset import build_dataset_router
from app.dataset.root import set_runtime_dataset_root, validate_yolo_dataset_root

load_dotenv(override=False)

REPO_ROOT = Path(__file__).resolve().parents[2]


def _auto_configure_dataset() -> None:
    """If OMNI_LABEL_DATASET is not set, default to <repo_root>/dataset."""
    if os.environ.get("OMNI_LABEL_DATASET", "").strip():
        return
    default = REPO_ROOT / "dataset"
    if default.is_dir():
        try:
            validated = validate_yolo_dataset_root(default)
            set_runtime_dataset_root(validated)
        except ValueError:
            # dataset/ exists but folders not fully set up yet — that's fine,
            # the labeler UI will prompt the user to set the path.
            pass


def create_app() -> FastAPI:
    _auto_configure_dataset()

    app = FastAPI(
        title="Omni-Label Local",
        version="1.0.0",
        description="Lightweight local labeling backend — dataset API only.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(build_dataset_router())

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
