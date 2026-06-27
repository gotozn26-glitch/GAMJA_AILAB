/** OpenAI API error body → user-facing Korean messages (no raw JSON in UI). */

export type OpenAiErrorCategory =
  | 'billing_limit'
  | 'insufficient_quota'
  | 'invalid_api_key'
  | 'rate_limit'
  | 'invalid_request'
  | 'server_error'
  | 'unknown';

export type ParsedOpenAiError = {
  category: OpenAiErrorCategory;
  code: string | null;
  apiType: string | null;
  apiMessage: string;
  userTitle: string;
  userMessage: string;
  userHint: string;
  httpStatus: number;
};

const OPENAI_BILLING_BLOCKED_KEY = 'openai_billing_blocked';

export const markOpenAiBillingBlocked = (): void => {
  try {
    sessionStorage.setItem(OPENAI_BILLING_BLOCKED_KEY, '1');
  } catch {
    /* ignore */
  }
};

export const clearOpenAiBillingBlocked = (): void => {
  try {
    sessionStorage.removeItem(OPENAI_BILLING_BLOCKED_KEY);
  } catch {
    /* ignore */
  }
};

export const isOpenAiBillingBlocked = (): boolean => {
  try {
    return sessionStorage.getItem(OPENAI_BILLING_BLOCKED_KEY) === '1';
  } catch {
    return false;
  }
};

const tryParseJson = (text: string): { error?: { message?: string; type?: string; code?: string } } | null => {
  try {
    return JSON.parse(text) as { error?: { message?: string; type?: string; code?: string } };
  } catch {
    return null;
  }
};

const classify = (
  status: number,
  code: string | null,
  apiType: string | null,
  apiMessage: string
): OpenAiErrorCategory => {
  const blob = `${code ?? ''} ${apiType ?? ''} ${apiMessage}`.toLowerCase();
  if (
    blob.includes('billing_hard_limit') ||
    blob.includes('billing hard limit') ||
    blob.includes('billing_limit')
  ) {
    return 'billing_limit';
  }
  if (blob.includes('insufficient_quota') || blob.includes('quota')) {
    return 'insufficient_quota';
  }
  if (blob.includes('invalid_api_key') || blob.includes('incorrect api key')) {
    return 'invalid_api_key';
  }
  if (status === 429 || blob.includes('rate_limit')) {
    return 'rate_limit';
  }
  if (status >= 500) return 'server_error';
  if (status === 400 || status === 422) return 'invalid_request';
  return 'unknown';
};

const userCopyFor = (
  category: OpenAiErrorCategory,
  apiMessage: string,
  code: string | null
): Pick<ParsedOpenAiError, 'userTitle' | 'userMessage' | 'userHint'> => {
  switch (category) {
    case 'billing_limit':
      return {
        userTitle: 'OpenAI 사용 한도 초과',
        userMessage:
          'OpenAI의 월간/설정 지출 한도(Hard limit)에 도달했습니다. 충전과 별개로 한도 설정이 낮으면 API가 거절됩니다.',
        userHint:
          'platform.openai.com → Billing → Limits에서 Hard limit을 확인·상향하거나, 당장은 Gemini를 사용해 주세요.',
      };
    case 'insufficient_quota':
      return {
        userTitle: 'OpenAI 사용량 부족',
        userMessage: 'OpenAI API 크레딧·할당량이 부족합니다.',
        userHint: 'Billing에서 잔액·결제 수단을 확인하거나 Gemini를 사용해 주세요.',
      };
    case 'invalid_api_key':
      return {
        userTitle: 'OpenAI API 키 오류',
        userMessage: 'OpenAI API 키가 올바르지 않거나 만료되었습니다.',
        userHint: '.env.local 또는 서버 환경변수의 CHAE_GPT_API_KEY를 확인해 주세요.',
      };
    case 'rate_limit':
      return {
        userTitle: 'OpenAI 요청 한도',
        userMessage: 'OpenAI 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        userHint: '잠시 기다리거나 Gemini를 사용해 주세요.',
      };
    case 'server_error':
      return {
        userTitle: 'OpenAI 서버 오류',
        userMessage: 'OpenAI 서버에서 일시적인 오류가 발생했습니다.',
        userHint: '잠시 후 다시 시도해 주세요.',
      };
    case 'invalid_request': {
      const transparentBg =
        apiMessage.toLowerCase().includes('transparent') &&
        apiMessage.toLowerCase().includes('background');
      if (code === 'invalid_value' && transparentBg) {
        return {
          userTitle: 'OpenAI API 설정 오류',
          userMessage:
            'gpt-image-2는 transparent 배경 옵션을 API에서 지원하지 않습니다. (파이프라인 배경 정책과 별개)',
          userHint: '앱이 auto로 자동 변환하도록 수정되었습니다. 새로고침 후 다시 시도해 주세요.',
        };
      }
      if (apiMessage.toLowerCase().includes('minimum pixel budget')) {
        return {
          userTitle: 'OpenAI 최소 해상도 미달',
          userMessage:
            'OpenAI 이미지 API는 512px보다 큰 해상도만 허용합니다. 앱이 자동으로 1024px 이상으로 요청하도록 수정되었습니다.',
          userHint: '페이지를 새로고침(Cmd+Shift+R)한 뒤 다시 업스케일해 주세요.',
        };
      }
      if (
        apiMessage.toLowerCase().includes('aspect ratio') ||
        apiMessage.toLowerCase().includes('3:1')
      ) {
        return {
          userTitle: 'OpenAI 종횡비 제한',
          userMessage:
            'OpenAI는 가로·세로 비율이 3:1을 넘는 이미지를 처리할 수 없습니다. (세로가 매우 긴 배너·스크린샷 등)',
          userHint:
            'Gemini를 사용하거나, 페이지를 새로고침한 뒤 다시 시도해 주세요. (앱이 자동으로 여백을 추가해 맞춥니다)',
        };
      }
      return {
        userTitle: 'OpenAI 요청 값 오류',
        userMessage: apiMessage || 'OpenAI API 파라미터가 올바르지 않습니다.',
        userHint: 'Gemini로 시도하거나 콘솔의 [openai:api-error] 로그를 확인해 주세요.',
      };
    }
    default:
      return {
        userTitle: 'OpenAI 처리 실패',
        userMessage: 'OpenAI 이미지 API 요청이 실패했습니다.',
        userHint: 'Gemini로 다시 시도하거나 콘솔 로그를 확인해 주세요.',
      };
  }
};

export const parseOpenAiErrorResponse = (httpStatus: number, bodyText: string): ParsedOpenAiError => {
  const json = tryParseJson(bodyText);
  const apiMessage = json?.error?.message ?? bodyText.slice(0, 280);
  const apiType = json?.error?.type ?? null;
  const code = json?.error?.code ?? null;
  const category = classify(httpStatus, code, apiType, apiMessage);
  const copy = userCopyFor(category, apiMessage, code);

  if (category === 'billing_limit' || category === 'insufficient_quota') {
    markOpenAiBillingBlocked();
  }

  return {
    category,
    code,
    apiType,
    apiMessage,
    httpStatus,
    ...copy,
  };
};

export const isBillingRelatedCategory = (category: OpenAiErrorCategory): boolean =>
  category === 'billing_limit' || category === 'insufficient_quota';

/** Thrown by openai-adapter — carries parsed API error for UI. */
export class OpenAiApiError extends Error {
  readonly parsed: ParsedOpenAiError;

  constructor(parsed: ParsedOpenAiError) {
    super(parsed.userMessage);
    this.name = 'OpenAiApiError';
    this.parsed = parsed;
  }
}

export const isOpenAiApiError = (err: unknown): err is OpenAiApiError =>
  err instanceof OpenAiApiError;
