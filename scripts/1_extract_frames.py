"""
Extract frames from videos into dataset/images/train.

Usage examples (run from repo root):
    python scripts/1_extract_frames.py
    python scripts/1_extract_frames.py --frames-per-video 100
    python scripts/1_extract_frames.py --video dataset/videos/myvideo.mp4 --frames-per-video 200
"""
import argparse
import sys
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


def find_videos(input_dir: Path) -> List[Path]:
    videos: List[Path] = []
    for ext in VIDEO_EXTENSIONS:
        videos.extend(input_dir.rglob(f"*{ext}"))
    videos.sort()
    return videos


def compute_frame_indices(total_frames: int, frames_per_video: int) -> List[int]:
    if total_frames <= 0:
        return []
    if frames_per_video <= 0 or frames_per_video >= total_frames:
        return list(range(total_frames))
    step = total_frames / float(frames_per_video)
    indices = [min(int(round(i * step)), total_frames - 1) for i in range(frames_per_video)]
    return sorted(set(indices))


def extract_frames_from_video(
    video_path: Path,
    output_dir: Path,
    frames_per_video: int,
    image_format: str = "jpg",
) -> int:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[WARN] Could not open video: {video_path}")
        return 0

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0

    if frame_count <= 0:
        manual_count = 0
        while True:
            ret, _ = cap.read()
            if not ret:
                break
            manual_count += 1
        cap.release()

        if manual_count <= 0:
            print(f"[WARN] Video has zero frames: {video_path}")
            return 0

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            print(f"[WARN] Could not re-open video: {video_path}")
            return 0
        frame_count = manual_count

    indices = compute_frame_indices(frame_count, frames_per_video)
    if not indices:
        cap.release()
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)

    indices_set = set(indices)
    written = 0
    current_index = 0
    stem = video_path.stem
    image_format = image_format.lower().lstrip(".")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if current_index in indices_set:
            frame_name = f"{stem}_frame_{current_index:06d}.{image_format}"
            frame_path = output_dir / frame_name
            ok = cv2.imwrite(str(frame_path), frame)
            if ok:
                written += 1
            else:
                print(f"[WARN] Failed to write frame: {frame_path}")
        current_index += 1

    cap.release()
    return written


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract frames from videos into dataset/images/train.",
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
        default=REPO_ROOT / "dataset" / "images" / "train",
        help="Directory where extracted frames will be saved.",
    )
    parser.add_argument(
        "--frames-per-video",
        type=int,
        default=50,
        help="How many evenly-spaced frames to extract per video. 0 = all frames.",
    )
    parser.add_argument(
        "--image-format",
        type=str,
        default="jpg",
        help="Output image format (jpg or png).",
    )
    args = parser.parse_args()

    output_dir: Path = args.output_dir
    frames_per_video: int = args.frames_per_video
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

    print(
        f"[INFO] Extracting up to {frames_per_video if frames_per_video > 0 else 'ALL'} "
        f"frame(s) per video into {output_dir}"
    )

    total_written = 0
    for vid in videos:
        print(f"[INFO] Processing: {vid.name}")
        written = extract_frames_from_video(
            video_path=vid,
            output_dir=output_dir,
            frames_per_video=frames_per_video,
            image_format=image_format,
        )
        print(f"       -> wrote {written} frame(s)")
        total_written += written

    print(f"\n[DONE] Total frames written: {total_written}")
    print(f"       Frames are in: {output_dir}")
    print(f"\nNext step: python scripts/2_split_dataset.py")


if __name__ == "__main__":
    main()
