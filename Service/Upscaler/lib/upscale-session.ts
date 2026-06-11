/** Session + integrity helpers — isolate jobs, detect stale/mixed state, debug pipeline. */

export type UpscaleSessionIds = {
  requestId: string;
  inputImageId: string;
};

export type UpscaleDebugMeta = {
  requestId: string;
  inputImageId: string;
  engine: 'gemini' | 'openai';
  routeMode?: 'faithful' | 'generative';
  routeReasons?: string[];
  inputFileName: string;
  inputFileSize: number;
  inputMimeType: string;
  inputWidth: number;
  inputHeight: number;
  inputContentHash: string;
  apiPayloadImageHash?: string;
  apiPromptPreview?: string;
  resultWidth?: number;
  resultHeight?: number;
  resultContentHash?: string;
  downloadBlobHash?: string;
  previewMatchesDownload?: boolean;
  restoreCategory?: string;
  qualityVerdict?: string;
  edgeWhiteResidue?: number;
  edgeBrightHalo?: number;
  depthPreservation?: number;
  flatnessVsReference?: number;
  textGeometryScore?: number;
  textEdgeCorrelation?: number;
};

export type PipelineStage = {
  id: string;
  label: string;
  dataUrl: string;
  hash: string;
  width?: number;
  height?: number;
};

export type PipelineCompareResult = {
  faithful: string;
  generativeRaw: string | null;
  generativePost: string | null;
  stages: PipelineStage[];
};

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const hashArrayBuffer = async (buffer: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return toHex(digest);
};

export const hashBase64Payload = async (base64: string): Promise<string> => {
  const binary = atob(base64.replace(/^data:[^;]+;base64,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return hashArrayBuffer(bytes.buffer);
};

export const hashDataUrl = async (dataUrl: string): Promise<string> =>
  hashBase64Payload(dataUrl.split(',')[1] || dataUrl);

export const hashFile = async (file: File): Promise<string> =>
  hashArrayBuffer(await file.arrayBuffer());

export const createUpscaleSessionIds = (): UpscaleSessionIds => ({
  requestId: crypto.randomUUID(),
  inputImageId: crypto.randomUUID(),
});

export const buildEngineJobKey = (params: {
  engine: string;
  inputContentHash: string;
  targetW: number;
  targetH: number;
  scale: number;
  requestId: string;
}) =>
  `${params.engine}:${params.inputContentHash.slice(0, 16)}:${params.targetW}x${params.targetH}:s${params.scale}:r${params.requestId}`;

export const logUpscaleDebug = (label: string, meta: Partial<UpscaleDebugMeta>) => {
  if (import.meta.env.DEV) {
    console.info(`[upscale:${label}]`, meta);
  }
};

export const measureDataUrlImage = (dataUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error('Failed to measure image'));
    img.src = dataUrl;
  });

/** Programmatic download — never captures DOM / result card / overlays. */
export const downloadPureResultBlob = async (
  dataUrl: string,
  filename: string
): Promise<{ blob: Blob; blobHash: string }> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const blobHash = await hashArrayBuffer(await blob.arrayBuffer());
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return { blob, blobHash };
};
