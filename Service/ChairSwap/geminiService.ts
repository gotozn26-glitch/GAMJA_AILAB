export async function summarizeText(
  text: string,
  lockedPhrases: string[],
  replaceablePhrases: string[],
  targetLength: number,
): Promise<{ results: { summary: string; explanation: string }[] }> {
  const response = await fetch('/api/chair-swap/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      lockedPhrases,
      replaceablePhrases,
      targetLength,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(payload?.error || '의자뺏기 요약에 실패했습니다.');
  }

  return {
    results: Array.isArray(payload.results) ? payload.results : [],
  };
}

export async function generateImageMatchCopy(
  imageDataUrl: string,
  keywords: string,
  tone: string,
  maxLength: number | null,
): Promise<{ copies: { text: string; subtext: string }[] }> {
  const response = await fetch('/api/chair-swap/image-match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageDataUrl,
      keywords,
      tone,
      maxLength,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(payload?.error || '의자뺏기 이미지 매칭에 실패했습니다.');
  }

  return {
    copies: Array.isArray(payload.copies) ? payload.copies : [],
  };
}
