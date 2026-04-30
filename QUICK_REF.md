# 📋 Quick Reference Card

## 🚀 Start Everything (First Time)

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
start.bat
```

Then follow the instructions (run backend and frontend in separate terminals).

---

## 🚀 Start Everything (Future Times)

**Terminal 1 - Backend:**
```bash
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate.bat       # Windows

python -m uvicorn backend.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Training (when ready):**
```bash
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate.bat       # Windows

python ml/scripts/train_yolo11m.py
```

---

## 🎯 Workflow

1. **Upload** videos/images → http://localhost:3000
2. **Split** dataset → 70% train, 20% val, 10% test
3. **Label** images in browser (draw boxes, assign classes)
4. **Train** model in terminal:
   ```bash
   python ml/scripts/train_yolo11m.py --epochs 150 --batch 16 --imgsz 640
   ```
5. **Find** model at: `ml/artifacts/runs/detect/yolo11m_train/weights/best.pt`

---

## 🎮 Labeling Shortcuts

| Key | Action |
|-----|--------|
| A or ← | Previous image |
| D or → | Next image |
| Click & drag | Draw bounding box |
| Delete button | Remove box |

---

## ⚡ Training Parameters

```bash
# Fast (5 minutes on GPU)
python ml/scripts/train_yolo11m.py --epochs 50 --batch 32 --imgsz 320

# Balanced (default, 30 min on GPU)
python ml/scripts/train_yolo11m.py --epochs 150 --batch 16 --imgsz 640

# High accuracy (2 hours on GPU, needs lots of data)
python ml/scripts/train_yolo11m.py --epochs 300 --batch 8 --imgsz 1280

# Force CPU (use if no GPU or CUDA issues)
python ml/scripts/train_yolo11m.py --cpu
```

---

## 📊 File Structure

```
omni-label-local/
├── backend/              ← API server
├── frontend/             ← Web UI (http://localhost:3000)
├── ml/
│   ├── datasets/        ← Your images & labels go here
│   ├── artifacts/       ← Training outputs
│   └── scripts/         ← train_yolo11m.py, etc.
├── requirements.txt     ← Python packages
└── README.md           ← Full guide
```

---

## 🔗 File Locations

| What | Where |
|-----|-------|
| Trained model | `ml/artifacts/runs/detect/yolo11m_train/weights/best.pt` |
| Your images | `ml/datasets/images/` |
| Your labels | `ml/datasets/labels/` |
| Class names | `ml/datasets/classes.txt` |
| Dataset config | `ml/datasets/data.yaml` |
| Web interface | http://localhost:3000 |
| API server | http://localhost:8000 |

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8000 in use | `python -m uvicorn backend.main:app --port 8001 --reload` |
| Port 3000 in use | `cd frontend && npm run dev -- -p 3001` |
| Module not found | `pip install -r requirements.txt` |
| Training very slow | Install CUDA or use `--cpu` |
| Can't upload videos | Check format: MP4, MOV, AVI, MKV, M4V, WEBM |

---

## 📧 Data Tips

- **Minimum:** 30 images per class
- **Good:** 100+ images per class
- **Excellent:** 500+ images per class
- **File formats:** JPG, PNG, BMP (images); MP4, MOV, AVI (videos)
- **File sizes:** < 5MB per image, videos any size

---

## 🎓 Learning Resources

- [YOLO Documentation](https://docs.ultralytics.com/)
- [Fast.ai ML Course](https://www.fast.ai/)
- [PyTorch Tutorials](https://pytorch.org/tutorials/)

---

**Need help? Check README.md or SETUP.md!**
