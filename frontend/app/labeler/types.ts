export type Box = {
  class_id: number;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
};

export const SPLITS = ["train", "val", "test"] as const;
export type Split = (typeof SPLITS)[number];

export type ProjectBanner = { name: string; datasetRoot: string | null };

export function stemFromFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot <= 0 ? filename : filename.slice(0, lastDot);
}

export const STORAGE_SELECTED_CLASS_KEY = "omniLabel:selectedClassIndex";
export const imageIndexStorageKey = (split: Split) => `omniLabel:imageIndex:${split}`;

export function boxesSnapshot(boxes: Box[]): string {
  return boxes
    .map(
      (b) =>
        `${b.class_id} ${b.x_center.toFixed(6)} ${b.y_center.toFixed(6)} ${b.width.toFixed(6)} ${b.height.toFixed(6)}`
    )
    .join("\n");
}
