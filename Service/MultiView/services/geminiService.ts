import { Rotation } from '../types';
import { notifyInvalidApiKey } from '../../../src/lib/apiKeys';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {} as T & { error?: string; code?: string };
  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string; code?: string };
    } catch {
      throw new Error(
        `API 응답을 해석하지 못했습니다. (${res.status}) ${text.slice(0, 120)}`,
      );
    }
  } else if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      notifyInvalidApiKey();
      throw new Error('API_KEY_RESET');
    }
    throw new Error(
      'API 서버 응답이 비어 있습니다. npm run dev 로 API 서버(8080)를 켜 주세요.',
    );
  }

  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : '요청에 실패했습니다.';
    if (
      data?.code === 'INVALID_API_KEY' ||
      msg.includes('Requested entity was not found') ||
      msg.includes('API_KEY') ||
      /유효하지\s*않/i.test(msg)
    ) {
      notifyInvalidApiKey();
      throw new Error('API_KEY_RESET');
    }
    throw new Error(msg);
  }
  return data;
}

export const analyzeIsFrontView = async (
  sourceBase64: string,
  objectName: string,
): Promise<{ isFront: boolean; reason: string }> => {
  const data = await postJson<{ isFront: boolean; reason: string }>('/api/multiview/analyze', {
    sourceDataUrl: sourceBase64,
    objectName,
  });
  return {
    isFront: !!data.isFront,
    reason: data.reason || '',
  };
};

export const generateFrontView = async (sourceBase64: string, objectName: string): Promise<string> => {
  const data = await postJson<{ url?: string }>('/api/multiview/front-view', {
    sourceDataUrl: sourceBase64,
    objectName,
  });
  if (!data.url) throw new Error('정면 이미지 생성 실패');
  return data.url;
};

export const generateSingleView = async (
  frontBase64: string,
  cubeBase64: string,
  rotation: Rotation,
  originalBase64?: string | null,
): Promise<string> => {
  const data = await postJson<{ url?: string }>('/api/multiview/generate', {
    frontDataUrl: frontBase64,
    cubeDataUrl: cubeBase64,
    rotation,
    originalDataUrl: originalBase64 && originalBase64 !== frontBase64 ? originalBase64 : undefined,
  });
  if (!data.url) throw new Error('이미지 응답이 없습니다.');
  return data.url;
};

export const editImage = async (base64Image: string, editPrompt: string): Promise<string | null> => {
  const data = await postJson<{ url?: string | null }>('/api/multiview/edit', {
    imageDataUrl: base64Image,
    editPrompt,
  });
  return data.url ?? null;
};
