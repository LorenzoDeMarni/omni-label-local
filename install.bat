@echo off
REM install.bat — one-shot setup for omni-label-local on Windows
REM
REM Usage:
REM   install.bat
REM
REM What this does:
REM   1. Creates .venv/        — Python venv for the backend (FastAPI)
REM   2. Creates .venv-train/  — Python venv for training (PyTorch + Ultralytics)
REM   3. Runs npm install in frontend/
REM   4. Verifies the dataset/ folder structure exists

setlocal enabledelayedexpansion

for /f "tokens=*" %%i in ('cd') do set REPO_ROOT=%%i

cd /d "%REPO_ROOT%"

echo.
echo ============================================================
echo [INFO]  Omni-Label Local - Windows Setup
echo ============================================================
echo.

REM ── Check Python ──────────────────────────────────────────────────────────────

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Python is not installed or not on PATH.
  echo.
  echo   Install Python 3.10+ from: https://python.org
  echo.
  echo   IMPORTANT: During installation, check "Add Python to PATH"
  echo.
  echo   After installation, restart your terminal and run this script again.
  exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PY_VERSION=%%i
echo [INFO]  Using !PY_VERSION!

python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if %errorlevel% neq 0 (
  echo [ERROR] Python 3.10+ is required.
  echo.
  echo   Upgrade Python from: https://python.org
  echo   Then restart your terminal and run this script again.
  exit /b 1
)

REM ── Check Node / npm ──────────────────────────────────────────────────────────

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo.
  echo   Install Node.js 18+ from: https://nodejs.org
  echo.
  echo   IMPORTANT: During installation, allow it to add Node to PATH
  echo.
  echo   After installation, restart your terminal and run this script again.
  exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] npm is not installed or not on PATH.
  echo.
  echo   npm should come with Node.js. If missing, reinstall from: https://nodejs.org
  echo   Make sure to restart your terminal after installing.
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [INFO]  Using Node !NODE_VERSION! / npm !NPM_VERSION!

REM ── 1. Backend venv ───────────────────────────────────────────────────────────

if not exist ".venv" (
  echo [INFO]  Creating backend venv at .venv ...
  python -m venv .venv
) else (
  echo [INFO]  Backend venv already exists (.venv), skipping creation.
)

echo [INFO]  Installing backend dependencies (fastapi, uvicorn, opencv, ...) ...
call .venv\Scripts\pip install --quiet --upgrade pip
call .venv\Scripts\pip install --quiet -r backend\requirements.txt
echo [INFO]  Backend dependencies installed.

REM ── 2. Training venv ──────────────────────────────────────────────────────────

if not exist ".venv-train" (
  echo [INFO]  Creating training venv at .venv-train ...
  python -m venv .venv-train
) else (
  echo [INFO]  Training venv already exists (.venv-train), skipping creation.
)

echo [INFO]  Installing training dependencies (ultralytics, torch, ...) ...
echo [INFO]  This may take several minutes the first time (large downloads).
call .venv-train\Scripts\pip install --quiet --upgrade pip
call .venv-train\Scripts\pip install -r requirements-train.txt
.venv-train\Scripts\python -c "import torch; import ultralytics" >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Training dependencies failed to install. Check the output above for errors.
  echo [ERROR] Re-run: .venv-train\Scripts\pip install -r requirements-train.txt
  exit /b 1
)
echo [INFO]  Training dependencies installed.

REM ── 3. Frontend npm install ───────────────────────────────────────────────────

echo [INFO]  Installing frontend dependencies (next, react, ...) ...
cd /d "%REPO_ROOT%\frontend"
call npm install --loglevel error
cd /d "%REPO_ROOT%"
echo [INFO]  Frontend dependencies installed.

REM ── 4. Verify dataset folder structure ────────────────────────────────────────

if not exist "dataset\videos" mkdir dataset\videos
if not exist "dataset\images\train" mkdir dataset\images\train
if not exist "dataset\images\val" mkdir dataset\images\val
if not exist "dataset\images\test" mkdir dataset\images\test
if not exist "dataset\labels\train" mkdir dataset\labels\train
if not exist "dataset\labels\val" mkdir dataset\labels\val
if not exist "dataset\labels\test" mkdir dataset\labels\test

if not exist "dataset\classes.txt" (
  echo object > dataset\classes.txt
)

if not exist "dataset\data.yaml" (
  (
    echo path: .
    echo train: images/train
    echo val: images/val
    echo test: images/test
    echo names:
    echo   0: object
  ) > dataset\data.yaml
)

echo [INFO]  Dataset structure verified.

echo.
echo ============================================================
echo [INFO]  Install complete!
echo ============================================================
echo.
echo   Next steps:
echo.
echo   1. Drop videos into:  dataset\videos\
echo      (or images directly into: dataset\images\train\)
echo.
echo   2. Extract frames (if you have videos):
echo      .venv\Scripts\python scripts\1_extract_frames.py --frames-per-video 50
echo.
echo   3. Split images into train/val/test:
echo      .venv\Scripts\python scripts\2_split_dataset.py
echo.
echo   4. Start the labeler:
echo      start.bat
echo      Then open: http://localhost:3000
echo.
echo   5. Train when done labeling:
echo      .venv-train\Scripts\python scripts\3_train.py
echo.
