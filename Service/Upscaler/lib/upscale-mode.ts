import { GEMINI_IMAGE_MODEL, OPENAI_IMAGE_MODEL } from './models';

export type UpscaleMode = 'basic' | 'highQuality';
export type UpscaleProvider = 'gemini' | 'openai';

export const DEFAULT_UPSCALE_MODE: UpscaleMode = 'basic';

export const modeToProvider = (mode: UpscaleMode): UpscaleProvider =>
  mode === 'basic' ? 'gemini' : 'openai';

export const modePublicLabel = (mode: UpscaleMode): string =>
  mode === 'basic' ? 'Gemini' : 'OpenAI';

export const modeDescription = (mode: UpscaleMode): string =>
  mode === 'basic'
    ? '빠르고 무난한 업스케일'
    : '3분 이상 걸릴 수 있으나 일정 품질이 보장됨';

export const GEMINI_MODE_MODEL_LABEL = 'Gemini';

export const resolvePayloadModelForMode = (mode: UpscaleMode): string =>
  mode === 'basic' ? GEMINI_IMAGE_MODEL : OPENAI_IMAGE_MODEL;

const LOADING_LINES_GEMINI = [
  'Gemini로 업스케일링 중...',
  '원본을 유지하며 복원하는 중...',
  '고해상도 결과를 생성하는 중...',
] as const;

export const formatElapsedLabel = (elapsedSec: number): string => {
  const sec = Number.isFinite(elapsedSec) ? Math.max(0, Math.floor(elapsedSec)) : 0;
  if (sec < 60) return `${sec}초 경과`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${String(s).padStart(2, '0')}초 경과`;
};

export const loadingStatusLine = (mode: UpscaleMode, elapsedSec: number, phraseIdx: number): string => {
  const elapsed = formatElapsedLabel(elapsedSec);
  if (mode === 'highQuality') {
    return `3분 이상 걸릴 수 있습니다… ${elapsed}`;
  }
  const idx = Number.isFinite(phraseIdx) ? Math.max(0, Math.floor(phraseIdx)) : 0;
  const line = LOADING_LINES_GEMINI[idx % LOADING_LINES_GEMINI.length];
  return `${line} ${elapsed}`;
};
