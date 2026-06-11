import { upscaleWithGemini } from './gemini-upscale';
import { compositeOntoWhite, resizeToTarget } from './image-utils';
import { upscaleWithOpenAi } from './openai-upscale';
import { analyzeSourceVisualStyle } from './source-style';
import type { UpscaleMode } from './upscale-mode';

export type UpscaleProvider = 'gemini' | 'openai';

export type UpscaleJobOptions = {
  targetW?: number;
  targetH?: number;
  generationLongerSide?: number;
  requestId?: string;
  upscaleMode?: UpscaleMode;
  abortSignal?: AbortSignal;
};

export type UpscaleResult = {
  dataUrl: string;
  targetW: number;
  targetH: number;
  requestId: string;
  provider: UpscaleProvider;
  durationMs?: number;
  sourceStyle?: string;
};

export async function upscaleImageByProvider(
  provider: UpscaleProvider,
  base64Image: string,
  mimeType: string,
  scale: number,
  sourceWidth: number,
  sourceHeight: number,
  _originalMaxDim: number,
  _preserveText: boolean,
  _additionalPrompt?: string,
  jobOptions?: UpscaleJobOptions
): Promise<UpscaleResult> {
  const requestId = jobOptions?.requestId ?? crypto.randomUUID();
  const targetW = jobOptions?.targetW ?? Math.round(sourceWidth * scale);
  const targetH = jobOptions?.targetH ?? Math.round(sourceHeight * scale);
  const generationLongerSide =
    jobOptions?.generationLongerSide ?? Math.max(targetW, targetH, 1024);

  const styleAnalysis = await analyzeSourceVisualStyle(
    base64Image,
    mimeType,
    sourceWidth,
    sourceHeight
  );
  console.info('[upscale:style]', {
    requestId,
    style: styleAnalysis.style,
    uniqueColors: styleAnalysis.uniqueColors,
    avgLocalVariance: Math.round(styleAnalysis.avgLocalVariance),
    flatRatio: styleAnalysis.flatRatio.toFixed(2),
    gradientRatio: styleAnalysis.gradientRatio.toFixed(2),
  });

  let rawDataUrl: string;
  let durationMs: number | undefined;

  if (provider === 'openai') {
    const openAi = await upscaleWithOpenAi({
      base64: base64Image,
      mimeType,
      targetW,
      targetH,
      generationLongerSide,
      requestId,
      sourceStyle: styleAnalysis.style,
      abortSignal: jobOptions?.abortSignal,
    });
    rawDataUrl = openAi.dataUrl;
    durationMs = openAi.durationMs;
  } else {
    const gemini = await upscaleWithGemini({
      base64: base64Image,
      mimeType,
      generationLongerSide,
      targetW,
      targetH,
      sourceStyle: styleAnalysis.style,
    });
    rawDataUrl = gemini.dataUrl;
  }

  const resizeMode =
    provider === 'gemini' && generationLongerSide <= 1536 ? 'bicubic' : 'lanczos';
  const finalDataUrl = await compositeOntoWhite(
    await resizeToTarget(rawDataUrl, targetW, targetH, resizeMode)
  );

  return {
    dataUrl: finalDataUrl,
    targetW,
    targetH,
    requestId,
    provider,
    durationMs,
    sourceStyle: styleAnalysis.style,
  };
}
