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

### 2. Drop your videos

Place all video files into `dataset/videos/`:

```
dataset/videos/
```

Supported formats: `.mp4`, `.mov`, `.avi`, `.mkv`, `.m4v`, `.webm`

---

### 3. Extract frames

Extracts evenly-spaced frames from every video and saves them alongside the videos in `dataset/videos/`.

**On Linux / macOS:**

```bash
# Extract 5 frames per second (default)
.venv/bin/python scripts/1_extract_frames.py

# Extract at a different rate
.venv/bin/python scripts/1_extract_frames.py --fps 2

# Extract from a single video
.venv/bin/python scripts/1_extract_frames.py --video dataset/videos/myvideo.mp4 --fps 10
```

**On Windows:**

```cmd
REM Extract 5 frames per second (default)
.venv\Scripts\python scripts\1_extract_frames.py

REM Extract at a different rate
.venv\Scripts\python scripts\1_extract_frames.py --fps 2

REM Extract from a single video
.venv\Scripts\python scripts\1_extract_frames.py --video dataset\videos\myvideo.mp4 --fps 10
```

After extraction, `dataset/videos/` contains both your original video files and the extracted frames together.

---

### 4. Split frames into train / val / test

Reads extracted frames from `dataset/videos/`, groups them by source video, and moves them into `images/train/`, `images/val/`, and `images/test/` using a 70 / 20 / 10 split.

Frames are **interleaved** across splits — every ~7th frame goes to val, every ~10th to test — so each split sees frames from throughout the whole video rather than a block at the end. Video files (`.mp4`, `.mkv`, etc.) are left untouched in `dataset/videos/`.

**On Linux / macOS:**

```bash
.venv/bin/python scripts/2_split_dataset.py
```

**On Windows:**

```cmd
.venv\Scripts\python scripts\2_split_dataset.py
```

**Re-run safe:** Once frames are moved out of `dataset/videos/` they won't be seen again. To add more data, drop a new video in `dataset/videos/`, extract its frames, and re-run the split — existing splits are never touched.

---

### 5. Label images

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

### 6. Train your YOLOv11 model

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
├── videos/                ← drop your videos here; extracted frames land here too
│   ├── myvideo.mp4
│   ├── myvideo_frame_000000.jpg   ← written by extract script
│   ├── myvideo_frame_000054.jpg
│   └── ...
├── images/
│   ├── train/             ← frames moved here by the split script (70%)
│   ├── val/               ← frames moved here by the split script (20%)
│   └── test/              ← frames moved here by the split script (10%)
├── labels/
│   ├── train/             ← YOLO .txt label files (auto-generated by labeler)
│   ├── val/               ← validation labels
│   └── test/              ← test labels
├── classes.txt            ← one class name per line (auto-managed by labeler)
└── data.yaml              ← YOLO training config (auto-created by install, updated by training script)
```

### What goes where?

- **Videos:** Drop `.mp4` / `.mkv` / etc. into `videos/`. Extracted frames land in the same folder.
- **Images:** Managed entirely by the split script — don't place images manually.
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

# 2. Drop videos into dataset/videos/
cp ~/my_videos/*.mp4 dataset/videos/

# 3. Extract frames (saved alongside videos in dataset/videos/)
.venv/bin/python scripts/1_extract_frames.py --fps 5

# 4. Split frames into train/val/test
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

REM 2. Drop videos into dataset\videos\
copy C:\path\to\your\videos\*.mp4 dataset\videos\

REM 3. Extract frames (saved alongside videos in dataset\videos\)
.venv\Scripts\python scripts\1_extract_frames.py --fps 5

REM 4. Split frames into train/val/test
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
