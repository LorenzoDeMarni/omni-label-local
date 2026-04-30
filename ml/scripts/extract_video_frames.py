import argparse
import sys
from pathlib import Path
from typing import List

try:
    import cv2
except ImportError as exc:
    raise SystemExit(
        "OpenCV (cv2) is required for this script.\n"
        "Install it with:\n\n"
        "    pip install opencv-python\n"
    ) from exc


VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm")


def find_videos(input_dir: Path) -> List[Path]:
    videos: List[Path] = []
    for ext in VIDEO_EXTENSIONS:
        videos.extend(input_dir.rglob(f"*{ext}"))
    videos.sort()
    return videos


def compute_frame_indices(total_frames: int, frames_per_video: int) -> List[int]:
    """
    Choose at most `frames_per_video` indices from range(total_frames),
    roughly evenly spaced.
    """
    if total_frames <= 0:
        return []
    if frames_per_video <= 0 or frames_per_video >= total_frames:
        return list(range(total_frames))

    step = total_frames / float(frames_per_video)
    indices = [min(int(round(i * step)), total_frames - 1) for i in range(frames_per_video)]
    unique_sorted = sorted(set(indices))
    return unique_sorted


def extract_frames_from_video(
    video_path: Path,
    output_dir: Path,
    frames_per_video: int,
    image_format: str = "jpg",
) -> int:
    """Extract frames from a single video. Returns the number of frames written."""
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
            print(f"[WARN] Video has zero frames (or could not be read): {video_path}")
            return 0

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            print(f"[WARN] Could not re-open video after counting: {video_path}")
            return 0
        frame_count = manual_count

    indices = compute_frame_indices(frame_count, frames_per_video)
    if not indices:
        print(f"[WARN] No frame indices selected for: {video_path}")
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
                print(f"[WARN] Failed to write frame to: {frame_path}")

        current_index += 1

    cap.release()
    return written


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract frames from one or more videos.\n\n"
            "You can either:\n"
            "  - specify a single video with --video, OR\n"
            "  - let the script scan a directory of videos with --input-dir.\n\n"
            "By default, it looks for videos under 'ml/datasets/videos' and writes\n"
            "frames into 'ml/datasets/images'."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "--video",
        type=Path,
        default=None,
        help="Path to a single video file to process. Ignored if --input-dir is set.",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("datasets") / "videos",
        help="Directory containing videos (searched recursively).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("datasets") / "images",
        help="Directory where extracted frames will be saved.",
    )
    parser.add_argument(
        "--frames-per-video",
        type=int,
        default=50,
        help="How many frames to extract per video. If 0 or greater than total, all frames are saved.",
    )
    parser.add_argument(
        "--image-format",
        type=str,
        default="jpg",
        help="Output image format/extension (e.g., jpg, png).",
    )

    return parser.parse_args(argv)


def main(argv: List[str] | None = None) -> None:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    output_dir: Path = args.output_dir
    frames_per_video: int = args.frames_per_video
    image_format: str = args.image_format
    single_video: Path | None = args.video

    if single_video is not None:
        if not single_video.exists():
            print(f"[ERROR] Video file does not exist: {single_video}")
            raise SystemExit(1)
        videos = [single_video]
        print(f"[INFO] Processing single video: {single_video}")
        if output_dir == Path("datasets") / "images":
            output_dir = output_dir / single_video.stem
            print(f"[INFO] Output directory automatically set to: {output_dir}")
    else:
        input_dir: Path = args.input_dir
        if not input_dir.exists():
            print(f"[ERROR] Input directory does not exist: {input_dir}")
            raise SystemExit(1)

        videos = find_videos(input_dir)
        if not videos:
            print(f"[ERROR] No videos found under: {input_dir}")
            raise SystemExit(1)

        print(f"[INFO] Found {len(videos)} video(s) under {input_dir}")

    print(
        f"[INFO] Extracting up to {frames_per_video if frames_per_video > 0 else 'ALL'} "
        f"frame(s) per video to {output_dir}"
    )

    total_written = 0
    for vid in videos:
        print(f"[INFO] Processing: {vid}")
        written = extract_frames_from_video(
            video_path=vid,
            output_dir=output_dir,
            frames_per_video=frames_per_video,
            image_format=image_format,
        )
        print(f"       -> wrote {written} frame(s)")
        total_written += written

    print(f"[DONE] Total frames written: {total_written}")


if __name__ == "__main__":
    main()
