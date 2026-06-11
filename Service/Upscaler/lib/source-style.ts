import { loadImageFromBase64 } from './image-utils';

export type SourceVisualStyle = 'flat_2d' | 'soft_3d' | 'photo' | 'pixel_art';

export type SourceStyleAnalysis = {
  style: SourceVisualStyle;
  uniqueColors: number;
  avgLocalVariance: number;
  flatRatio: number;
  gradientRatio: number;
};

const colorKey = (r: number, g: number, b: number) =>
  ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);

const localVariance = (data: Uint8ClampedArray, w: number, h: number, x: number, y: number) => {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = (ny * w + nx) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  if (n === 0) return 0;
  const ar = r / n;
  const ag = g / n;
  const ab = b / n;
  let sum = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = (ny * w + nx) * 4;
      const dr = data[i] - ar;
      const dg = data[i + 1] - ag;
      const db = data[i + 2] - ab;
      sum += dr * dr + dg * dg + db * db;
    }
  }
  return sum / n;
};

const classifyFromMetrics = (
  srcW: number,
  srcH: number,
  uniqueColors: number,
  avgLocalVariance: number,
  flatRatio: number,
  gradientRatio: number
): SourceVisualStyle => {
  const maxDim = Math.max(srcW, srcH);

  if (maxDim <= 64) {
    if (gradientRatio > 0.1 || avgLocalVariance > 170) return 'soft_3d';
    return 'pixel_art';
  }

  if (uniqueColors > 900 && avgLocalVariance > 170 && maxDim >= 128 && flatRatio < 0.45) {
    return 'photo';
  }

  if (
    gradientRatio > 0.13 ||
    (avgLocalVariance > 210 && gradientRatio > 0.06) ||
    (maxDim <= 128 && avgLocalVariance > 150 && uniqueColors >= 20)
  ) {
    return 'soft_3d';
  }

  if (flatRatio > 0.42 && gradientRatio < 0.1) return 'flat_2d';

  return avgLocalVariance > 185 ? 'soft_3d' : 'flat_2d';
};

export async function analyzeSourceVisualStyle(
  base64: string,
  mimeType: string,
  srcW: number,
  srcH: number
): Promise<SourceStyleAnalysis> {
  const img = await loadImageFromBase64(base64, mimeType);
  const maxSample = 256;
  const scale = Math.min(1, maxSample / Math.max(srcW, srcH, 1));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      style: 'flat_2d',
      uniqueColors: 0,
      avgLocalVariance: 0,
      flatRatio: 0,
      gradientRatio: 0,
    };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const colors = new Set<number>();
  let varianceSum = 0;
  let varianceCount = 0;
  let flatCount = 0;
  let gradientCount = 0;
  const total = w * h;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      colors.add(colorKey(data[i], data[i + 1], data[i + 2]));
      const v = localVariance(data, w, h, x, y);
      varianceSum += v;
      varianceCount++;
      if (v < 140) flatCount++;
      if (v > 360) gradientCount++;
    }
  }

  const avgLocalVariance = varianceCount > 0 ? varianceSum / varianceCount : 0;
  const flatRatio = total > 0 ? flatCount / total : 0;
  const gradientRatio = total > 0 ? gradientCount / total : 0;

  return {
    style: classifyFromMetrics(srcW, srcH, colors.size, avgLocalVariance, flatRatio, gradientRatio),
    uniqueColors: colors.size,
    avgLocalVariance,
    flatRatio,
    gradientRatio,
  };
};
