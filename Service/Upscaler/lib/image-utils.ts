export type ResizeMode = 'bicubic' | 'lanczos';

export const loadImageFromBase64 = (base64: string, mimeType: string): Promise<HTMLImageElement> => {
  const src = base64.startsWith('data:') ? base64 : `data:${mimeType || 'image/png'};base64,${base64}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

export const drawScaled = (
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  mode: ResizeMode = 'bicubic'
) => {
  const upscale = destW > srcW * 1.25 || destH > srcH * 1.25;
  const downscale = destW < srcW * 0.85 || destH < srcH * 0.85;

  if ((mode === 'lanczos' || downscale) && (upscale || downscale)) {
    let step = document.createElement('canvas');
    step.width = srcW;
    step.height = srcH;
    const sctx = step.getContext('2d');
    if (!sctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, destX, destY, destW, destH);
      return;
    }
    sctx.drawImage(img, 0, 0);

    const shrinking = destW < srcW || destH < srcH;
    while (
      shrinking
        ? step.width > destW * 2 && step.height > destH * 2
        : Math.max(step.width, step.height) * 2 < Math.max(destW, destH)
    ) {
      const nw = shrinking
        ? Math.max(destW, Math.floor(step.width * 0.5))
        : Math.min(destW, Math.max(1, step.width * 2));
      const nh = shrinking
        ? Math.max(destH, Math.floor(step.height * 0.5))
        : Math.min(destH, Math.max(1, step.height * 2));
      const next = document.createElement('canvas');
      next.width = nw;
      next.height = nh;
      const nctx = next.getContext('2d');
      if (!nctx) break;
      nctx.imageSmoothingEnabled = true;
      nctx.imageSmoothingQuality = 'high';
      nctx.drawImage(step, 0, 0, nw, nh);
      step = next;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(step, destX, destY, destW, destH);
    return;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, destX, destY, destW, destH);
};

const roundTo16 = (n: number) => Math.max(16, Math.round(n / 16) * 16);

/** gpt-image-2 rejects sizes below this longer side (API minimum pixel budget). */
export const OPENAI_MIN_GENERATION_LONGER_SIDE = 1024;

export const parseSizeLabel = (label: string) => {
  const [w, h] = label.split('x').map(Number);
  return { w: w || 512, h: h || 512 };
};

export const resolveOpenAiGenerationSize = (
  targetW: number,
  targetH: number,
  generationLongerSide: number
): string => {
  const aspect = targetW / Math.max(1, targetH);
  const genLonger = Math.max(OPENAI_MIN_GENERATION_LONGER_SIDE, generationLongerSide);
  const w = aspect >= 1 ? genLonger : Math.max(16, Math.round(genLonger * aspect));
  const h = aspect >= 1 ? Math.max(16, Math.round(genLonger / aspect)) : genLonger;
  return `${roundTo16(w)}x${roundTo16(h)}`;
};

/** @deprecated Use resolveOpenAiGenerationSize — kept for callers passing deliverable only. */
export const resolveOpenAiOutputSize = (targetW: number, targetH: number): string =>
  resolveOpenAiGenerationSize(targetW, targetH, Math.max(targetW, targetH, 1024));

export const prepareApiInput = async (
  base64: string,
  mimeType: string,
  outputSizeLabel: string
): Promise<{ base64: string; dataUrl: string; preparedW: number; preparedH: number }> => {
  const img = await loadImageFromBase64(base64, mimeType);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const { w: outW, h: outH } = parseSizeLabel(outputSizeLabel);
  const scale = Math.min(outW / Math.max(1, srcW), outH / Math.max(1, srcH), 8);
  const prepW = roundTo16(Math.min(outW, Math.max(srcW, Math.round(srcW * scale))));
  const prepH = roundTo16(Math.min(outH, Math.max(srcH, Math.round(srcH * scale))));

  const canvas = document.createElement('canvas');
  canvas.width = prepW;
  canvas.height = prepH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, prepW, prepH);
  drawScaled(ctx, img, srcW, srcH, 0, 0, prepW, prepH, 'bicubic');

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1] || '', dataUrl, preparedW: prepW, preparedH: prepH };
};

export const resizeToTarget = async (
  dataUrl: string,
  targetW: number,
  targetH: number,
  mode: ResizeMode = 'lanczos'
): Promise<string> => {
  const img = await loadImageFromBase64(dataUrl, 'image/png');
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (srcW === targetW && srcH === targetH) return dataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  const fit = Math.min(targetW / srcW, targetH / srcH);
  const fw = Math.max(1, Math.round(srcW * fit));
  const fh = Math.max(1, Math.round(srcH * fit));
  const x = Math.round((targetW - fw) / 2);
  const y = Math.round((targetH - fh) / 2);
  drawScaled(ctx, img, srcW, srcH, x, y, fw, fh, mode);
  return canvas.toDataURL('image/png');
};

export const compositeOntoWhite = async (dataUrl: string): Promise<string> => {
  const img = await loadImageFromBase64(dataUrl, 'image/png');
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
};
