# omni-label-local

A self-contained image labeling tool that lets you clone, install, label, and train a YOLOv11 model — no cloud, no accounts, no complexity. Everything runs locally on your machine.

## Prerequisites

| Tool | Minimum version | Download |
|------|----------------|---------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| Git | any | https://git-scm.com |

### Installing Prerequisites (if you don't have them)

**Python:**
1. Visit https://python.org and download Python 3.10 or later
2. **Important (Windows only):** During installation, check the box "Add Python to PATH"
3. Verify: Open terminal/command prompt and run `python --version`

**Node.js:**
1. Visit https://nodejs.org and download the LTS (Long Term Support) version
2. **Important:** During installation, allow it to add Node to PATH
3. Verify: Open terminal/command prompt and run `node --version` and `npm --version`

**Git:**
1. Visit https://git-scm.com and download the installer
2. Follow the default installation steps
3. Verify: Open terminal/command prompt and run `git --version`

Once all three are installed, you're ready to clone and install omni-label-local!

---

## What Gets Installed

The `install.sh` (macOS/Linux) and `install.bat` (Windows) scripts will automatically download and install everything else you need:

| Component | What it is | Why you need it |
|-----------|-----------|-----------------|
| **Virtual Environments (.venv, .venv-train)** | Isolated Python environments for this project | Prevents conflicts with other Python projects |
| **FastAPI** | Web framework for the backend API | Powers the dataset API server |
| **Uvicorn** | ASGI web server | Runs FastAPI in the background |
| **Next.js** | React framework for the web UI | Builds the labeling interface |
| **React** | JavaScript UI library | Powers the interactive labeling interface |
| **PyTorch** | Deep learning framework | Required for training the YOLO model |
| **Ultralytics** | YOLO library | Contains the YOLOv11 training code |
| **OpenCV** | Computer vision library | Used for extracting frames from videos |

**Total download size:** ~2-3 GB (mostly PyTorch on first training run)  
**Installation time:** 5-15 minutes (depending on your internet speed)

---

## Platform Support

This project is **fully cross-platform** and works on **Windows, macOS, and Linux**.

| Platform | Install | Start | Scripts |
|----------|---------|-------|---------|
| **Linux / macOS** | `bash install.sh` | `bash start.sh` | `.venv/bin/python` |
| **Windows** | `install.bat` | `start.bat` | `.venv\Scripts\python` |

Key differences:
- **Linux/macOS** uses shell scripts (`.sh`) and Unix-style paths (`/`)
- **Windows** uses batch files (`.bat`) and Windows-style paths (`\`)
- All Python code is identical across platforms

---

## Quick Start

### 1. Clone and install

**On Linux / macOS:**

```bash
git clone <repo-url> omni-label-local
cd omni-label-local
bash install.sh
```

**On Windows:**

```cmd
git clone <repo-url> omni-label-local
cd omni-label-local
install.bat
```

Both scripts set up two Python virtual environments and install frontend packages:

| Venv | Purpose |
|------|---------|
| `.venv/` | FastAPI backend + frame extraction |
| `.venv-train/` | PyTorch + Ultralytics for model training |

The install script also creates the `dataset/` folder structure and default `classes.txt` / `data.yaml` files.

---

### 2. Add your raw data

Choose **Option A** (images) or **Option B** (videos):

#### Option A — Drop images directly

Place image files into:

```
dataset/images/train/
```

Supported formats: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tif`, `.tiff`

Then skip to step 4 below.

#### Option B — Drop videos and extract frames

1. Place video files into:

```
dataset/videos/
```

Supported formats: `.mp4`, `.mov`, `.avi`, `.mkv`, `.m4v`, `.webm`

2. Extract frames (run from repo root):

**On Linux / macOS:**

```bash
# Extract 50 frames per video (default)
.venv/bin/python scripts/1_extract_frames.py

# Extract custom frame count
.venv/bin/python scripts/1_extract_frames.py --frames-per-video 100

# Extract from a single video
.venv/bin/python scripts/1_extract_frames.py --video dataset/videos/myvideo.mp4 --frames-per-video 200
```

**On Windows:**

```cmd
REM Extract 50 frames per video (default)
.venv\Scripts\python scripts\1_extract_frames.py

REM Extract custom frame count
.venv\Scripts\python scripts\1_extract_frames.py --frames-per-video 100

REM Extract from a single video
.venv\Scripts\python scripts\1_extract_frames.py --video dataset\videos\myvideo.mp4 --frames-per-video 200
```

Extracted frames are saved to `dataset/images/train/`.

---

### 3. Split images into train / val / test

Randomly distributes all images: 70% train · 20% validation · 10% test

**On Linux / macOS:**

```bash
.venv/bin/python scripts/2_split_dataset.py
```

**On Windows:**

```cmd
.venv\Scripts\python scripts\2_split_dataset.py
```

**Important:** Run this **once** before you start heavy labeling. It's safe to re-run — images already in a split folder stay in place. However, if you add more images after splitting and labeling, labels may become out of sync with the new split.

---

### 4. Label images

Start the labeling UI:

**On Linux / macOS:**

```bash
bash start.sh
```

**On Windows:**

```cmd
start.bat
```

This starts:
- **Backend** on `http://localhost:8000`
- **Frontend** (labeler) on `http://localhost:3000`

Open your browser to **`http://localhost:3000`** and you're ready to label.

#### Labeling workflow

1. The labeler starts in the `train` split by default.
2. Click and drag on the canvas to draw bounding boxes around objects.
3. Right-click (or use the UI) to assign a class to each box.
4. Add class names in the right panel — they are automatically saved to `dataset/classes.txt`.
5. Use **A / D** keys or arrow keys to navigate between images.
6. Labels are auto-saved as YOLO `.txt` files in `dataset/labels/<split>/`.
7. Switch between splits (train/val/test) using the dropdown in the right panel.

#### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `A` / `←` Arrow | Previous image |
| `D` / `→` Arrow | Next image |
| `0`–`9` | Select class (0 = class 0, 9 = class 9) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selected box |
| `Ctrl+V` | Paste box |
| `R` | Toggle resize mode |
| `Delete` | Remove selected box |

#### Stopping the servers

**On Linux / macOS:**

Press **Ctrl+C** in the terminal running `start.sh` to stop both backend and frontend gracefully.

**On Windows:**

Close the "Omni-Label Backend" and "Omni-Label Frontend" windows to stop the servers.

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Cannot reach backend API"** | Run `bash start.sh` first. Check `.backend.log` for errors. |
| **Frontend shows blank** | Wait a few seconds for Next.js to compile, then refresh the page. |
| **Dataset not loading** | Paste the absolute path to the `dataset/` folder in the UI and click "Set dataset path", then reload. |
| **No images appear** | Verify images are in `dataset/images/train/`, `dataset/images/val/`, or `dataset/images/test/`. |

---

### 5. Train your YOLOv11 model

Once you've labeled enough images, train a model:

1. Edit the training config at the top of `scripts/3_train.py`:

```python
MODEL    = "yolo11m.pt"   # yolo11n / yolo11s / yolo11m / yolo11l / yolo11x
EPOCHS   = 100            # number of training epochs
BATCH    = 8              # batch size (reduce to 4 if GPU memory runs out)
IMGSZ    = 640            # input image size
PATIENCE = 30             # early stopping patience (0 = disable)
WORKERS  = 0              # dataloader workers (0 is safest on Windows)
DEVICE   = None           # None = auto-detect GPU; "cpu" to force CPU training
RUN_NAME = "run1"         # name for this training run
```

2. Activate the training venv and run:

```bash
# Linux / macOS
source .venv-train/bin/activate
python scripts/3_train.py

# Windows
.venv-train\Scripts\activate
python scripts/3_train.py
```

The training script will:
- Read all labeled images and labels from `dataset/`
- Use class names from `dataset/classes.txt`
- Train YOLOv11 on your labeled data
- Save best weights to `runs/<RUN_NAME>/weights/best.pt`

#### GPU and Performance

- **GPU auto-detection:** By default, the script detects and uses your GPU (if available). Training on GPU is much faster.
- **CPU training:** If you don't have a GPU or want to force CPU training, set `DEVICE = "cpu"` in the config.
- **GPU out of memory:** If you see CUDA out-of-memory errors, reduce `BATCH` (try 4 or 2) in the config.
- **Check GPU availability:**

**On Linux / macOS:**

```bash
source .venv-train/bin/activate
python -c "import torch; print('GPU available:', torch.cuda.is_available()); print('GPU name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
```

**On Windows:**

```cmd
.venv-train\Scripts\activate
python -c "import torch; print('GPU available:', torch.cuda.is_available()); print('GPU name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
```

---

## Dataset Folder Structure

```
dataset/
├── videos/                ← optional: drop raw videos here for frame extraction
├── images/
│   ├── train/             ← training images (after split, or drop here directly)
│   ├── val/               ← validation images (auto-created by split script)
│   └── test/              ← test images (auto-created by split script)
├── labels/
│   ├── train/             ← YOLO .txt label files (auto-generated by labeler)
│   ├── val/               ← validation labels
│   └── test/              ← test labels
├── classes.txt            ← one class name per line (auto-managed by labeler)
└── data.yaml              ← YOLO training config (auto-created by install, updated by training script)
```

### What goes where?

- **Images:** JPEG / PNG files go into the appropriate split folder (`train/`, `val/`, `test/`).
- **Videos:** Raw video files go into `videos/` before frame extraction.
- **Labels:** Auto-generated by the labeler. Do not edit manually unless you know YOLO format.
- **Classes:** Manage via the labeler UI. One class per line in `classes.txt`.

---

## Full Workflow Example

**On Linux / macOS:**

```bash
# 1. Clone and install
git clone <repo-url> omni-label-local
cd omni-label-local
bash install.sh

# 2. Add videos
cp ~/my_videos/*.mp4 dataset/videos/

# 3. Extract frames
.venv/bin/python scripts/1_extract_frames.py --frames-per-video 50

# 4. Split into train/val/test
.venv/bin/python scripts/2_split_dataset.py

# 5. Start labeling
bash start.sh
# Open http://localhost:3000 in browser
# Label your images...
# Press Ctrl+C when done

# 6. Train the model
source .venv-train/bin/activate
python scripts/3_train.py

# Best weights saved to: runs/run1/weights/best.pt
```

**On Windows:**

```cmd
REM 1. Clone and install
git clone <repo-url> omni-label-local
cd omni-label-local
install.bat

REM 2. Add videos
copy C:\path\to\your\videos\*.mp4 dataset\videos\

REM 3. Extract frames
.venv\Scripts\python scripts\1_extract_frames.py --frames-per-video 50

REM 4. Split into train/val/test
.venv\Scripts\python scripts\2_split_dataset.py

REM 5. Start labeling
start.bat
REM Open http://localhost:3000 in browser
REM Label your images...
REM Close the windows when done

REM 6. Train the model
.venv-train\Scripts\activate
python scripts\3_train.py

REM Best weights saved to: runs\run1\weights\best.pt
```

---

## Project Structure

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI backend (dataset API, image serving, label I/O) |
| `frontend/` | Next.js 15 + React 19 labeling UI |
| `scripts/` | Python utilities (frame extraction, dataset split, training) |
| `dataset/` | Your images, labels, and training configuration |
| `install.sh` / `install.bat` | One-shot setup script (creates venvs, installs deps) |
| `start.sh` / `start.bat` | Starts backend + frontend together |
| `requirements-train.txt` | PyTorch + Ultralytics for training |

---

## Backend API (Advanced)

The backend runs on `http://localhost:8000` and provides a REST API for the frontend. Key endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/healthz` | Health check (returns `{"status": "ok"}`) |
| `GET` / `PUT` | `/api/v1/datasets/current/root` | Get/set dataset root path |
| `POST` | `/api/v1/datasets/current/root/pick` | Open native folder picker |
| `GET` / `PUT` | `/api/v1/datasets/current/classes` | Get/set class names |
| `GET` | `/api/v1/datasets/current/splits/{split}/images` | List images in a split |
| `GET` | `/api/v1/datasets/current/splits/{split}/images/{filename}` | Download image |
| `GET` | `/api/v1/datasets/current/splits/{split}/labels/{stem}.txt` | Read label file |
| `PUT` | `/api/v1/datasets/current/splits/{split}/labels/{stem}.txt` | Save/delete label |

Environment variables:

- `OMNI_LABEL_DATASET`: Absolute path to your dataset root. If not set, defaults to `<repo>/dataset/`.
- `NEXT_PUBLIC_API_BASE`: Frontend API base URL (default: `http://localhost:8000/api/v1`).

---

## Common Issues & Solutions

### Prerequisites Installation

| Problem | Solution |
|---------|----------|
| **"Python not found" on Windows** | Python was not added to PATH during installation. Reinstall Python and **check "Add Python to PATH"** during setup. Restart your terminal after installing. |
| **"Node.js not found" on Windows** | Node.js was not added to PATH. Reinstall from https://nodejs.org and allow PATH modification. Restart your terminal after installing. |
| **"Python/Node command not found" after install** | Your terminal session was open during installation. **Close and reopen your terminal** to load the updated PATH. |
| **"python3 --version" works but "python --version" doesn't** | Your system uses `python3` instead of `python`. That's fine! The install script will detect it automatically. |
| **On macOS: Python/Node installed but not in PATH** | Install via Homebrew instead: `brew install python@3.11 node` (ensures PATH is set up correctly) |

### Installation Script

| Problem | Solution |
|---------|----------|
| **"Python 3 is not installed or not on PATH"** | Install Python 3.10+ from https://python.org. Restart your terminal. Then run the install script again. |
| **"Node.js is not installed or not on PATH"** | Install Node.js 18+ from https://nodejs.org. Restart your terminal. Then run the install script again. |
| **"pip: command not found"** | Python wasn't installed with pip. Reinstall Python from https://python.org and ensure pip is included. |
| **"npm: command not found"** | npm should come with Node.js. Reinstall from https://nodejs.org. If still missing, your Node install was incomplete. |

### Running

| Problem | Solution |
|---------|----------|
| **"Backend venv not found"** when running `start.sh` / `start.bat` | **Linux/macOS:** Run `bash install.sh` **Windows:** Run `install.bat` |
| **"API connection failed"** | Check `.backend.log` for errors. Ensure port 8000 is not in use. |
| **Frontend shows "Cannot reach API"** | Wait 10 seconds for both servers to fully start. Check `.frontend.log` and `.backend.log`. |
| **Port 8000 or 3000 already in use** | **Linux/macOS:** Kill the process or edit `start.sh` to use different ports **Windows:** Change ports in `start.bat` |

### Labeling

| Problem | Solution |
|---------|----------|
| **Images not loading** | Verify images exist in `dataset/images/train/` (or val/test). Use absolute path in UI if needed. |
| **Labels not saving** | Check `.backend.log`. Verify `dataset/labels/train/` exists and is writable. |
| **Classes not showing** | Refresh the page. Check that `dataset/classes.txt` is not empty. |

### Training

| Problem | Solution |
|---------|----------|
| **"No GPU detected"** | **Linux/macOS:** `source .venv-train/bin/activate; python -c "import torch; print(torch.cuda.is_available())"` **Windows:** `.venv-train\Scripts\activate` then `python -c "import torch; print(torch.cuda.is_available())"` |
| **"CUDA out of memory"** | Reduce `BATCH` size in `scripts/3_train.py` (try 4 or 2). |
| **"No module named 'cv2'"** during training | **Linux/macOS:** `.venv-train/bin/pip install opencv-python` **Windows:** `.venv-train\Scripts\pip install opencv-python` |
| **Training is very slow** | Check GPU usage with `nvidia-smi`. If GPU usage is low, set `WORKERS=0` or reduce `BATCH`. |

---

## Tips & Best Practices

1. **Start small:** Label 50-100 images first to verify the workflow before investing time in a large dataset.
2. **Balanced classes:** Try to have roughly equal numbers of each class (e.g., 100 cars, 100 people, 100 bikes) for best training results.
3. **Data quality:** Clear, well-lit images with visible objects produce better models.
4. **Multiple training runs:** Try different model sizes (`yolo11n` is faster, `yolo11x` is more accurate) and hyperparameters to find what works for your data.
5. **Save best weights:** After training, manually copy `runs/<RUN_NAME>/weights/best.pt` to a safe location for production use.
6. **Re-export for inference:** If you trained locally, remember to export the `.pt` file to other formats (ONNX, TensorFlow) if deploying to other systems.

---

## Environment Setup (Manual Alternative)

If you prefer not to use `install.sh` or `install.bat`, you can set up manually:

**On Linux / macOS:**

```bash
# Create backend venv
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

# Create training venv
python3 -m venv .venv-train
.venv-train/bin/pip install -r requirements-train.txt

# Install frontend
cd frontend && npm install && cd ..

# Create dataset structure
mkdir -p dataset/{images/train,images/val,images/test,labels/train,labels/val,labels/test,videos}
echo "object" > dataset/classes.txt
cat > dataset/data.yaml <<EOF
path: .
train: images/train
val: images/val
test: images/test
names:
  0: object
EOF
```

**On Windows:**

```cmd
REM Create backend venv
python -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt

REM Create training venv
python -m venv .venv-train
.venv-train\Scripts\pip install -r requirements-train.txt

REM Install frontend
cd frontend && npm install && cd ..

REM Create dataset structure
mkdir dataset\images\train
mkdir dataset\images\val
mkdir dataset\images\test
mkdir dataset\labels\train
mkdir dataset\labels\val
mkdir dataset\labels\test
mkdir dataset\videos

echo object > dataset\classes.txt

REM Create data.yaml (use notepad or your editor)
```

---

## License & Attribution

This project uses:
- **FastAPI** – async web framework
- **Next.js / React** – UI framework
- **Ultralytics YOLOv11** – object detection model
- **OpenCV** – computer vision library

---

## Support & Contributing

For issues, questions, or feature requests, check the backend logs (`.backend.log`, `.frontend.log`) for error details. Most problems are easily resolved by re-running `install.sh` or checking paths in the UI.
