/**
 * API 키는 sessionStorage에만 보관합니다.
 * - 탭/브라우저를 닫으면 자동으로 사라집니다.
 * - localStorage / 서버에는 절대 저장하지 않습니다.
 */

export type ApiKeyProvider = 'google' | 'openai';

export type ApiKeys = {
  google: string;
  openai: string;
};

const STORAGE_KEY = 'gamja.apiKeys.session';

export const INVALID_API_KEY_BANNER =
  'API KEY가 유효하지 않아 실패했습니다, 다시 등록해주세요.';

const EMPTY: ApiKeys = { google: '', openai: '' };

type Listener = (keys: ApiKeys) => void;
type InvalidKeyListener = () => void;

const listeners = new Set<Listener>();
const invalidKeyListeners = new Set<InvalidKeyListener>();

function readRaw(): ApiKeys {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<ApiKeys>;
    return {
      google: typeof parsed.google === 'string' ? parsed.google : '',
      openai: typeof parsed.openai === 'string' ? parsed.openai : '',
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeRaw(keys: ApiKeys) {
  const next: ApiKeys = {
    google: keys.google.trim(),
    openai: keys.openai.trim(),
  };

  if (!next.google && !next.openai) {
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  listeners.forEach((listener) => listener(next));
}

export function getApiKeys(): ApiKeys {
  return readRaw();
}

export function hasGoogleApiKey(): boolean {
  return Boolean(getApiKeys().google);
}

/** Google / OpenAI 중 하나라도 세션에 있으면 true */
export function hasAnyApiKey(): boolean {
  const keys = getApiKeys();
  return Boolean(keys.google || keys.openai);
}

export function setApiKey(provider: ApiKeyProvider, value: string) {
  const current = readRaw();
  writeRaw({ ...current, [provider]: value });
}

export function clearApiKeys() {
  writeRaw({ ...EMPTY });
}

export function subscribeApiKeys(listener: Listener): () => void {
  listeners.add(listener);
  listener(readRaw());
  return () => {
    listeners.delete(listener);
  };
}

/** 서비스에서 키 무효(401)를 감지했을 때 팝업을 다시 띄우도록 알립니다. */
export function notifyInvalidApiKey() {
  invalidKeyListeners.forEach((listener) => listener());
}

export function subscribeInvalidApiKey(listener: InvalidKeyListener): () => void {
  invalidKeyListeners.add(listener);
  return () => {
    invalidKeyListeners.delete(listener);
  };
}

export type ValidateApiKeysResult = {
  ok: boolean;
  message: string;
  google?: { ok: boolean; message?: string };
  openai?: { ok: boolean; message?: string };
};

/** 등록 전 Google / OpenAI 키를 서버에서 가볍게 검증합니다. */
export async function validateApiKeys(keys: {
  google?: string;
  openai?: string;
}): Promise<ValidateApiKeysResult> {
  const google = (keys.google || '').trim();
  const openai = (keys.openai || '').trim();

  if (!google && !openai) {
    return { ok: false, message: '검증할 API Key를 입력해 주세요.' };
  }

  try {
    const response = await fetch('/api/keys/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ google, openai }),
    });

    const text = await response.text();
    let data: ValidateApiKeysResult | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as ValidateApiKeysResult;
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        message:
          data?.message ||
          'API Key 검증 요청에 실패했습니다. API 서버(npm run dev)가 켜져 있는지 확인해 주세요.',
      };
    }

    if (!data) {
      return {
        ok: false,
        message: 'API Key 검증 응답을 해석하지 못했습니다.',
      };
    }

    return {
      ok: Boolean(data.ok),
      message:
        data.message ||
        (data.ok
          ? 'API Key 검증에 성공했습니다.'
          : 'API Key 검증에 실패했습니다. 다시 등록해 주세요.'),
      google: data.google,
      openai: data.openai,
    };
  } catch {
    return {
      ok: false,
      message:
        'API Key 검증 중 연결할 수 없습니다. API 서버(npm run dev)가 켜져 있는지 확인해 주세요.',
    };
  }
}

function looksLikeInvalidApiKeyText(text: string): boolean {
  return /유효하지\s*않|API_KEY_INVALID|invalid[_\s-]?api[_\s-]?key|incorrect api key|API_KEY_RESET/i.test(
    text,
  );
}

function looksLikeInvalidApiKeyPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { code?: unknown; error?: unknown; message?: unknown };
  if (payload.code === 'INVALID_API_KEY') return true;
  return looksLikeInvalidApiKeyText(`${payload.error ?? ''} ${payload.message ?? ''}`);
}

/** `/api/*` 요청에 세션 키를 헤더로 붙입니다. 브라우저를 닫으면 키도 함께 사라집니다. */
export function installApiKeyFetchInterceptor(): () => void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const isApiRequest = url.startsWith('/api/') || url.includes('/api/');
    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    const keys = getApiKeys();
    const headers = new Headers(init?.headers);

    if (keys.google) {
      headers.set('X-Google-Api-Key', keys.google);
      headers.set('X-Gemini-Api-Key', keys.google);
    }
    if (keys.openai) {
      headers.set('X-OpenAI-Api-Key', keys.openai);
    }

    const response = await originalFetch(input, { ...init, headers });

    // 실패 응답에서만 본문을 들여다보고 키 무효 여부를 판단 (성공 응답은 대용량일 수 있음)
    // 등록 전 검증 API는 자체 UI에서 처리하므로 여기서 팝업을 띄우지 않음
    const isValidateRequest = url.includes('/api/keys/validate');
    if (!response.ok && !isValidateRequest) {
      try {
        const text = await response.clone().text();
        if (!text) {
          if (
            (response.status === 401 || response.status === 403) &&
            (keys.google || keys.openai)
          ) {
            notifyInvalidApiKey();
          }
        } else if (looksLikeInvalidApiKeyText(text)) {
          notifyInvalidApiKey();
        } else {
          try {
            if (looksLikeInvalidApiKeyPayload(JSON.parse(text))) {
              notifyInvalidApiKey();
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    return response;
  };

  return () => {
    window.fetch = originalFetch;
  };
}
