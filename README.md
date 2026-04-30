# 🎯 omni-label-local

**Train your own custom object detection AI model in minutes!**

This is a simple tool that lets you:
- ✅ Upload videos or images
- ✅ Automatically extract frames from videos
- ✅ Label objects in your images with a web interface
- ✅ Split data into training/validation/test sets
- ✅ Train a powerful YOLOv11 medium AI model

Perfect for school projects, science fairs, and learning about machine learning!

---

## 📋 Prerequisites

Before you start, make sure you have:

1. **Python 3.10+** - Download from [python.org](https://www.python.org/downloads/)
2. **Git** - Download from [git-scm.com](https://git-scm.com/)
3. **Node.js 18+** (Optional, for Docker setup) - Download from [nodejs.org](https://nodejs.org/)
4. **~5-10 GB of free disk space**

### For GPU Training (Recommended)
If you have an NVIDIA GPU, install CUDA for 10x faster training:
```bash
pip uninstall -y torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
```

---

## 🚀 Quick Start (5 Minutes)

### 1️⃣ Clone the Repository
```bash
cd ~/Repos/Projects
git clone <your-repo-url> omni-label-local
cd omni-label-local
```

### 2️⃣ Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3️⃣ Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4️⃣ Start the Backend Server
Open a terminal and run:
```bash
python -m uvicorn backend.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 5️⃣ Start the Frontend
Open another terminal and run:
```bash
cd frontend
npm run dev
```

You should see:
```
> Local:        http://localhost:3000
```

### 6️⃣ Open Your Browser
Go to: **http://localhost:3000**

---

## 📖 Step-by-Step Workflow

### Step 1: Upload Your Data 📹
You can upload videos or images:

**Option A: Upload Videos**
- Click "📹 Choose Videos"
- Select MP4, MOV, AVI, or MKV files
- Videos are automatically converted to image frames
- Default: 50 frames per video

**Option B: Upload Images Directly**
- Click "🖼️ Choose Images"
- Select JPG, PNG, BMP, or TIFF files
- Add as many as you want!

**You can do both!** Mix videos and images for maximum flexibility.

### Step 2: Split Your Dataset 📊
Click "Next: Split Dataset" to automatically divide your images into:
- **Train (70%)** - Used to train the model
- **Validation (20%)** - Used to check if training is working
- **Test (10%)** - Used to test the final model

### Step 3: Label Your Images 🏷️
1. Select which set to label: Train, Validation, or Test
2. For each image:
   - **Click your class** (e.g., "cat", "dog", "person")
   - **Draw a box** around the object by clicking and dragging
   - Repeat for all objects in the image
   - Click "← Previous" or "Next →" to move between images
3. Labels are **automatically saved** as you navigate

**Keyboard Shortcuts:**
- Press "A" or Left Arrow: Previous image
- Press "D" or Right Arrow: Next image

### Step 4: Train Your Model 🤖
Once you've labeled enough images:

1. Click "Next: Train Model"
2. Review your dataset statistics
3. Copy the training command:

```bash
python ml/scripts/train_yolo11m.py --epochs 150 --batch 16 --imgsz 640
```

4. Run it in a terminal from the repo root
5. Watch your model train! This takes 5-60 minutes depending on:
   - Number of images you have
   - Whether you're using GPU or CPU
   - How many epochs you set

**Example output:**
```
[DONE] Total frames written: 245
✓ Class check OK: nc=3
✓ Training imgsz: 640
Starting training: YOLOv11 medium
...
✓ Training complete!
✓ Model saved to: ml/artifacts/runs/detect/yolo11m_train
```

---

## 🎮 Training Parameters Explained

When running the training script, you can customize these options:

```bash
python ml/scripts/train_yolo11m.py \
  --epochs 150          # How many times to train (default: 150) - more = better but slower
  --batch 16            # How many images to process at once (default: 16)
  --imgsz 640           # Image resolution (default: 640) - larger = more detail but slower
  --patience 40         # Stop early if no improvement for N epochs (default: 40)
  --cpu                 # Use CPU instead of GPU
  --name my_model       # Custom name for your model
```

**Quick presets:**
- **Fast training:** `--epochs 50 --batch 32 --imgsz 320`
- **Balanced:** `--epochs 150 --batch 16 --imgsz 640` (default)
- **High accuracy:** `--epochs 300 --batch 8 --imgsz 1280` (slow!)

---

## 📍 Finding Your Trained Model

After training completes, your model is saved at:

```
ml/artifacts/runs/detect/yolo11m_train/weights/best.pt
```

This is your AI model! You can:
- Use it for inference on new images
- Share it with friends
- Deploy it to your Raspberry Pi
- Fine-tune it with more data

---

## ⚙️ Alternative: Run with Docker

If you have Docker installed, you can run everything in containers:

```bash
docker-compose up
```

Then open: **http://localhost:3000**

---

## 🆘 Troubleshooting

### Problem: "No module named 'torch'"
**Solution:** Reinstall dependencies
```bash
pip install -r requirements.txt
```

### Problem: "Port 8000 is already in use"
**Solution:** The backend is already running. Use a different port:
```bash
python -m uvicorn backend.main:app --port 8001 --reload
```

### Problem: "CUDA out of memory" during training
**Solution:** Either use CPU or reduce batch size:
```bash
python ml/scripts/train_yolo11m.py --batch 8 --cpu
```

### Problem: "ModuleNotFoundError: No module named 'cv2'"
**Solution:** Install OpenCV
```bash
pip install opencv-python
```

### Problem: "Port 3000 is already in use"
**Solution:** Kill the process on that port or use a different one:
```bash
cd frontend
npm run dev -- -p 3001
```

### Problem: Videos won't upload
**Solution:** Make sure they're in a supported format: MP4, MOV, AVI, MKV, M4V, or WEBM

### Problem: Training is very slow
**Solution:** Make sure you have CUDA installed for GPU training. CPU training is much slower:
```bash
python ml/scripts/train_yolo11m.py --cpu  # This will be SLOW
```

---

## 📚 What's Happening Behind the Scenes?

Here's what the tool does:

1. **Video → Images:** Uses OpenCV to extract frames
2. **Splitting:** Randomly shuffles and divides images 70/20/10
3. **Labeling:** Saves bounding boxes in YOLO format (one `.txt` file per image)
4. **Training:** Uses YOLOv11 medium from Ultralytics to learn object detection
5. **Output:** Saves a trained model as `best.pt`

---

## 🎓 Learning Resources

Want to learn more about what's happening?

- **YOLO Object Detection:** https://docs.ultralytics.com/
- **Computer Vision:** https://www.computervision.org/
- **Machine Learning Basics:** https://www.fast.ai/
- **Python for ML:** https://realpython.com/

---

## 💡 Project Ideas

Here are some cool things you can detect:

- 🐕 **Pet Detection:** Train on cats, dogs, birds
- 🚗 **Vehicle Detection:** Cars, trucks, motorcycles
- 🌳 **Plant Detection:** Different plant species
- 👕 **Clothing:** Different types of clothing
- 🍎 **Produce:** Fruits and vegetables
- ⚽ **Sports:** Sports balls, equipment
- 🎮 **Gaming:** In-game objects

---

## 📧 Questions or Issues?

- Check the **Troubleshooting** section above
- Create an issue on GitHub
- Ask your teacher or classmates!

---

## 📄 License

This project is open source and free to use for educational purposes.

---

## 🚀 Next Steps

1. ✅ Get some data (videos or images)
2. ✅ Upload and label it
3. ✅ Train your model
4. ✅ Use it for something awesome!

**Happy learning! 🎉**

---

*Built with ❤️ for learning and science fairs*
