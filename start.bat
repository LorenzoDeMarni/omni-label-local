@echo off
REM Quick startup script for omni-label-local (Windows)

echo 🚀 omni-label-local Startup
echo ==============================

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

echo ✓ Activating virtual environment...
call venv\Scripts\activate.bat

echo ✓ Checking dependencies...
pip install -q -r requirements.txt

REM Check if node_modules exists
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ==============================
echo ✓ Setup complete!
echo ==============================
echo.
echo 🎯 Next, run these commands in separate terminals:
echo.
echo Terminal 1 (Backend):
echo   venv\Scripts\activate.bat
echo   python -m uvicorn backend.main:app --reload
echo.
echo Terminal 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo Then open: http://localhost:3000
echo.
pause
