"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./page.css";

const API_BASE = "http://localhost:8000/api";

interface Label {
  class_id: number;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

interface ImageData {
  filename: string;
  stem: string;
  data: string;
  labeled: boolean;
}

interface DatasetStatus {
  total_images: number;
  total_labeled: number;
  total_unlabeled: number;
  splits: { [key: string]: { total: number; labeled: number; unlabeled: number } };
  classes: string[];
  class_count: number;
}

export default function Home() {
  const [stage, setStage] = useState<"upload" | "split" | "label" | "train">("upload");
  const [split, setSplit] = useState<"train" | "val" | "test">("train");
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputVideoRef = useRef<HTMLInputElement>(null);
  const fileInputImageRef = useRef<HTMLInputElement>(null);
  const [drawingBox, setDrawingBox] = useState<{ start: [number, number] | null; end: [number, number] | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    if (stage === "label" && status) {
      loadImagesForSplit(split);
    }
  }, [stage, split, status]);

  useEffect(() => {
    if (images.length > 0) {
      loadCurrentImage();
    }
  }, [currentImageIdx, images]);

  useEffect(() => {
    drawCanvas();
  }, [labels, drawingBox]);

  const refreshStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dataset-status`);
      setStatus(res.data);
      setClasses(res.data.classes);
      if (res.data.classes.length > 0) {
        setSelectedClassIdx(0);
      }
    } catch (e) {
      console.error("Failed to refresh status:", e);
    }
  };

  const loadImagesForSplit = async (selectedSplit: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/images/${selectedSplit}`);
      setImages(res.data.images);
      setCurrentImageIdx(0);
      setLabels([]);
    } catch (e) {
      console.error("Failed to load images:", e);
      setMessage("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentImage = async () => {
    if (images.length === 0) return;
    try {
      const img = images[currentImageIdx];
      const res = await axios.get(`${API_BASE}/labels/${split}/${img.stem}`);
      setLabels(res.data.labels);
    } catch (e) {
      setLabels([]);
    }
  };

  const uploadVideos = async (files: FileList | null) => {
    if (!files) return;
    try {
      setLoading(true);
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const uploadRes = await axios.post(`${API_BASE}/upload/videos`, formData);
      setMessage(`Uploaded ${uploadRes.data.count} video(s). Extracting frames...`);

      const extractRes = await axios.post(`${API_BASE}/extract-frames`);
      setMessage(`✓ Extracted frames. Total images: ${extractRes.data.total_images}`);
      refreshStatus();
    } catch (e) {
      setMessage("Error uploading videos");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files) return;
    try {
      setLoading(true);
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const res = await axios.post(`${API_BASE}/upload/images`, formData);
      setMessage(`✓ Uploaded ${res.data.count} image(s). Total: ${res.data.total_images}`);
      refreshStatus();
    } catch (e) {
      setMessage("Error uploading images");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const splitDataset = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/split-dataset`);
      setMessage("✓ Dataset split complete! Ready to label.");
      setStage("label");
      refreshStatus();
    } catch (e) {
      setMessage("Error splitting dataset");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveLabels = async () => {
    try {
      const img = images[currentImageIdx];
      await axios.post(`${API_BASE}/save-labels`, {
        split,
        image_stem: img.stem,
        labels,
      });
      setMessage(`✓ Saved labels for ${img.filename}`);
    } catch (e) {
      setMessage("Error saving labels");
      console.error(e);
    }
  };

  const addClass = async () => {
    const name = prompt("Enter new class name:");
    if (!name) return;
    try {
      const res = await axios.post(`${API_BASE}/class/add`, { name });
      setClasses(res.data.classes);
      setMessage(`✓ Added class: ${name}`);
    } catch (e) {
      setMessage("Error adding class");
      console.error(e);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = `data:image/png;base64,${images[currentImageIdx].data}`;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw existing labels
      labels.forEach((label) => {
        const x1 = (label.x_center - label.width / 2) * img.width;
        const y1 = (label.y_center - label.height / 2) * img.height;
        const x2 = (label.x_center + label.width / 2) * img.width;
        const y2 = (label.y_center + label.height / 2) * img.height;

        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        const className = classes[label.class_id] || `Class ${label.class_id}`;
        ctx.fillStyle = "#00FF00";
        ctx.font = "14px Arial";
        ctx.fillText(className, x1, y1 - 5);
      });

      // Draw preview box if drawing
      if (drawingBox.start && drawingBox.end) {
        ctx.strokeStyle = "#FFFF00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          drawingBox.start[0],
          drawingBox.start[1],
          drawingBox.end[0] - drawingBox.start[0],
          drawingBox.end[1] - drawingBox.start[1]
        );
        ctx.setLineDash([]);
      }
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setDrawingBox({ start: [e.clientX - rect.left, e.clientY - rect.top], end: null });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingBox.start) return;
    const rect = canvas.getBoundingClientRect();
    setDrawingBox({
      start: drawingBox.start,
      end: [e.clientX - rect.left, e.clientY - rect.top],
    });
  };

  const handleCanvasMouseUp = () => {
    if (!drawingBox.start || !drawingBox.end || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const x1 = Math.min(drawingBox.start[0], drawingBox.end[0]);
    const y1 = Math.min(drawingBox.start[1], drawingBox.end[1]);
    const x2 = Math.max(drawingBox.start[0], drawingBox.end[0]);
    const y2 = Math.max(drawingBox.start[1], drawingBox.end[1]);

    const x_center = (x1 + x2) / 2 / canvas.width;
    const y_center = (y1 + y2) / 2 / canvas.height;
    const width = (x2 - x1) / canvas.width;
    const height = (y2 - y1) / canvas.height;

    const newLabel: Label = {
      class_id: selectedClassIdx,
      x_center,
      y_center,
      width,
      height,
    };

    setLabels([...labels, newLabel]);
    setDrawingBox({ start: null, end: null });
  };

  const deleteLabel = (idx: number) => {
    setLabels(labels.filter((_, i) => i !== idx));
  };

  const nextImage = () => {
    saveLabels();
    setCurrentImageIdx((i) => (i + 1) % images.length);
  };

  const prevImage = () => {
    saveLabels();
    setCurrentImageIdx((i) => (i - 1 + images.length) % images.length);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>omni-label-local</h1>
        <p>Train YOLOv11 medium object detection models</p>
      </header>

      {message && <div className="message">{message}</div>}

      {stage === "upload" && (
        <div className="stage-container">
          <h2>Step 1: Upload Data</h2>
          <div className="upload-section">
            <div className="upload-box">
              <h3>Upload Videos</h3>
              <input
                type="file"
                ref={fileInputVideoRef}
                multiple
                accept=".mp4,.mov,.avi,.mkv"
                onChange={(e) => uploadVideos(e.target.files)}
              />
              <button onClick={() => fileInputVideoRef.current?.click()}>
                📹 Choose Videos
              </button>
              <p>Videos will be converted to frames at 50 frames per video</p>
            </div>

            <div className="upload-box">
              <h3>Upload Images</h3>
              <input
                type="file"
                ref={fileInputImageRef}
                multiple
                accept=".jpg,.jpeg,.png,.bmp"
                onChange={(e) => uploadImages(e.target.files)}
              />
              <button onClick={() => fileInputImageRef.current?.click()}>
                🖼️ Choose Images
              </button>
              <p>Add any existing images to your dataset</p>
            </div>
          </div>

          {status && (
            <div className="status-box">
              <h3>Dataset Status</h3>
              <p>Total images: {status.total_images}</p>
              <p>Classes: {status.class_count}</p>
            </div>
          )}

          <button
            className="primary-btn"
            onClick={splitDataset}
            disabled={!status || status.total_images === 0 || loading}
          >
            {loading ? "Processing..." : "Next: Split Dataset"}
          </button>
        </div>
      )}

      {stage === "split" && (
        <div className="stage-container">
          <h2>Step 2: Dataset Split</h2>
          <p>Your images have been split into train/val/test sets.</p>
          {status && (
            <div className="splits-grid">
              {Object.entries(status.splits).map(([key, val]) => (
                <div key={key} className="split-card">
                  <h3>{key}</h3>
                  <p>{val.total} images</p>
                </div>
              ))}
            </div>
          )}
          <button className="primary-btn" onClick={() => setStage("label")}>
            Next: Label Images
          </button>
        </div>
      )}

      {stage === "label" && (
        <div className="stage-container">
          <h2>Step 3: Label Images</h2>

          <div className="labeler-wrapper">
            <div className="canvas-area">
              <canvas
                ref={canvasRef}
                className="canvas"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => setDrawingBox({ start: null, end: null })}
              />
              <div className="canvas-controls">
                <button onClick={prevImage} disabled={images.length === 0}>
                  ← Previous
                </button>
                <span>
                  {currentImageIdx + 1} / {images.length}
                </span>
                <button onClick={nextImage} disabled={images.length === 0}>
                  Next →
                </button>
              </div>
            </div>

            <div className="sidebar">
              <div className="section">
                <h3>Split</h3>
                <select value={split} onChange={(e) => setSplit(e.target.value as any)}>
                  <option value="train">Train</option>
                  <option value="val">Validation</option>
                  <option value="test">Test</option>
                </select>
              </div>

              <div className="section">
                <h3>Classes</h3>
                <div className="classes-list">
                  {classes.map((cls, idx) => (
                    <button
                      key={idx}
                      className={`class-btn ${selectedClassIdx === idx ? "active" : ""}`}
                      onClick={() => setSelectedClassIdx(idx)}
                    >
                      {idx}: {cls}
                    </button>
                  ))}
                </div>
                <button className="secondary-btn" onClick={addClass}>
                  + Add Class
                </button>
              </div>

              <div className="section">
                <h3>Bounding Boxes</h3>
                <div className="boxes-list">
                  {labels.map((label, idx) => (
                    <div key={idx} className="box-item">
                      <span>{classes[label.class_id]}</span>
                      <button onClick={() => deleteLabel(idx)}>✕</button>
                    </div>
                  ))}
                </div>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setLabels([]);
                    saveLabels();
                  }}
                >
                  Clear All
                </button>
              </div>

              <button className="primary-btn" onClick={() => setStage("train")}>
                Next: Train Model
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "train" && (
        <div className="stage-container">
          <h2>Step 4: Train Model</h2>
          {status && (
            <div className="training-info">
              <h3>Dataset Summary</h3>
              <div className="info-grid">
                <div>
                  <strong>Total Images:</strong> {status.total_images}
                </div>
                <div>
                  <strong>Labeled:</strong> {status.total_labeled}
                </div>
                <div>
                  <strong>Classes:</strong> {status.class_count}
                </div>
                <div>
                  <strong>Train/Val/Test:</strong> {status.splits.train?.total}/{status.splits.val?.total}/
                  {status.splits.test?.total}
                </div>
              </div>

              <h3 style={{ marginTop: "20px" }}>Training Command</h3>
              <p style={{ marginBottom: "10px" }}>
                Run this command from the repo root to train your model:
              </p>
              <code className="command-box">
                python ml/scripts/train_yolo11m.py --epochs 150 --batch 16 --imgsz 640
              </code>

              <h4 style={{ marginTop: "15px" }}>Optional Parameters:</h4>
              <ul>
                <li>
                  <code>--epochs 150</code> - Number of training iterations (default: 150)
                </li>
                <li>
                  <code>--batch 16</code> - Batch size (default: 16)
                </li>
                <li>
                  <code>--imgsz 640</code> - Image size (default: 640)
                </li>
                <li>
                  <code>--patience 40</code> - Early stopping patience (default: 40)
                </li>
                <li>
                  <code>--cpu</code> - Force CPU training
                </li>
              </ul>

              <h4 style={{ marginTop: "15px" }}>After Training:</h4>
              <p>Find your trained model at:</p>
              <code className="command-box">ml/artifacts/runs/detect/yolo11m_train/weights/best.pt</code>
            </div>
          )}

          <button className="secondary-btn" onClick={() => setStage("label")}>
            ← Back to Labeling
          </button>
        </div>
      )}
    </div>
  );
}
