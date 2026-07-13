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

const EMPTY: ApiKeys = { google: '', openai: '' };

type Listener = (keys: ApiKeys) => void;

const listeners = new Set<Listener>();

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

    return originalFetch(input, { ...init, headers });
  };

  return () => {
    window.fetch = originalFetch;
  };
}
