/** Hard maximum for output longer side (px). Values above this are rejected — not clamped. */
export const MAX_OUTPUT_LONGER_SIDE = 4096;

/** Minimum longer side sent to Gemini (pre-upscale + generation). Smaller deliverables are downscaled after. */
export const MIN_GENERATION_LONGER_SIDE = 1024;

/** Shown when upscale is blocked (scale × source or custom longer side exceeds max). */
export const buildOutputSizeBlockedMessage = (
  longerSide: number,
  targetW: number,
  targetH: number
) =>
  `제작 불가능합니다. 결과 이미지 긴 변은 최대 ${MAX_OUTPUT_LONGER_SIDE}px까지 가능합니다. (예상: ${targetW}×${targetH}, 긴 변 ${Math.round(longerSide)}px)`;

/** Inline red hint when scale/custom would exceed max (shown above the upscale button). */
export const buildOutputSizeOverLimitHint = (longerSide: number) =>
  `※ 결과 이미지 긴 변이 ${MAX_OUTPUT_LONGER_SIDE}px을 넘어 제작할 수 없습니다. (예상 긴 변 ${Math.round(longerSide)}px)`;

export type OutputSizeValidation =
  | { ok: true; longerSide: number; targetW: number; targetH: number }
  | { ok: false; message: string };

export const isOutputSizeRejected = (
  v: OutputSizeValidation | null | undefined
): v is Extract<OutputSizeValidation, { ok: false }> => v != null && v.ok === false;

/** Planned output dimensions from source × scale or explicit longer-side override. */
export const planOutputSize = (
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
  customLongerSide?: number
): { longerSide: number; targetW: number; targetH: number } => {
  const aspect = sourceWidth / Math.max(1, sourceHeight);
  const longerSide =
    customLongerSide && customLongerSide > 0
      ? customLongerSide
      : Math.max(sourceWidth, sourceHeight) * scale;
  const targetW =
    aspect >= 1 ? Math.max(1, Math.round(longerSide)) : Math.max(1, Math.round(longerSide * aspect));
  const targetH =
    aspect >= 1 ? Math.max(1, Math.round(longerSide / aspect)) : Math.max(1, Math.round(longerSide));
  return { longerSide, targetW, targetH };
};

export const validateOutputSize = (
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
  customLongerSide?: number
): OutputSizeValidation => {
  const { longerSide, targetW, targetH } = planOutputSize(sourceWidth, sourceHeight, scale, customLongerSide);

  if (longerSide > MAX_OUTPUT_LONGER_SIDE) {
    return {
      ok: false,
      message: buildOutputSizeBlockedMessage(longerSide, targetW, targetH),
    };
  }
  if (longerSide < 1) {
    return { ok: false, message: "출력 크기가 너무 작습니다." };
  }

  return { ok: true, longerSide, targetW, targetH };
};

/** @deprecated Use validateOutputSize — kept for callers that only need clamp in legacy paths. */
export const computeTargetOutputSize = (
  sourceWidth: number,
  sourceHeight: number,
  scale: number
) => {
  const { longerSide, targetW, targetH } = planOutputSize(sourceWidth, sourceHeight, scale);
  return { targetW, targetH, longerSide, wasClamped: false };
};

/**
 * Gemini `imageSize` bucket — stay close to deliverable size to avoid ring moiré on downscale.
 * 4K only for very large outputs; mid targets (e.g. 1320px) use 1K + gentle upscale.
 */
export const resolveGeminiImageSizeForTarget = (requestedLongerSide: number) => {
  if (requestedLongerSide <= 1536) {
    return { label: "1K" as const, pixelLongerSide: 1024 };
  }
  if (requestedLongerSide <= 2560) {
    return { label: "2K" as const, pixelLongerSide: 2048 };
  }
  return { label: "4K" as const, pixelLongerSide: 3840 };
};

/**
 * Generation longer side. Mid/large sources use MIN_GENERATION_LONGER_SIDE (1024) for quality.
 * Small sources (≤128px): prep at least 512px long side so AI can reconstruct detail.
 */
export const resolveGenerationLongerSide = (
  deliverableLongerSide: number,
  sourceLongerSide?: number
) => {
  if (sourceLongerSide != null && sourceLongerSide <= 128) {
    const moderateGen = Math.max(deliverableLongerSide * 2, 512);
    return Math.min(
      MAX_OUTPUT_LONGER_SIDE,
      Math.max(deliverableLongerSide, moderateGen)
    );
  }
  return Math.min(
    MAX_OUTPUT_LONGER_SIDE,
    Math.max(deliverableLongerSide, MIN_GENERATION_LONGER_SIDE)
  );
};

export const effectiveScaleForTargetLongerSide = (
  sourceLongerSide: number,
  desiredLongerSide: number
) => (sourceLongerSide > 0 ? desiredLongerSide / sourceLongerSide : 1);

export const buildTargetGeometryPreamble = (
  sourceWidth: number,
  sourceHeight: number,
  targetW: number,
  targetH: number,
  scale: number
) =>
  `Output geometry: ${scale}x from ${sourceWidth}x${sourceHeight} source → ${targetW}x${targetH}. Same composition and layout.\n\n`;
