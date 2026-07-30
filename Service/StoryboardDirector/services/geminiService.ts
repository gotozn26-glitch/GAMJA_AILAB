import { notifyInvalidApiKey } from "../../../src/lib/apiKeys";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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
      throw new Error("API Key가 유효하지 않습니다. 다시 등록해 주세요.");
    }
    throw new Error(
      "API 서버 응답이 비어 있습니다. npm run dev 로 API 서버(8080)를 켜 주세요.",
    );
  }

  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : "요청에 실패했습니다.";
    if (data?.code === "INVALID_API_KEY" || /유효하지\s*않|API_KEY_INVALID/i.test(msg)) {
      notifyInvalidApiKey();
    }
    throw new Error(msg);
  }
  return data;
}

export const analyzeStoryboard = async (
  imageBase64: string,
  prompt: string,
  slots: { id: string; type: string }[],
): Promise<{ slotId: string; box: [number, number, number, number] }[]> => {
  const data = await postJson<{ results?: unknown; error?: string }>(
    "/api/storyboard/analyze",
    { imageDataUrl: imageBase64, prompt, slots },
  );
  return Array.isArray(data.results)
    ? (data.results as { slotId: string; box: [number, number, number, number] }[])
    : [];
};

export const generateDirectorImage = async (
  baseImageBase64: string,
  maskImageBase64: string,
  prompt: string,
  references: { color: string; type: string; image: string }[],
): Promise<string[]> => {
  const data = await postJson<{ images?: string[]; error?: string }>(
    "/api/storyboard/generate",
    {
      baseDataUrl: baseImageBase64,
      maskDataUrl: maskImageBase64,
      prompt,
      references: references.map((r) => ({
        color: r.color,
        type: r.type,
        imageDataUrl: r.image,
      })),
    },
  );
  return Array.isArray(data.images) ? data.images : [];
};
