"""
Extract frames from videos into dataset/videos/ at a given frames-per-second rate.

Usage examples (run from repo root):
    python scripts/1_extract_frames.py
    python scripts/1_extract_frames.py --fps 2
    python scripts/1_extract_frames.py --video dataset/videos/myvideo.mp4 --fps 10
"""
import argparse
from pathlib import Path
from typing import List

try:
    import cv2
except ImportError as exc:
    raise SystemExit(
        "OpenCV (cv2) is required.\n"
        "Install it with:\n\n"
        "    pip install opencv-python\n"
        "(or activate your backend venv first)\n"
    ) from exc

REPO_ROOT = Path(__file__).resolve().parent.parent
VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm")

DEFAULT_FPS = 5


def find_videos(input_dir: Path) -> List[Path]:
    videos: List[Path] = []
    for ext in VIDEO_EXTENSIONS:
        videos.extend(input_dir.rglob(f"*{ext}"))
    videos.sort()
    return videos


def extract_frames_from_video(
    video_path: Path,
    output_dir: Path,
    desired_fps: float,
    image_format: str = "jpg",
) -> int:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[WARN] Could not open video: {video_path}")
        return 0

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if not video_fps or video_fps <= 0:
        print(f"[WARN] Could not read FPS for {video_path.name} — extracting all frames.")
        video_fps = desired_fps  # step = 1, extract every frame

    # How many source frames to skip between each extracted frame.
    # e.g. 30fps video at 5fps desired → extract every 6th frame.
    step = max(1.0, video_fps / desired_fps)

    output_dir.mkdir(parents=True, exist_ok=True)

    stem = video_path.stem
    image_format = image_format.lower().lstrip(".")
    written = 0
    current_index = 0
    next_extract = 0.0  # next source frame index to extract

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if current_index >= int(round(next_extract)):
            frame_name = f"{stem}_frame_{current_index:06d}.{image_format}"
            frame_path = output_dir / frame_name
            if cv2.imwrite(str(frame_path), frame):
                written += 1
            else:
                print(f"[WARN] Failed to write frame: {frame_path}")
            next_extract += step
        current_index += 1

    cap.release()
    return written


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract frames from videos at a given frames-per-second rate.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--video",
        type=Path,
        default=None,
        help="Path to a single video file. If set, --input-dir is ignored.",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=REPO_ROOT / "dataset" / "videos",
        help="Directory containing videos (searched recursively).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPO_ROOT / "dataset" / "videos",
        help="Directory where extracted frames will be saved.",
    )
    parser.add_argument(
        "--fps",
        type=float,
        default=DEFAULT_FPS,
        help="How many frames per second to extract. Use 0 to extract every frame.",
    )
    parser.add_argument(
        "--image-format",
        type=str,
        default="jpg",
        help="Output image format (jpg or png).",
    )
    args = parser.parse_args()

    output_dir: Path = args.output_dir
    desired_fps: float = args.fps if args.fps > 0 else float("inf")
    image_format: str = args.image_format

    if args.video is not None:
        if not args.video.exists():
            print(f"[ERROR] Video file does not exist: {args.video}")
            raise SystemExit(1)
        videos = [args.video]
        print(f"[INFO] Processing single video: {args.video}")
    else:
        input_dir: Path = args.input_dir
        if not input_dir.exists():
            print(f"[ERROR] Input directory does not exist: {input_dir}")
            print(f"       Create it and drop videos inside: {input_dir}")
            raise SystemExit(1)
        videos = find_videos(input_dir)
        if not videos:
            print(f"[ERROR] No videos found under: {input_dir}")
            raise SystemExit(1)
        print(f"[INFO] Found {len(videos)} video(s) under {input_dir}")

    fps_label = f"{desired_fps:g}" if desired_fps != float("inf") else "ALL"
    print(f"[INFO] Extracting at {fps_label} fps into {output_dir}")

    total_written = 0
    for vid in videos:
        print(f"[INFO] Processing: {vid.name}")
        written = extract_frames_from_video(
            video_path=vid,
            output_dir=output_dir,
            desired_fps=desired_fps,
            image_format=image_format,
        )
        print(f"       -> wrote {written} frame(s)")
        total_written += written

    print(f"\n[DONE] Total frames written: {total_written}")
    print(f"       Frames are in: {output_dir}")
    print(f"\nNext step: .venv/bin/python scripts/2_split_dataset.py")


if __name__ == "__main__":
    main()
