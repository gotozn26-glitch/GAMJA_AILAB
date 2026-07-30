import {
  isBillingRelatedCategory,
  isOpenAiApiError,
  parseOpenAiErrorResponse,
  type OpenAiErrorCategory,
} from './openai-api-error';
import { OPENAI_IMAGE_MODEL } from './models';
import { OPENAI_REQUEST_TIMEOUT_MS } from './openai-upscale';
import type { UpscaleMode } from './upscale-mode';
import { resolvePayloadModelForMode } from './upscale-mode';

export type UpscaleRunErrorInfo = {
  type: string;
  message: string;
  title: string;
  hint: string | null;
  category: OpenAiErrorCategory | 'generic' | 'aborted' | 'timeout' | 'decode';
  provider: 'openai' | 'gemini' | null;
  model: string | null;
  durationMs: number;
  retryCount: number;
  timedOut: boolean;
  aborted: boolean;
  isBillingWarning: boolean;
};

const isAbortError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.name === 'AbortError' || err.message.includes('취소') || err.message.includes('abort'));

const isTimeoutError = (err: unknown): boolean =>
  err instanceof Error && (err.message.includes('시간 초과') || err.message.includes('timeout'));

const extractOpenAiBody = (message: string): string | null => {
  const idx = message.indexOf('{');
  if (idx >= 0) return message.slice(idx);
  return null;
};

const extractHttpStatus = (message: string): number | null => {
  const m = message.match(/OpenAI request failed \((\d+)/);
  return m ? Number(m[1]) : null;
};

export const parseUpscaleRunError = (
  err: unknown,
  mode: UpscaleMode,
  durationMs: number
): UpscaleRunErrorInfo => {
  const provider = mode === 'highQuality' ? 'openai' : 'gemini';
  const model = resolvePayloadModelForMode(mode);
  const aborted = isAbortError(err);
  const timedOut = isTimeoutError(err);

  const base = {
    provider,
    model,
    durationMs,
    retryCount: 0,
    timedOut,
    aborted,
    isBillingWarning: false,
  };

  if (isOpenAiApiError(err)) {
    const parsed = err.parsed;
    return {
      ...base,
      type: parsed.code ?? parsed.apiType ?? parsed.category,
      title: parsed.userTitle,
      message: parsed.userMessage,
      hint: parsed.userHint,
      category: parsed.category,
      isBillingWarning: isBillingRelatedCategory(parsed.category),
    };
  }

  if (err instanceof Error && provider === 'openai') {
    const body = extractOpenAiBody(err.message);
    const status = extractHttpStatus(err.message) ?? 400;

    if (body && (body.includes('"error"') || body.includes('billing') || body.includes('quota'))) {
      const parsed = parseOpenAiErrorResponse(status, body);
      return {
        ...base,
        type: parsed.apiType ?? parsed.code ?? parsed.category,
        title: parsed.userTitle,
        message: parsed.userMessage,
        hint: parsed.userHint,
        category: parsed.category,
        isBillingWarning: isBillingRelatedCategory(parsed.category),
      };
    }

    if (
      err.message.includes('CHAE_GPT_API_KEY') ||
      err.message.includes('CHAE_GEMINI_API_KEY') ||
      err.message.includes('Google API Key가 없습니다') ||
      err.message.includes('OpenAI API Key가 없습니다')
    ) {
      const isGemini =
        err.message.includes('CHAE_GEMINI_API_KEY') ||
        err.message.includes('Google API Key');
      return {
        ...base,
        type: 'missing_api_key',
        title: isGemini ? 'Google API 키 없음' : 'OpenAI API 키 없음',
        message: isGemini
          ? 'Google API Key가 등록되어 있지 않습니다.'
          : 'OpenAI API Key가 등록되어 있지 않습니다.',
        hint: '메인 화면에서 API Key를 등록한 뒤 다시 시도해 주세요.',
        category: 'invalid_api_key',
        isBillingWarning: false,
      };
    }
  }

  if (aborted) {
    return {
      ...base,
      type: 'AbortError',
      title: '요청 취소',
      message: '업스케일 요청이 취소되었습니다.',
      hint: null,
      category: 'aborted',
      isBillingWarning: false,
    };
  }

  if (timedOut) {
    return {
      ...base,
      type: 'TimeoutError',
      title: '요청 시간 초과',
      message: `OpenAI (${OPENAI_IMAGE_MODEL}) 요청 시간이 초과되었습니다. (대기 한도 ${Math.round(OPENAI_REQUEST_TIMEOUT_MS / 60_000)}분)`,
      hint: '고배율·고품질은 5~10분 걸릴 수 있습니다. 잠시 후 다시 시도하거나 Gemini를 사용해 주세요.',
      category: 'timeout',
      isBillingWarning: false,
    };
  }

  if (err instanceof Error) {
    let message = err.message;
    let category: UpscaleRunErrorInfo['category'] = 'generic';
    let title = '처리 오류';
    let hint: string | null = null;
    let isBillingWarning = false;

    if (
      message.includes('billing_hard_limit_reached') ||
      message.includes('Billing hard limit')
    ) {
      const parsed = parseOpenAiErrorResponse(400, message);
      return {
        ...base,
        type: parsed.code ?? 'billing_limit',
        title: parsed.userTitle,
        message: parsed.userMessage,
        hint: parsed.userHint,
        category: parsed.category,
        isBillingWarning: true,
      };
    }

    if (message.includes('insufficient_quota') || message.includes('Insufficient quota')) {
      const parsed = parseOpenAiErrorResponse(429, message);
      return {
        ...base,
        type: 'insufficient_quota',
        title: parsed.userTitle,
        message: parsed.userMessage,
        hint: parsed.userHint,
        category: 'insufficient_quota',
        isBillingWarning: true,
      };
    }

    if (message.includes('429')) {
      title = '요청 한도';
      message = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
      category = 'rate_limit';
    } else if (message.includes('500')) {
      title = '서버 오류';
      message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      category = 'server_error';
    } else if (message.includes('safety')) {
      title = '안전 정책';
      message = '이미지가 안전 정책에 의해 차단되었습니다.';
    } else if (message.includes('No image generated') || message.includes('returned no image')) {
      title = '생성 실패';
      message = '이미지를 생성하지 못했습니다. 다른 이미지로 시도해 주세요.';
    } else if (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('Load failed')
    ) {
      title = '네트워크 연결 끊김';
      message =
        'OpenAI 응답을 받기 전에 브라우저 연결이 끊겼습니다. 결제 한도/잔액 부족 메시지가 아닙니다.';
      hint = '잠시 후 다시 시도하거나 4~6배로 낮춰 보세요. 개발자 도구 Network에서 api.openai.com 요청 상태를 확인하세요.';
      category = 'generic';
    } else if (err.name === 'TypeError') {
      title = '처리 오류';
      message = err.message || '이미지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
      hint = import.meta.env.DEV ? '개발자 콘솔에서 상세 스택을 확인하세요.' : null;
    } else if (provider === 'openai') {
      title = 'OpenAI 실패';
      message = `OpenAI ${OPENAI_IMAGE_MODEL} 요청이 실패했습니다.`;
      hint = 'Gemini로 다시 시도해 주세요.';
    } else {
      message = '이미지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
    }

    return {
      ...base,
      type: err.name || 'Error',
      title,
      message,
      hint,
      category,
      isBillingWarning,
    };
  }

  return {
    ...base,
    type: 'UnknownError',
    title: '처리 오류',
    message: '이미지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    hint: null,
    category: 'generic',
    isBillingWarning: false,
  };
};
