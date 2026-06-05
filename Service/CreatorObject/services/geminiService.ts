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

      const data = await response.json();

      if (!response.ok) {
        const rawMessage = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || '생성에 실패했습니다.';
        throw new Error(formatGenerationErrorMessage(rawMessage));
      }

      return data.url;
    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      const message = error?.message ? formatGenerationErrorMessage(String(error.message)) : '생성에 실패했습니다.';
      throw new Error(message);
    }
  }
}

export const geminiService = new GeminiService();
