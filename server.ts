import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { NotionAPI } from "notion-client";
import { buildMultiviewPerspectivePrompt } from "./Service/MultiView/services/multiviewPrompt";

const notionApi = new NotionAPI();
const LABCORD_NOTION_PAGE_ID = "ae0d2817-213d-4086-9b39-de9a057e9cde";
const LABCORD_NOTION_COLLECTION_ID = "38ef860c-04dc-4ad3-8f42-74a576c7b06c";
const LABCORD_NOTION_VIEW_ID = "d13740fc-81a2-4bfd-9996-4d449ce40812";

type NotionRecordValue = {
  properties?: Record<string, unknown>;
  created_time?: number;
};

function getNotionTitle(value: NotionRecordValue | undefined): string {
  const title = value?.properties?.title;
  if (!Array.isArray(title)) {
    return "";
  }

  return title
    .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
    .join("")
    .trim();
}

function formatLabcordDate(timestamp: number | undefined): string {
  if (!timestamp) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  });

  return formatter
    .format(new Date(timestamp))
    .replace(/\s/g, "")
    .replace(/\.$/, "");
}

async function getLabcordPosts() {
  const recordMap = await notionApi.getPage(LABCORD_NOTION_PAGE_ID);
  const blockIds =
    recordMap.collection_query?.[LABCORD_NOTION_COLLECTION_ID]?.[LABCORD_NOTION_VIEW_ID]
      ?.collection_group_results?.blockIds || [];

  const posts = blockIds
    .map((blockId: string) => {
      const entry = recordMap.block?.[blockId] as
        | { value?: { value?: NotionRecordValue } }
        | undefined;
      const value = entry?.value?.value;
      const title = getNotionTitle(value);

      if (!title) {
        return null;
      }

      return {
        id: blockId,
        title,
        date: formatLabcordDate(value?.created_time),
        createdTime: value?.created_time || 0,
      };
    })
    .filter((post): post is NonNullable<typeof post> => Boolean(post))
    .sort((a, b) => b.createdTime - a.createdTime)
    .slice(0, 7)
    .map(({ createdTime, ...post }) => post);

  return posts;
}

function getGeminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "");
}

function decodeDataUrl(s: string): { mimeType: string; data: string } {
  const raw = String(s || "");
  const m = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (m) return { mimeType: m[1] || "image/png", data: m[2] || "" };
  const comma = raw.indexOf(",");
  if (comma >= 0) return { mimeType: "image/png", data: raw.slice(comma + 1) };
  return { mimeType: "image/png", data: raw };
}

async function startServer() {
  const app = express();
  // Cloud Run / Firebase App Hosting: PORT(기본 8080)로 0.0.0.0에 바인딩해야 헬스체크가 통과합니다.
  const PORT = Number(process.env.PORT) || 8080;
  const HOST = process.env.HOST || "0.0.0.0";

  app.use(express.json({ limit: '50mb' }));

  app.get("/runtime-config.js", (_req, res) => {
    const adsenseClientId = (process.env.ADSENSE_CLIENT_ID || "").trim();
    const payload = { ADSENSE_CLIENT_ID: adsenseClientId };
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`window.__APP_CONFIG__ = ${JSON.stringify(payload)};`);
  });

  app.get("/api/labcord/posts", async (_req, res) => {
    try {
      const posts = await getLabcordPosts();
      res.setHeader("Cache-Control", "no-store");
      return res.json({ posts });
    } catch (error: any) {
      console.error("Labcord notion fetch error:", error);
      return res.status(500).json({ error: String(error?.message || "LABcord 게시물을 불러오지 못했습니다.") });
    }
  });

  // [1순위] Gemini API Proxy Route (감자님의 소중한 로직)
  app.post("/api/generate", async (req, res) => {
    const { keyword, styleSuffix, referenceImageBase64, variationIndex } = req.body;
    
    if (!keyword || !styleSuffix) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY(or GOOGLE_API_KEY) is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      // 1. 키워드 번역 및 정제
      const translationResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a creative prompt engineer for an AI image generator.
        Translate the Korean word "${keyword}" into a cute, toy-like English visual description.
        Strict Rules:
        1. If the word is "주사위" or relates to "Dice", translate it as "a cute decorative toy cube with soft rounded edges". NEVER use the word 'dice' or 'gambling'.
        2. Describe the object as a simplified, chunky, and adorable miniature toy version.
        3. Focus on "kawaii" proportions.
        4. Output ONLY the English description.`,
      });
      
      const safeVisualDescription = translationResponse.text?.trim().replace(/["'.]/g, '') || keyword;

      // 2. 이미지 생성
      const viewpoints = [
        "straight-on eye-level studio portrait view", 
        "charming high-angle three-quarter view looking down", 
        "playful low-angle view looking up"
      ];
      const selectedView = viewpoints[variationIndex % viewpoints.length] || viewpoints[0];

      const fullPrompt = `A high-quality 3D digital asset of a charming miniature toy version of ${safeVisualDescription}.
      Style & Material: ${styleSuffix}. 
      Background: ESSENTIAL - Solid, pure, clean flat WHITE background. NO shadows on the floor, NO horizon line.
      Detail: Focus intensely on the tactile surface qualities (fabric, glass, or clay textures).
      Composition: ${selectedView}, perfectly centered.`;

      const parts: any[] = [{ text: fullPrompt }];
      
      if (referenceImageBase64) {
        const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
        parts.unshift({
          inlineData: { data: base64Data, mimeType: 'image/png' }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      if (!response.candidates?.[0]?.content?.parts) {
        return res.status(403).json({ error: 'AI 안전 필터에 의해 생성이 제한되었습니다.' });
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          // 🔥 여기서 JSON 응답을 보냅니다!
          return res.json({ url: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      
      res.status(500).json({ error: '이미지 생성 데이터가 없습니다.' });
    } catch (error: any) {
      console.error("Gemini Server Error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다. Firebase 환경변수(GEMINI_API_KEY 또는 GOOGLE_API_KEY)를 다시 확인해 주세요." });
      }
      res.status(500).json({ error: message || "생성에 실패했습니다." });
    }
  });

  /** Rotation(MultiView) — 클라이언트에 API 키를 두지 않고 서버에서만 Gemini 호출 */
  app.post("/api/multiview/generate", async (req, res) => {
    const { sourceDataUrl, cubeDataUrl, rotation } = req.body || {};
    if (!sourceDataUrl || !cubeDataUrl || !rotation || typeof rotation.x !== "number" || typeof rotation.y !== "number") {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const src = decodeDataUrl(sourceDataUrl);
    const cube = decodeDataUrl(cubeDataUrl);
    if (!src.data || !cube.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const model =
      (process.env.MULTIVIEW_GEMINI_MODEL || "").trim() || "gemini-2.5-flash-image";
    const ai = new GoogleGenAI({ apiKey });
    const perspectivePrompt = buildMultiviewPerspectivePrompt({
      x: rotation.x,
      y: rotation.y,
      z: typeof rotation.z === "number" ? rotation.z : 0,
    });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { data: src.data, mimeType: src.mimeType } },
            { inlineData: { data: cube.data, mimeType: cube.mimeType } },
            { text: perspectivePrompt },
          ],
        },
        config: { imageConfig: { aspectRatio: "1:1" } },
      });

      if (!response.candidates?.[0]?.content?.parts) {
        return res.status(403).json({ error: "AI 안전 필터에 의해 생성이 제한되었습니다." });
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return res.json({ url: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      res.status(500).json({ error: "이미지 생성 데이터가 없습니다." });
    } catch (error: any) {
      console.error("Multiview generate error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다." });
      }
      res.status(500).json({ error: message || "생성에 실패했습니다." });
    }
  });

  app.post("/api/multiview/edit", async (req, res) => {
    const { imageDataUrl, editPrompt } = req.body || {};
    if (!imageDataUrl || !editPrompt || typeof editPrompt !== "string") {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const img = decodeDataUrl(imageDataUrl);
    if (!img.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const model =
      (process.env.MULTIVIEW_GEMINI_MODEL || "").trim() || "gemini-2.5-flash-image";
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { data: img.data, mimeType: img.mimeType } },
            {
              text: `Edit this 3D asset while maintaining its perspective and volumetric structure: ${editPrompt}`,
            },
          ],
        },
        config: { imageConfig: { aspectRatio: "1:1" } },
      });

      if (!response.candidates?.[0]?.content?.parts) {
        return res.status(403).json({ error: "AI 안전 필터에 의해 편집이 제한되었습니다." });
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return res.json({ url: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      res.status(500).json({ error: "편집 결과가 없습니다." });
    } catch (error: any) {
      console.error("Multiview edit error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다." });
      }
      res.status(500).json({ error: message || "편집에 실패했습니다." });
    }
  });

  /** Storyboard Director — 분석(바운딩) / 이미지 생성 */
  app.post("/api/storyboard/analyze", async (req, res) => {
    const { imageDataUrl, prompt, slots } = req.body || {};
    if (!imageDataUrl || typeof prompt !== "string" || !Array.isArray(slots)) {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const img = decodeDataUrl(imageDataUrl);
    if (!img.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const slotConstraints = slots
      .map((s: { id: string; type: string }) => `"${s.type}" (ID: ${s.id})`)
      .join(", ");

    const analysisPrompt = `
    Analyze this storyboard sketch and identify the regions for the following objects: ${slotConstraints}.
    Based on the image and the context: "${prompt}", find the most likely bounding boxes for these objects.
    
    Return the result as a JSON array of objects, each containing:
    - "slotId": the ID of the slot.
    - "box": [ymin, xmin, ymax, xmax] in normalized coordinates (0-1000).
    
    Example: [{"slotId": "A", "box": [100, 200, 500, 600]}]
    Only return the JSON.
  `;

    const model =
      (process.env.STORYBOARD_ANALYZE_MODEL || "").trim() || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { inlineData: { data: img.data, mimeType: img.mimeType } },
          { text: analysisPrompt },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slotId: { type: Type.STRING },
                box: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: "[ymin, xmin, ymax, xmax]",
                },
              },
              required: ["slotId", "box"],
            },
          },
        },
      });

      let results: { slotId: string; box: [number, number, number, number] }[] = [];
      try {
        results = JSON.parse(response.text || "[]");
      } catch {
        results = [];
      }
      if (!Array.isArray(results)) results = [];
      return res.json({ results });
    } catch (error: any) {
      console.error("Storyboard analyze error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다." });
      }
      res.status(500).json({ error: message || "분석에 실패했습니다." });
    }
  });

  app.post("/api/storyboard/generate", async (req, res) => {
    const { baseDataUrl, maskDataUrl, prompt, references } = req.body || {};
    if (!baseDataUrl || !maskDataUrl || typeof prompt !== "string" || !Array.isArray(references)) {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const base = decodeDataUrl(baseDataUrl);
    const mask = decodeDataUrl(maskDataUrl);
    if (!base.data || !mask.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const referenceContext = references
      .map(
        (ref: { color: string; type: string }) =>
          `The area marked with ${ref.color} in the mask corresponds to ${ref.type}. Refer to the provided reference image for this object's design and identity.`,
      )
      .join("\n");

    const finalPrompt = `
    TASK: Transform this storyboard sketch into a high-quality finished cinematic image.
    LOCATE: Maintain the composition, framing, and perspective of the original sketch.
    ASSIGN: 
    ${referenceContext}
    STORY CONTEXT: ${prompt}
    
    The output should be a single high-fidelity image that strictly follows these layout and design constraints.
  `;

    const model =
      (process.env.STORYBOARD_IMAGE_MODEL || "").trim() || "gemini-2.5-flash-image";
    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [
      { inlineData: { data: base.data, mimeType: base.mimeType } },
      { inlineData: { data: mask.data, mimeType: mask.mimeType } },
    ];

    for (const ref of references as { imageDataUrl: string }[]) {
      if (!ref?.imageDataUrl) continue;
      const r = decodeDataUrl(ref.imageDataUrl);
      if (r.data) {
        parts.push({ inlineData: { data: r.data, mimeType: r.mimeType } });
      }
    }
    parts.push({ text: finalPrompt });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      const images: string[] = [];
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            images.push(`data:image/png;base64,${part.inlineData.data}`);
          }
        }
      }

      if (images.length === 0) {
        return res.status(403).json({ error: "AI 안전 필터에 의해 생성이 제한되었거나 결과가 없습니다." });
      }
      return res.json({ images });
    } catch (error: any) {
      console.error("Storyboard generate error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다." });
      }
      res.status(500).json({ error: message || "생성에 실패했습니다." });
    }
  });

  // [2순위] 정적 파일 설정 (배포용)
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));

  // [3순위] SPA 폴백 — 실제 정적 파일(또는 /assets/*) 요청에는 index.html을 주지 않습니다.
  // 그렇지 않으면 누락된 JS가 HTML로 내려가 브라우저가 조용히 흰 화면만 냅니다.
  app.get(/.*/, (req, res) => {
    const p = req.path;
    if (p.startsWith("/assets/") || /\.[a-zA-Z0-9]+$/.test(p)) {
      return res.status(404).type("text/plain").send("Not found");
    }
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        res.status(404).send("Build files not found.");
      }
    });
  });

  app.listen(PORT, HOST, () => {
    const urlHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
    console.log(`Server: http://${urlHost}:${PORT}/`);
  });
}

startServer().catch(err => {
  console.error("Critical Start Error:", err);
  process.exit(1);
});
