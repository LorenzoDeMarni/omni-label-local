#!/bin/bash
# Quick startup script for omni-label-local

set -e

echo "🚀 omni-label-local Startup"
echo "=============================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "✓ Activating virtual environment..."
source venv/bin/activate

echo "✓ Checking dependencies..."
pip install -q -r requirements.txt

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "=============================="
echo "✓ Setup complete!"
echo "=============================="
echo ""
echo "🎯 Next, run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  source venv/bin/activate"
echo "  python -m uvicorn backend.main:app --reload"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
