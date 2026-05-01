#!/usr/bin/env bash
# start.sh — start the backend and frontend together
#
# Usage:
#   bash start.sh
#
# Starts:
#   - FastAPI backend  on http://localhost:8000
#   - Next.js frontend on http://localhost:3000

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Verify install ────────────────────────────────────────────────────────────

if [ ! -d "$REPO_ROOT/.venv" ]; then
  error "Backend venv (.venv) not found. Run: bash install.sh"
  exit 1
fi

if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
  error "Frontend node_modules not found. Run: bash install.sh"
  exit 1
fi

# ── Export dataset env var ────────────────────────────────────────────────────

export OMNI_LABEL_DATASET="$REPO_ROOT/dataset"

# ── Start backend ─────────────────────────────────────────────────────────────

info "Starting backend on http://localhost:8000 ..."
BACKEND_LOG="$REPO_ROOT/.backend.log"

"$REPO_ROOT/.venv/bin/uvicorn" app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --app-dir "$REPO_ROOT/backend" \
  --log-level warning \
  > "$BACKEND_LOG" 2>&1 &

BACKEND_PID=$!
echo "$BACKEND_PID" > "$REPO_ROOT/.backend.pid"
info "Backend PID: $BACKEND_PID  (logs: .backend.log)"

# ── Start frontend ────────────────────────────────────────────────────────────

info "Starting frontend on http://localhost:3000 ..."
FRONTEND_LOG="$REPO_ROOT/.frontend.log"

# Clear stale build cache so Next.js always compiles fresh
rm -rf "$REPO_ROOT/frontend/.next"

cd "$REPO_ROOT/frontend"
npm run dev \
  > "$FRONTEND_LOG" 2>&1 &

FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$REPO_ROOT/.frontend.pid"
cd "$REPO_ROOT"
info "Frontend PID: $FRONTEND_PID  (logs: .frontend.log)"

# ── Wait for backend to be ready ─────────────────────────────────────────────

info "Waiting for backend to become ready ..."
ATTEMPTS=0
MAX_ATTEMPTS=20
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if curl -sf "http://localhost:8000/healthz" > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
  ATTEMPTS=$((ATTEMPTS + 1))
done

if ! curl -sf "http://localhost:8000/healthz" > /dev/null 2>&1; then
  warn "Backend may not have started yet — check .backend.log"
else
  info "Backend is up."
fi

# ── Print summary ─────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Omni-Label Local is running!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Labeler:  http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""
echo -e "${YELLOW}  Logs:${NC}"
echo "    Backend:  tail -f .backend.log"
echo "    Frontend: tail -f .frontend.log"
echo ""

# ── Cleanup on Ctrl+C ─────────────────────────────────────────────────────────

cleanup() {
  echo ""
  info "Stopping servers ..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  rm -f "$REPO_ROOT/.backend.pid" "$REPO_ROOT/.frontend.pid"
  info "Done."
}
trap cleanup INT TERM

# Keep the script alive so Ctrl+C works
wait
