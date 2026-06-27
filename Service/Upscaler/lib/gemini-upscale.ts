import { prepareApiInput, resolveOpenAiGenerationSize } from './image-utils';
import { GEMINI_IMAGE_MODEL } from './models';
import { buildGeminiUpscalePrompt } from './prompt';
import type { SourceVisualStyle } from './source-style';
import { resolveGeminiImageSizeForTarget } from './target-output';

export type GeminiUpscaleResult = {
  dataUrl: string;
  imageSize: string;
  prompt: string;
};

export async function upscaleWithGemini(params: {
  base64: string;
  mimeType: string;
  generationLongerSide: number;
  targetW: number;
  targetH: number;
  sourceStyle?: SourceVisualStyle;
  userGuidance?: string;
}): Promise<GeminiUpscaleResult> {
  const { base64, mimeType, generationLongerSide, targetW, targetH, sourceStyle, userGuidance } = params;
  const prompt = buildGeminiUpscalePrompt(sourceStyle ?? 'flat_2d', userGuidance);
  const { label: imageSize, pixelLongerSide } = resolveGeminiImageSizeForTarget(generationLongerSide);
  const prepLonger = Math.min(generationLongerSide, pixelLongerSide);
  const prepSize = resolveOpenAiGenerationSize(targetW, targetH, prepLonger);
  const prepared = await prepareApiInput(base64, mimeType, prepSize);

  const response = await fetch('/api/upscaler/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64: prepared.base64,
      imageSize,
      prompt,
      model: GEMINI_IMAGE_MODEL,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Gemini 업스케일에 실패했습니다.');
  }

  return {
    dataUrl: data.dataUrl,
    imageSize,
    prompt,
  };
}
