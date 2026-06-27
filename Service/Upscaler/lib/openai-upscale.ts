import { OpenAiApiError, parseOpenAiErrorResponse } from './openai-api-error';
import { prepareApiInput, resolveOpenAiGenerationSize } from './image-utils';
import { OPENAI_IMAGE_MODEL } from './models';
import { buildOpenAiUpscalePrompt, SHARED_UPSCALE_PROMPT_HASH } from './prompt';
import type { SourceVisualStyle } from './source-style';

/** OpenAI image edits can exceed 3 min on high scale / quality=high. */
export const OPENAI_REQUEST_TIMEOUT_MS = 600_000;
const OPENAI_MAX_RETRIES = 1;

export type OpenAiUpscaleResult = {
  dataUrl: string;
  durationMs: number;
  outputSize: string;
  prompt: string;
};

export async function upscaleWithOpenAi(params: {
  base64: string;
  mimeType: string;
  targetW: number;
  targetH: number;
  generationLongerSide: number;
  requestId: string;
  sourceStyle?: SourceVisualStyle;
  userGuidance?: string;
  abortSignal?: AbortSignal;
}): Promise<OpenAiUpscaleResult> {
  const { base64, mimeType, targetW, targetH, generationLongerSide, requestId, sourceStyle, userGuidance, abortSignal } =
    params;
  const prompt = buildOpenAiUpscalePrompt(sourceStyle ?? 'flat_2d', userGuidance);
  const outputSize = resolveOpenAiGenerationSize(targetW, targetH, generationLongerSide);
  const quality = Math.max(targetW, targetH) <= 512 ? 'medium' : 'high';
  const prepared = await prepareApiInput(base64, mimeType, outputSize);

  let totalMs = 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OPENAI_MAX_RETRIES; attempt += 1) {
    if (abortSignal?.aborted) throw new Error('OpenAI 요청이 취소되었습니다.');

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);
    abortSignal?.addEventListener('abort', () => controller.abort());

    const started = Date.now();
    try {
      const response = await fetch('/api/upscaler/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({
          base64: prepared.base64,
          outputSize,
          prompt,
          quality,
          model: OPENAI_IMAGE_MODEL,
        }),
        cache: 'no-store',
        signal: controller.signal,
      });
      totalMs += Date.now() - started;

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const parsed = parseOpenAiErrorResponse(response.status, JSON.stringify(data));
        lastError = new OpenAiApiError(parsed);
        if (attempt < OPENAI_MAX_RETRIES && [429, 500, 502, 503, 504].includes(response.status)) continue;
        throw lastError;
      }

      if (!data?.dataUrl) {
        throw new Error(`OpenAI returned no image (model=${OPENAI_IMAGE_MODEL})`);
      }

      return {
        dataUrl: data.dataUrl,
        durationMs: typeof data.durationMs === 'number' ? data.durationMs : totalMs,
        outputSize,
        prompt,
      };
    } catch (err) {
      totalMs += Date.now() - started;
      if (err instanceof OpenAiApiError) throw err;
      if (abortSignal?.aborted) throw new Error('OpenAI 요청이 취소되었습니다.');
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`OpenAI 요청 시간 초과 (${OPENAI_REQUEST_TIMEOUT_MS / 1000}초)`);
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < OPENAI_MAX_RETRIES) continue;
      throw lastError;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new Error('OpenAI upscale failed');
}

export { SHARED_UPSCALE_PROMPT_HASH };
