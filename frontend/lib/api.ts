const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";
const splitImagesCache = new Map<string, SplitImagesResponse>();
const splitStatsCache = new Map<string, SplitStatsResponse>();

export function getApiBase(): string {
  return API_BASE;
}

function clearDatasetCaches() {
  splitImagesCache.clear();
  splitStatsCache.clear();
}

export function extractApiErrorMessage(rawBody: string, status: number): string {
  const fallback = rawBody.trim() || `Request failed: ${status}`;
  try {
    const parsed = JSON.parse(rawBody) as { detail?: unknown; message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail.trim();
    }
    if (parsed.detail && typeof parsed.detail === "object" && "message" in parsed.detail) {
      const detailMessage = (parsed.detail as { message?: unknown }).message;
      if (typeof detailMessage === "string" && detailMessage.trim()) {
        return detailMessage.trim();
      }
    }
    if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
      const first = parsed.detail[0] as { msg?: unknown };
      if (first && typeof first.msg === "string" && first.msg.trim()) {
        return first.msg.trim();
      }
    }
  } catch {
    // non-JSON error body, keep fallback
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const headers = new Headers(init?.headers ?? {});
  if (hasBody && !headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach API at ${API_BASE}. ${message}`);
  }
  if (!response.ok) {
    const text = await response.text();
    const message = extractApiErrorMessage(text, response.status);
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  return response.json() as Promise<T>;
}

// ---- Dataset API (YOLO labeler) ----

export type DatasetClassesResponse = { classes: string[] };

export type DatasetRootResponse = { path: string | null };

export async function getDatasetClasses(): Promise<DatasetClassesResponse> {
  return request<DatasetClassesResponse>("/datasets/current/classes");
}

export async function getDatasetRoot(): Promise<DatasetRootResponse> {
  return request<DatasetRootResponse>("/datasets/current/root");
}

export async function setDatasetRoot(path: string): Promise<DatasetRootResponse> {
  const res = await request<DatasetRootResponse>("/datasets/current/root", {
    method: "PUT",
    body: JSON.stringify({ path })
  });
  clearDatasetCaches();
  return res;
}

export async function pickDatasetRoot(): Promise<DatasetRootResponse> {
  const res = await request<DatasetRootResponse>("/datasets/current/root/pick", {
    method: "POST"
  });
  clearDatasetCaches();
  return res;
}

export async function setDatasetClasses(classes: string[]): Promise<DatasetClassesResponse> {
  const res = await request<DatasetClassesResponse>("/datasets/current/classes", {
    method: "PUT",
    body: JSON.stringify({ classes })
  });
  splitStatsCache.clear();
  return res;
}

export type SplitImagesResponse = { filenames: string[] };

export async function getSplitImages(split: string, opts?: { force?: boolean }): Promise<SplitImagesResponse> {
  if (!opts?.force && splitImagesCache.has(split)) {
    return splitImagesCache.get(split)!;
  }
  const res = await request<SplitImagesResponse>(`/datasets/current/splits/${encodeURIComponent(split)}/images`);
  splitImagesCache.set(split, res);
  return res;
}

export type SplitStatsResponse = {
  split: string;
  class_counts: Record<string, number>;
  total_boxes: number;
  labeled_images: number;
};

export async function getSplitStats(split: string, opts?: { force?: boolean }): Promise<SplitStatsResponse> {
  if (!opts?.force && splitStatsCache.has(split)) {
    return splitStatsCache.get(split)!;
  }
  const res = await request<SplitStatsResponse>(`/datasets/current/splits/${encodeURIComponent(split)}/stats`);
  splitStatsCache.set(split, res);
  return res;
}

export function getImageUrl(split: string, filename: string): string {
  return `${API_BASE}/datasets/current/splits/${encodeURIComponent(split)}/images/${encodeURIComponent(filename)}`;
}

export async function getLabelFile(split: string, stem: string): Promise<string> {
  const url = `${API_BASE}/datasets/current/splits/${encodeURIComponent(split)}/labels/${encodeURIComponent(stem)}.txt`;
  const headers = new Headers();
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach API at ${API_BASE}. ${message}`);
  }
  if (response.status === 404) return "";
  if (!response.ok) {
    const text = await response.text();
    const message = extractApiErrorMessage(text, response.status);
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  return response.text();
}

export async function putLabelFile(split: string, stem: string, body: string): Promise<void> {
  const url = `${API_BASE}/datasets/current/splits/${encodeURIComponent(split)}/labels/${encodeURIComponent(stem)}.txt`;
  const headers = new Headers({ "Content-Type": "text/plain" });
  const response = await fetch(url, { method: "PUT", headers, body });
  if (!response.ok) {
    const text = await response.text();
    const message = extractApiErrorMessage(text, response.status);
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  splitStatsCache.delete(split);
}
