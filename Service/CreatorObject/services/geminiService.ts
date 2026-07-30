import { notifyInvalidApiKey } from '../../../src/lib/apiKeys';

const CREDIT_DEPLETED_MESSAGE = '크레딧이 부족해요 ㅠㅠ 내일 다시 시도해주세요.';

function formatGenerationErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    normalized.includes('prepayment credits are depleted') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('quota exceeded')
  ) {
    return CREDIT_DEPLETED_MESSAGE;
  }

  return message || '생성에 실패했습니다.';
}

function looksLikeInvalidKey(message: string): boolean {
  return /유효하지\s*않|API_KEY_INVALID|invalid[_\s-]?api[_\s-]?key|incorrect api key|INVALID_API_KEY/i.test(
    message,
  );
}

async function readJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    if (response.status === 401 || response.status === 403) {
      notifyInvalidApiKey();
      throw new Error('API Key가 유효하지 않습니다. 다시 등록해 주세요.');
    }
    throw new Error(
      'API 서버 응답이 비어 있습니다. 터미널에서 npm run dev 로 API 서버(8080)가 켜져 있는지 확인해 주세요.',
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `API 응답을 해석하지 못했습니다. (${response.status}) ${text.slice(0, 120)}`,
    );
  }
}

export class GeminiService {
  async generateStylizedObject(
    keyword: string, 
    styleSuffix: string, 
    referenceImageBase64?: string,
    variationIndex: number = 0
  ): Promise<string> {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          styleSuffix,
          referenceImageBase64,
          variationIndex
        }),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        const rawMessage = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || '생성에 실패했습니다.';
        if (data?.code === 'INVALID_API_KEY' || looksLikeInvalidKey(rawMessage)) {
          notifyInvalidApiKey();
        }
        throw new Error(formatGenerationErrorMessage(rawMessage));
      }

      return data.url;
    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      const message = error?.message ? formatGenerationErrorMessage(String(error.message)) : '생성에 실패했습니다.';
      if (looksLikeInvalidKey(message)) {
        notifyInvalidApiKey();
      }
      throw new Error(message);
    }
  }
}

export const geminiService = new GeminiService();
