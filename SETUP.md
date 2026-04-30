# 🛠️ Detailed Setup Guide

If the Quick Start didn't work, follow this step-by-step guide.

---

## Step 1: Verify Prerequisites

### Check Python Version
```bash
python --version
```
Should be **3.10 or higher**. If not, download from [python.org](https://www.python.org/downloads/)

### Check Git
```bash
git --version
```
Should show a version. If not, download from [git-scm.com](https://git-scm.com/)

### Check Node.js (Optional, only needed for running without Docker)
```bash
node --version
npm --version
```
Should be **Node 18+ and npm 9+**. If not, download from [nodejs.org](https://nodejs.org/)

---

## Step 2: Clone and Navigate

```bash
# Navigate to your projects folder
cd ~/Repos/Projects

# Clone the repository
git clone <your-github-url> omni-label-local

# Enter the directory
cd omni-label-local

# List files to verify
ls -la
```

You should see:
```
backend/
frontend/
ml/
requirements.txt
README.md
...
```

---

## Step 3: Create Python Virtual Environment

A virtual environment keeps this project's dependencies separate from others.

### On Mac/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### On Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` at the start of your terminal line.

---

## Step 4: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:
- FastAPI (web server)
- OpenCV (video/image processing)
- PyTorch (AI framework)
- Ultralytics (YOLO AI model)
- And other dependencies

**This may take 5-10 minutes.** Go grab a snack! ☕

---

## Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

This downloads React and Next.js packages (~500MB).

---

## Step 6: Start Backend Server

```bash
python -m uvicorn backend.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Keep this terminal open!**

---

## Step 7: Start Frontend in New Terminal

**Open a NEW terminal tab/window:**

```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 15.5.14
  - Local:        http://localhost:3000
```

**Keep this terminal open too!**

---

## Step 8: Open in Browser

Go to: **http://localhost:3000**

You should see the omni-label-local interface!

---

## Running in Future Sessions

Each time you want to work on this project:

### Terminal 1: Backend
```bash
cd ~/Repos/Projects/omni-label-local
source venv/bin/activate  # or: venv\Scripts\activate on Windows
python -m uvicorn backend.main:app --reload
```

### Terminal 2: Frontend
```bash
cd ~/Repos/Projects/omni-label-local/frontend
npm run dev
```

### Terminal 3: Training (when ready)
```bash
cd ~/Repos/Projects/omni-label-local
source venv/bin/activate
python ml/scripts/train_yolo11m.py --epochs 150
```

---

## GPU Setup (Optional but Recommended)

If you have an NVIDIA GPU, training will be **10-50x faster!**

### Check if You Have CUDA
```bash
nvidia-smi
```

If you see GPU information, you're good! Otherwise, download CUDA drivers.

### Install PyTorch with CUDA
```bash
pip uninstall torch torchvision -y
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
```

Verify:
```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Should print: `True`

---

## Project Structure

```
omni-label-local/
├── backend/                 # FastAPI server
│   └── main.py             # Backend logic
├── frontend/               # Next.js web UI
│   ├── app/
│   │   ├── page.tsx        # Main interface
│   │   ├── page.css        # Styles
│   │   └── layout.tsx      # Layout
│   └── package.json
├── ml/
│   ├── datasets/           # Your data goes here
│   │   ├── images/         # Images to label
│   │   ├── labels/         # YOLO format labels
│   │   ├── classes.txt     # Class names
│   │   └── data.yaml       # Dataset config
│   ├── artifacts/          # Training outputs
│   │   └── runs/detect/    # Model checkpoints
│   └── scripts/            # AI scripts
│       ├── extract_video_frames.py
│       ├── split_dataset_70_20_10.py
│       └── train_yolo11m.py
├── requirements.txt        # Python dependencies
└── README.md              # This guide
```

---

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'fastapi'"
**Solution:** Make sure virtual environment is activated and requirements installed
```bash
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Issue: "Address already in use" on port 8000
**Solution:** Something else is using that port. Try:
```bash
python -m uvicorn backend.main:app --port 8001 --reload
```

### Issue: "npm: command not found"
**Solution:** Install Node.js from [nodejs.org](https://nodejs.org/)

### Issue: VERY slow training
**Solution:** Make sure you have GPU support:
```bash
python -c "import torch; print(torch.cuda.is_available())"
```
If `False`, install CUDA PyTorch (see GPU Setup above).

### Issue: "No space left on device"
**Solution:** You need 5-10 GB free. Models can be large!
- Delete old training runs: `rm -rf ml/artifacts/`
- Or train with smaller images: `--imgsz 320`

---

## Next Steps

1. Follow the **Quick Start** in README.md
2. Upload some videos or images
3. Label them in the web interface
4. Train your model!
5. Share your results 🚀

---

**Still stuck? Create an issue or ask for help!**
