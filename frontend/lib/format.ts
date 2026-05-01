export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatLocaleNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDenseNumber(value: number): { compact: string; full: string } {
  return {
    compact: formatCompactNumber(value),
    full: formatLocaleNumber(value)
  };
}
