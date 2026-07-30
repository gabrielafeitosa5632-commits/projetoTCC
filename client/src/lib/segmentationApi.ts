export interface SegmentationMetrics {
  expectedLeafAreaPx: number;
  presentLeafAreaPx: number;
  internalHoleAreaPx: number;
  marginalLossAreaPx: number;
  removedAreaPx: number;
  defoliationPercent: number;
  healthyPercent: number;
  chlorosisPercent: number;
  necrosisPercent: number;
}

export interface SegmentationImages {
  whiteBackground: string;
  overlay: string;
  leafMask: string;
  expectedLeafMask: string;
  removedAreaMask: string;
  segmentationMap?: string;
  expectedContour?: string;
  presentArea?: string;
  healthyMask?: string;
  chlorosisMask?: string;
  necrosisMask?: string;
  uncertainMask?: string;
  coarseForegroundMask?: string;
  internalHolesMask?: string;
  marginalLossMask?: string;
}

export interface SegmentationAreaMetrics {
  id: "folhaInteira" | "apice" | "base" | "bordas";
  expectedLeafAreaPx: number;
  presentLeafAreaPx: number;
  removedAreaPx: number;
  defoliationPercent: number;
}

export interface SegmentationApiResponse {
  success: true;
  confidence: number;
  metrics: SegmentationMetrics;
  images: SegmentationImages;
  warnings: string[];
  areas?: SegmentationAreaMetrics[];
  model?: string;
  pipelineVersion?: string;
  processingTimeMs?: number;
}

export interface SegmentLeafRequest {
  signal?: AbortSignal;
  sensitivity?: "automatico" | "conservador" | "padrao" | "sensivel";
}

const configuredBaseUrl = (
  import.meta.env.VITE_SEGMENTATION_API_URL as string | undefined
)?.replace(/\/$/, "");

export function isSegmentationApiEnabled() {
  return Boolean(configuredBaseUrl) || import.meta.env.DEV;
}

function dataUrlToBlob(dataUrl: string) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match)
    throw new Error("A imagem selecionada não está em formato data URL.");

  const mimeType = match[1] || "image/jpeg";
  const bytes = match[2]
    ? Uint8Array.from(atob(match[3]), character => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(match[3]));
  return new Blob([bytes], { type: mimeType });
}

function isValidResponse(value: unknown): value is SegmentationApiResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<SegmentationApiResponse>;
  return (
    response.success === true &&
    typeof response.confidence === "number" &&
    Boolean(response.metrics) &&
    Boolean(response.images?.whiteBackground) &&
    Boolean(response.images?.overlay) &&
    Array.isArray(response.warnings)
  );
}

export async function segmentLeafWithApi(
  imageDataUrl: string,
  request: SegmentLeafRequest = {}
): Promise<SegmentationApiResponse> {
  const endpoint = configuredBaseUrl
    ? `${configuredBaseUrl}/api/segment-leaf`
    : "/api/segment-leaf";
  const form = new FormData();
  const blob = dataUrlToBlob(imageDataUrl);
  const extension =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : "jpg";
  form.append("image", blob, `leaf.${extension}`);
  form.append("sensitivity", request.sensitivity || "automatico");

  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
    signal: request.signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `API de segmentação indisponível (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`
    );
  }

  const payload: unknown = await response.json();
  if (!isValidResponse(payload)) {
    throw new Error("A API de segmentação retornou um contrato inválido.");
  }
  return payload;
}
