@echo off
REM start.bat — start the backend and frontend together on Windows
REM
REM Usage:
REM   start.bat
REM
REM Starts:
REM   - FastAPI backend  on http://localhost:8000
REM   - Next.js frontend on http://localhost:3000

setlocal enabledelayedexpansion

for /f "tokens=*" %%i in ('cd') do set REPO_ROOT=%%i

cd /d "%REPO_ROOT%"

REM ── Verify install ────────────────────────────────────────────────────────────

if not exist ".venv" (
  echo [ERROR] Backend venv (.venv) not found. Run: install.bat
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo [ERROR] Frontend node_modules not found. Run: install.bat
  exit /b 1
)

REM ── Export dataset env var ────────────────────────────────────────────────────

set OMNI_LABEL_DATASET=%REPO_ROOT%\dataset

REM ── Start backend ─────────────────────────────────────────────────────────────

echo [INFO]  Starting backend on http://localhost:8000 ...
set BACKEND_LOG=%REPO_ROOT%\.backend.log

start "Omni-Label Backend" cmd /k "%REPO_ROOT%\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --app-dir "%REPO_ROOT%\backend" --log-level warning"

REM ── Wait a moment for backend to start ────────────────────────────────────────

timeout /t 3 /nobreak

REM ── Start frontend ────────────────────────────────────────────────────────────

echo [INFO]  Starting frontend on http://localhost:3000 ...

REM Clear stale build cache so Next.js always compiles fresh
if exist "%REPO_ROOT%\frontend\.next" rmdir /s /q "%REPO_ROOT%\frontend\.next"

cd /d "%REPO_ROOT%\frontend"
start "Omni-Label Frontend" cmd /k "npm run dev"
cd /d "%REPO_ROOT%"

REM ── Print summary ─────────────────────────────────────────────────────────────

echo.
echo ============================================================
echo   Omni-Label Local is running!
echo ============================================================
echo.
echo   Labeler:  http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo   Close either window to stop that server.
echo   Close both windows to stop completely.
echo.

pause
