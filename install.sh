#!/usr/bin/env bash
# install.sh — one-shot setup for omni-label-local
#
# Usage:
#   bash install.sh
#
# What this does:
#   1. Creates .venv/        — Python venv for the backend (FastAPI)
#   2. Creates .venv-train/  — Python venv for training (PyTorch + Ultralytics)
#   3. Runs npm install in frontend/
#   4. Verifies the dataset/ folder structure exists

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Check Python ──────────────────────────────────────────────────────────────

if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  error "Python 3 is not installed or not on PATH."
  echo ""
  echo "  Install Python 3.10+ from: https://python.org"
  echo ""
  echo "  After installation, verify with: python3 --version"
  echo "  Then run this script again."
  exit 1
fi

PY_MAJOR=$("$PYTHON" -c 'import sys; print(sys.version_info.major)')
PY_MINOR=$("$PYTHON" -c 'import sys; print(sys.version_info.minor)')
info "Using Python $PY_MAJOR.$PY_MINOR ($PYTHON)"

if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
  error "Python 3.10+ is required (found $PY_MAJOR.$PY_MINOR)."
  echo ""
  echo "  Update Python from: https://python.org"
  echo "  Then run this script again."
  exit 1
fi

# ── Check Node / npm ──────────────────────────────────────────────────────────

if ! command -v node &>/dev/null; then
  error "Node.js is not installed or not on PATH."
  echo ""
  echo "  Install Node.js 18+ from: https://nodejs.org"
  echo ""
  echo "  After installation, verify with: node --version"
  echo "  Then run this script again."
  exit 1
fi

if ! command -v npm &>/dev/null; then
  error "npm is not installed or not on PATH."
  echo ""
  echo "  npm should come with Node.js. Verify:"
  echo "    node --version"
  echo "    npm --version"
  echo ""
  echo "  If npm is missing, reinstall Node.js from: https://nodejs.org"
  exit 1
fi

info "Using Node $(node --version) / npm $(npm --version)"

# ── 1. Backend venv ───────────────────────────────────────────────────────────

BACKEND_VENV="$REPO_ROOT/.venv"

if [ ! -d "$BACKEND_VENV" ]; then
  info "Creating backend venv at .venv ..."
  "$PYTHON" -m venv "$BACKEND_VENV"
else
  info "Backend venv already exists (.venv), skipping creation."
fi

info "Installing backend dependencies (fastapi, uvicorn, opencv, ...) ..."
"$BACKEND_VENV/bin/pip" install --quiet --upgrade pip
"$BACKEND_VENV/bin/pip" install --quiet -r "$REPO_ROOT/backend/requirements.txt"
info "Backend dependencies installed."

# ── 2. Training venv ──────────────────────────────────────────────────────────

TRAIN_VENV="$REPO_ROOT/.venv-train"

if [ ! -d "$TRAIN_VENV" ]; then
  info "Creating training venv at .venv-train ..."
  "$PYTHON" -m venv "$TRAIN_VENV"
else
  info "Training venv already exists (.venv-train), skipping creation."
fi

info "Installing training dependencies (ultralytics, torch, ...) ..."
info "This may take several minutes the first time (large downloads)."
"$TRAIN_VENV/bin/pip" install --quiet --upgrade pip
"$TRAIN_VENV/bin/pip" install -r "$REPO_ROOT/requirements-train.txt"
if ! "$TRAIN_VENV/bin/python" -c "import torch; import ultralytics" 2>/dev/null; then
  error "Training dependencies failed to install. Check the output above for errors."
  error "Re-run: .venv-train/bin/pip install -r requirements-train.txt"
  exit 1
fi
info "Training dependencies installed."

# ── 3. Frontend npm install ───────────────────────────────────────────────────

info "Installing frontend dependencies (next, react, ...) ..."
cd "$REPO_ROOT/frontend"
npm install --loglevel error
cd "$REPO_ROOT"
info "Frontend dependencies installed."

# ── 4. Verify dataset folder structure ────────────────────────────────────────

DATASET_DIR="$REPO_ROOT/dataset"
for dir in \
    "$DATASET_DIR/videos" \
    "$DATASET_DIR/images/train" \
    "$DATASET_DIR/images/val" \
    "$DATASET_DIR/images/test" \
    "$DATASET_DIR/labels/train" \
    "$DATASET_DIR/labels/val" \
    "$DATASET_DIR/labels/test"
do
  mkdir -p "$dir"
done

if [ ! -f "$DATASET_DIR/classes.txt" ]; then
  echo "object" > "$DATASET_DIR/classes.txt"
fi

if [ ! -f "$DATASET_DIR/data.yaml" ]; then
  cat > "$DATASET_DIR/data.yaml" <<'YAML'
path: .
train: images/train
val: images/val
test: images/test
names:
  0: object
YAML
fi

info "Dataset structure verified."

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Install complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Drop videos into:  dataset/videos/"
echo "     (or images directly into: dataset/images/train/)"
echo ""
echo "  2. Extract frames (if you have videos):"
echo "     .venv/bin/python scripts/1_extract_frames.py --frames-per-video 50"
echo ""
echo "  3. Split images into train/val/test:"
echo "     .venv/bin/python scripts/2_split_dataset.py"
echo ""
echo "  4. Start the labeler:"
echo "     bash start.sh"
echo "     Then open: http://localhost:3000"
echo ""
echo "  5. Train when done labeling:"
echo "     .venv-train/bin/python scripts/3_train.py"
echo ""
