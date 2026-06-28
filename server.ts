import express, { type Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { NotionAPI } from "notion-client";
import { buildMultiviewPerspectivePrompt, buildFrontViewPrompt } from "./Service/MultiView/services/multiviewPrompt";
import { buildStoryboardGeneratePrompt } from "./Service/StoryboardDirector/services/storyboardPrompt";

const notionApi = new NotionAPI();
const LABCORD_NOTION_PAGE_ID = "ae0d2817-213d-4086-9b39-de9a057e9cde";
const LABCORD_NOTION_COLLECTION_ID = "38ef860c-04dc-4ad3-8f42-74a576c7b06c";
const LABCORD_NOTION_VIEW_ID = "d13740fc-81a2-4bfd-9996-4d449ce40812";
const TOOL_SUPPORTER_NOTION_PAGE_ID = "396c6226-3bcd-4bf2-a491-27c95a487941";
const TOOL_SUPPORTER_NOTION_COLLECTION_ID = "629e7e0f-9dd3-4f69-9fdb-c9ee120c9e80";
const TOOL_SUPPORTER_NOTION_VIEW_ID = "4d4247af-80ab-44a2-8b6f-d00c50911d21";

type NotionRecordValue = {
  properties?: Record<string, unknown>;
  created_time?: number;
};

type LabcordPost = {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  url: string;
};

type ToolSupporterPost = {
  id: string;
  title: string;
  tool: string;
  description: string;
  url: string;
};

let labcordPostsCache: LabcordPost[] | null = null;
let labcordPostsInFlight: Promise<LabcordPost[]> | null = null;
let toolSupporterPostsCache: ToolSupporterPost[] | null = null;
let toolSupporterPostsInFlight: Promise<ToolSupporterPost[]> | null = null;

function getNotionTitle(value: NotionRecordValue | undefined): string {
  return getNotionText(value?.properties?.title);
}

function getNotionText(propertyValue: unknown): string {
  if (!Array.isArray(propertyValue)) {
    return "";
  }

  return propertyValue
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

function getNotionPersonIds(propertyValue: unknown): string[] {
  if (!Array.isArray(propertyValue)) {
    return [];
  }

  const ids: string[] = [];

  for (const part of propertyValue) {
    if (!Array.isArray(part) || !Array.isArray(part[1])) {
      continue;
    }

    for (const token of part[1]) {
      if (Array.isArray(token) && token[0] === "u" && typeof token[1] === "string") {
        ids.push(token[1]);
      }
    }
  }

  return ids;
}

function getLabcordPostUrl(blockId: string): string {
  return `https://www.notion.so/${blockId.replace(/-/g, "")}`;
}

async function fetchLabcordPostsFromNotion(): Promise<LabcordPost[]> {
  const recordMap = await notionApi.getPage(LABCORD_NOTION_PAGE_ID);
  const blockIds =
    recordMap.collection_query?.[LABCORD_NOTION_COLLECTION_ID]?.[LABCORD_NOTION_VIEW_ID]
      ?.collection_group_results?.blockIds || [];

  const records = blockIds
    .map((blockId: string) => {
      const entry = recordMap.block?.[blockId] as
        | { value?: { value?: NotionRecordValue } }
        | undefined;
      const value = entry?.value?.value;

      return {
        blockId,
        value,
        title: getNotionTitle(value),
        category: getNotionText(value?.properties?.["^k>^"]),
        authorIds: getNotionPersonIds(value?.properties?.["|c`="]),
      };
    })
    .filter((record) => Boolean(record.title));

  const uniqueAuthorIds = Array.from(new Set(records.flatMap((record) => record.authorIds)));
  const userResults =
    uniqueAuthorIds.length > 0 ? await notionApi.getUsers(uniqueAuthorIds) : { results: [] };
  const authorEntries = (userResults.results || []).flatMap((user) => {
    const record = user as { value?: { id?: string; name?: string } };
    return record?.value?.id && record?.value?.name ? [[record.value.id, record.value.name] as [string, string]] : [];
  });
  const authorMap = new Map(authorEntries);

  const posts = records
    .map(({ blockId, value, title, category, authorIds }) => {
      const authors = authorIds
        .map((authorId) => authorMap.get(authorId))
        .filter((authorName): authorName is string => Boolean(authorName));

      return {
        id: blockId,
        title,
        category,
        author: authors.join(", "),
        date: formatLabcordDate(value?.created_time),
        url: getLabcordPostUrl(blockId),
        createdTime: value?.created_time || 0,
      };
    })
    .sort((a, b) => b.createdTime - a.createdTime)
    .slice(0, 7)
    .map(({ createdTime, ...post }) => post);

  return posts;
}

async function fetchToolSupporterPostsFromNotion(): Promise<ToolSupporterPost[]> {
  const recordMap = await notionApi.getPage(TOOL_SUPPORTER_NOTION_PAGE_ID);
  const blockIds =
    recordMap.collection_query?.[TOOL_SUPPORTER_NOTION_COLLECTION_ID]?.[TOOL_SUPPORTER_NOTION_VIEW_ID]
      ?.collection_group_results?.blockIds || [];

  return blockIds
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
        tool: getNotionText(value?.properties?.["SOE{"]) || "Etc",
        description: getNotionText(value?.properties?.["^W~:"]),
        url: getLabcordPostUrl(blockId),
      };
    })
    .filter((post): post is NonNullable<typeof post> => Boolean(post))
    .slice(0, 6);
}

function refreshLabcordPosts(): Promise<LabcordPost[]> {
  if (labcordPostsInFlight) {
    return labcordPostsInFlight;
  }

  labcordPostsInFlight = fetchLabcordPostsFromNotion()
    .then((posts) => {
      labcordPostsCache = posts;
      return posts;
    })
    .finally(() => {
      labcordPostsInFlight = null;
    });

  return labcordPostsInFlight;
}

function refreshToolSupporterPosts(): Promise<ToolSupporterPost[]> {
  if (toolSupporterPostsInFlight) {
    return toolSupporterPostsInFlight;
  }

  toolSupporterPostsInFlight = fetchToolSupporterPostsFromNotion()
    .then((posts) => {
      toolSupporterPostsCache = posts;
      return posts;
    })
    .finally(() => {
      toolSupporterPostsInFlight = null;
    });

  return toolSupporterPostsInFlight;
}

async function getLabcordPosts(): Promise<LabcordPost[]> {
  // 메인 페이지(새 창/탭)마다 Notion에서 최신 목록을 가져옵니다.
  return refreshLabcordPosts();
}

async function getToolSupporterPosts(): Promise<ToolSupporterPost[]> {
  return refreshToolSupporterPosts();
}

function sanitizeEnvValue(value: string): string {
  return value
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "");
}

function getGeminiApiKey(): string {
  return sanitizeEnvValue(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "");
}

function getYoungGeminiApiKey(): string {
  return sanitizeEnvValue(process.env.YOUNG_GEMINI_API_KEY || "");
}

function getChaeGeminiApiKey(): string {
  return sanitizeEnvValue(process.env.CHAE_GEMINI_API_KEY || "");
}

function getChaeGptApiKey(): string {
  return sanitizeEnvValue(process.env.CHAE_GPT_API_KEY || "");
}

/** Cloud CDN cache hit을 위해 정적 자산별 Cache-Control을 설정합니다. */
function applyStaticCacheHeaders(res: Response, filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");

  // Vite 빌드 산출물 (파일명 해시) — 장기 캐시
  if (normalized.includes("/assets/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  // SPA 셸 — 항상 최신 index.html 확인
  if (/\/index\.html$/i.test(normalized)) {
    res.setHeader("Cache-Control", "no-cache");
    return;
  }

  // 이미지·폰트·미디어
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|webm|mp4|mov)$/i.test(normalized)) {
    res.setHeader("Cache-Control", "public, max-age=604800");
    return;
  }

  // 기타 정적 CSS/JS (public 루트 등)
  if (/\.(css|js)$/i.test(normalized)) {
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
}

const CHAIR_SWAP_STYLE_GUIDES: Record<string, string> = {
  Toss: `당신은 '토스(Toss)'의 UX 라이터입니다. 사용자가 직관적으로 이해할 수 있는 카피를 작성해야 합니다.
[토스 라이팅 원칙]
1. 한자어/전문용어 금지: '송금'->'보내기', '자금'->'돈', '완료되었습니다'->'보냈어요'.
2. 기능이 아닌 혜택 강조: 시스템이 무엇을 했는지보다, 사용자가 무엇을 얻었는지 말하세요.
3. 군더더기 제거: 수식어를 빼고 팩트만 전달하세요.
4. 능동태 사용: '~됩니다' 대신 '합니다', '하세요'를 쓰세요.
5. 불안감 제거: 행동하기 전에 명확한 정보를 제공하세요.`,
  Witty: `당신은 '센스 있는 예능 작가'입니다. 평범한 문장을 뻔하지 않게, 무릎을 탁 치게 만드는 위트 있는 문구로 바꿔주세요.
[작성 원칙]
1. 의외성 부여: 뻔한 설명 대신 예상치 못한 비유나 반전을 넣으세요.
2. 제4의 벽 넘기: 사용자와 공범이 된 것처럼 은근슬쩍 말을 건네세요.
3. 유행어/밈 활용: 적절한 드립을 섞어 친근함을 극대화하세요. (비속어 금지)
4. 솔직함: 친구에게 장난치듯 솔직하게 표현하세요.`,
  Emotional: `당신은 '새벽 감성 에세이 작가'입니다. 사실적인 정보보다는 그 안에 담긴 분위기, 온도, 질감을 묘사하세요.
[작성 원칙]
1. 공감각적 표현: 시각, 청각, 촉각적인 단어를 사용해 장면을 그리듯 묘사하세요.
2. 서술어의 부드러움: '~입니다' 대신 '~네요', '~인가 봐요'처럼 여운을 남겨 주세요.
3. 여백의 미: 모든 것을 설명하려 하지 말고 상상의 공간을 남겨두세요.
4. 위로와 공감: 따뜻한 톤을 유지하세요.`,
  Impact: `당신은 '글로벌 브랜드의 카피라이터'입니다. 심장을 뛰게 만들고 즉각적인 행동을 유도하는 강렬한 카피를 쓰세요.
[작성 원칙]
1. 단문 승부: 접속사를 빼고, 짧고 명료한 문장으로 끊으세요.
2. 명령형/청유형: '~할 수 있습니다' 대신 '하세요', '지금입니다', '시작해'로 밀어붙이세요.
3. 형용사 절제: 화려한 수식어보다 힘 있는 명사와 동사 하나를 쓰세요.
4. 자신감: 확신에 찬 긍정문을 사용하세요.`,
  Japanese: `당신은 '일본 소설 번역가'입니다. 일본 문학이나 영화 특유의 섬세하고 약간은 번역투 같은 문체를 구사하세요.
[작성 원칙]
1. 번역투의 미학: '나 자신', '그것은' 등 주어를 명확히 하거나 수동태를 섞으세요.
2. 구체적인 명사: '여름', '바람', '고양이', '자판기' 등 구체적 소재를 언급하세요.
3. 담담한 관조: 감정을 폭발시키기보다 한 발짝 떨어져서 서술하세요.
4. 계절감: 문맥에 맞다면 계절이나 날씨 이야기를 넌지시 섞으세요.`,
  Baemin: `당신은 '배달의민족 마케터'입니다. 진지함을 뺀 B급 감성과 유쾌한 패러디로 무장한 카피를 작성하세요.
[작성 원칙]
1. 언어유희(아재개그): 라임을 맞추거나 동음이의어를 활용하세요.
2. 포스터 감성: 굵은 폰트로 인쇄되었을 때 예쁜 짧은 문구를 만드세요.
3. 음식 비유: 가능한 모든 상황을 먹는 것과 연결해 보세요.
4. 뻔뻔함: 뻔뻔하고 당당하게 주장하세요.`,
  Musinsa: `당신은 '무신사 매거진 에디터'입니다. 트렌드에 민감하고, 전문적이면서도 시니컬한 톤 앤 매너를 유지하세요.
[작성 원칙]
1. 한영 혼용: '느낌'->'Mood', '핏'->'Silhouette' 처럼 영단어를 자연스럽게 섞으세요.
2. 디테일 강조: 소재, 질감, 디테일, 라인 등 구체적인 스펙을 언급하세요.
3. 시니컬한 쿨함: 너무 친절하지 말고 쿨하고 약간은 건방진 태도를 취하세요.
4. 단정적인 종결: '~인 것 같아요' 금지. '~다.', '~함.', 'The End.' 로 끝내세요.`,
  Dry: `당신은 감정이 배제된 '데이터 분석가'입니다. 어떠한 감정이나 미사여구 없이, 오직 팩트만을 건조하고 사무적으로 전달하세요.
[작성 원칙]
1. 감정 어휘 삭제: 감정적/주관적 형용사를 모두 제거하세요.
2. 개조식 서술: 극도로 짧은 문장, 혹은 명사형 종결('~함', '~임', '~완료', '~불가')을 사용하세요.
3. 인사 생략: 의례적인 인사를 생략하고 바로 정보만 출력하세요.
4. 객관화: 사용자를 '귀하'나 '사용자'로 칭하거나 현상 자체만 기술하세요.`,
};

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

  void Promise.allSettled([refreshLabcordPosts(), refreshToolSupporterPosts()]).then((results) => {
    const [labcordResult, toolSupporterResult] = results;
    if (labcordResult.status === "rejected") {
      console.error("Initial Labcord warmup failed:", labcordResult.reason);
    }
    if (toolSupporterResult.status === "rejected") {
      console.error("Initial Tool Supporter warmup failed:", toolSupporterResult.reason);
    }
  });

  app.get("/runtime-config.js", (_req, res) => {
    const adsenseClientId = sanitizeEnvValue(
      process.env.ADSENSE_CLIENT_ID || "ca-pub-9680572306636399",
    );
    const adsenseHomeSlotId = sanitizeEnvValue(
      process.env.ADSENSE_HOME_SLOT_ID || "9414681583",
    );
    const payload = {
      ADSENSE_CLIENT_ID: adsenseClientId,
      ADSENSE_HOME_SLOT_ID: adsenseHomeSlotId,
    };
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
      if (labcordPostsCache) {
        res.setHeader("Cache-Control", "no-store");
        return res.json({ posts: labcordPostsCache, stale: true });
      }
      return res.status(500).json({ error: String(error?.message || "LABcord 게시물을 불러오지 못했습니다.") });
    }
  });

  app.get("/api/tool-supporters", async (_req, res) => {
    try {
      const posts = await getToolSupporterPosts();
      res.setHeader("Cache-Control", "no-store");
      return res.json({ posts });
    } catch (error: any) {
      console.error("Tool Supporter notion fetch error:", error);
      if (toolSupporterPostsCache) {
        res.setHeader("Cache-Control", "no-store");
        return res.json({ posts: toolSupporterPostsCache, stale: true });
      }
      return res
        .status(500)
        .json({ error: String(error?.message || "Tool Supporter 게시물을 불러오지 못했습니다.") });
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
      if (
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.toLowerCase().includes("prepayment credits are depleted") ||
        message.toLowerCase().includes("quota exceeded")
      ) {
        return res.status(429).json({ error: "크레딧이 부족해요 ㅠㅠ 내일 다시 시도해주세요." });
      }
      res.status(500).json({ error: message || "생성에 실패했습니다." });
    }
  });

  /** Rotation(MultiView) — 클라이언트에 API 키를 두지 않고 서버에서만 Gemini 호출 */
  app.post("/api/multiview/analyze", async (req, res) => {
    const { sourceDataUrl, objectName } = req.body || {};
    if (!sourceDataUrl || typeof objectName !== "string") {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const src = decodeDataUrl(sourceDataUrl);
    if (!src.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const model =
      (process.env.MULTIVIEW_ANALYZE_MODEL || "").trim() || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { inlineData: { data: src.data, mimeType: src.mimeType } },
          {
            text: `Analyze if this image is already the FRONT view (facing the camera directly) of the object described as "${objectName}". Respond in JSON format with "isFront" (boolean) and "reason" (string, explaining your analysis in Korean).`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isFront: {
                type: Type.BOOLEAN,
                description: "Whether the image shows the object from its direct front view facing the camera.",
              },
              reason: {
                type: Type.STRING,
                description: "Brief explanation in Korean of why it is or is not the front view.",
              },
            },
            required: ["isFront", "reason"],
          },
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text.trim());
        return res.json({
          isFront: !!data.isFront,
          reason: typeof data.reason === "string" ? data.reason : "",
        });
      }
      res.json({ isFront: true, reason: "분석 결과를 받아오지 못했습니다. 기본값으로 정면 처리합니다." });
    } catch (error: any) {
      console.error("Multiview analyze error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다." });
      }
      res.status(500).json({ error: message || "정면 분석에 실패했습니다." });
    }
  });

  app.post("/api/multiview/front-view", async (req, res) => {
    const { sourceDataUrl, objectName } = req.body || {};
    if (!sourceDataUrl || typeof objectName !== "string") {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const src = decodeDataUrl(sourceDataUrl);
    if (!src.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const model =
      (process.env.MULTIVIEW_GEMINI_MODEL || "").trim() || "gemini-2.5-flash-image";
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildFrontViewPrompt(objectName);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { data: src.data, mimeType: src.mimeType } },
            { text: prompt },
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
      res.status(500).json({ error: "정면 이미지 생성 데이터가 없습니다." });
    } catch (error: any) {
      console.error("Multiview front-view error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Gemini API 키가 유효하지 않습니다." });
      }
      res.status(500).json({ error: message || "정면 이미지 생성에 실패했습니다." });
    }
  });

  app.post("/api/multiview/generate", async (req, res) => {
    const { frontDataUrl, sourceDataUrl, cubeDataUrl, rotation, originalDataUrl } = req.body || {};
    const frontUrl = frontDataUrl || sourceDataUrl;
    if (!frontUrl || !cubeDataUrl || !rotation || typeof rotation.x !== "number" || typeof rotation.y !== "number") {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다." });
    }

    const front = decodeDataUrl(frontUrl);
    const cube = decodeDataUrl(cubeDataUrl);
    if (!front.data || !cube.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const original =
      typeof originalDataUrl === "string" && originalDataUrl && originalDataUrl !== frontUrl
        ? decodeDataUrl(originalDataUrl)
        : null;
    const hasExtraReference = !!(original?.data);

    const model =
      (process.env.MULTIVIEW_GEMINI_MODEL || "").trim() || "gemini-2.5-flash-image";
    const ai = new GoogleGenAI({ apiKey });
    const perspectivePrompt = buildMultiviewPerspectivePrompt(
      {
        x: rotation.x,
        y: rotation.y,
        z: typeof rotation.z === "number" ? rotation.z : 0,
      },
      hasExtraReference,
    );

    const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
      { inlineData: { data: front.data, mimeType: front.mimeType } },
    ];
    if (hasExtraReference && original) {
      parts.push({ inlineData: { data: original.data, mimeType: original.mimeType } });
    }
    parts.push({ inlineData: { data: cube.data, mimeType: cube.mimeType } });
    parts.push({ text: perspectivePrompt });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
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

    const referenceContext = references as { color: string; type: string; imageDataUrl?: string }[];

    const finalPrompt = buildStoryboardGeneratePrompt(prompt, referenceContext);

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

  app.post("/api/bongjoonho/analyze", async (req, res) => {
    const { rotateX, rotateY, zoom } = req.body || {};
    if (
      typeof rotateX !== "number" ||
      typeof rotateY !== "number" ||
      typeof zoom !== "number"
    ) {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getYoungGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "서버에 YOUNG_GEMINI_API_KEY가 설정되어 있지 않습니다.",
      });
    }

    const model = (process.env.BONGJOONHO_GEMINI_MODEL || "").trim() || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `현재 카메라는 3D 인물 캐릭터를 다음과 같이 비추고 있어:
        - 수직 회전(Pitch): ${rotateX}도 (양수면 위에서 아래로, 음수면 아래서 위로)
        - 수평 회전(Yaw): ${rotateY}도 (0도면 정면, 180도면 뒷모습)
        - 확대 레벨(Zoom): ${zoom}배 (1.5 이상이면 근접 촬영, 0.7 이하면 원거리 촬영)

        이 인물 배치 구도를 기술적 용어로 분석해줘.
        분석 결과를 다음 JSON 구조로 반환해:
        - angle: 촬영 각도의 명칭 (예: 하이 앵글, 로우 앵글, 아이 레벨 등)
        - shotType: 샷의 종류 (예: 클로즈업, 바스트 샷, 웨이스트 샷, 니 샷, 풀 샷 등)
        - meaning: 이 구도가 시각적으로 전달하는 정보나 인물의 공간적 위상 (한국어)
        - symbolism: 이 각도에서 느껴지는 인물의 객관적인 인상과 시각적 특징 (한국어)`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              angle: { type: Type.STRING },
              shotType: { type: Type.STRING },
              meaning: { type: Type.STRING },
              symbolism: { type: Type.STRING },
            },
            required: ["angle", "shotType", "meaning", "symbolism"],
          },
        },
      });

      let result: Record<string, string> = {};
      try {
        result = JSON.parse(response.text || "{}");
      } catch {
        result = {};
      }

      return res.json({
        angle: result.angle || "",
        shotType: result.shotType || "",
        meaning: result.meaning || "",
        symbolism: result.symbolism || "",
      });
    } catch (error: any) {
      console.error("Bongjoonho analyze error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "YOUNG_GEMINI_API_KEY가 유효하지 않습니다." });
      }
      return res.status(500).json({ error: message || "분석에 실패했습니다." });
    }
  });

  app.post("/api/chair-swap/summarize", async (req, res) => {
    const { text, lockedPhrases, replaceablePhrases, targetLength } = req.body || {};
    if (
      typeof text !== "string" ||
      !Array.isArray(lockedPhrases) ||
      !Array.isArray(replaceablePhrases) ||
      typeof targetLength !== "number"
    ) {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getYoungGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "서버에 YOUNG_GEMINI_API_KEY가 설정되어 있지 않습니다.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = (process.env.CHAIR_SWAP_TEXT_MODEL || "").trim() || "gemini-2.5-flash";
    const prompt = `
      다음 텍스트를 "의자뺏기" 컨셉으로 요약 및 축약해주세요.
      의자뺏기 컨셉이란, 불필요한 미사여구를 제거하는 '삭제'를 넘어, 긴 문장의 구조를 완전히 재구성하여 가장 임팩트 있는 메시지만 남기는 '축약'을 수행하는 것입니다.

      서로 다른 스타일의 결과물을 정확히 3개 생성해주세요.

      [핵심 조건]
      1. 보존할 문구 (잠금 처리됨): ${lockedPhrases.length > 0 ? lockedPhrases.join(", ") : "없음"} -> 이 단어들은 절대 바꾸지 마세요.
      2. 교체할 문구 (교체 처리됨): ${replaceablePhrases.length > 0 ? replaceablePhrases.join(", ") : "없음"} -> 이 단어들은 의미가 비슷한 더 신선하거나 강렬한 유의어로 반드시 교체하세요.
      3. 줄임말 활용 (중요): 웹에서 실제 대중적으로 활발히 사용되는 실제 있는 줄임말이 있다면 적극 활용하여 글자수를 줄이세요.
      4. 나머지 문장 압축:
         - 잠금 단어가 아닌 부분은 의미가 통하는 선에서 가장 짧은 단어를 선택하세요.
         - 조사와 접속사는 과감히 삭제하세요.
      5. 목표 글자 수: 공백 포함 약 ${targetLength}자 내외

      [축약 및 교체 모범 답안 (참고용)]
      예시 1: "명절에만 진행하는 최대 할인 기획 특별전" -> "명절 초특가 기획전."
      예시 2: "화제의 두바이쫀득쿠키, 지금 바로 줄서지말고 에이블리에서 구매하세요" -> "두쫀쿠, 지금 에이블리에서 대기없이"
      예시 3: "봄비 오는 지금 내 차 와이퍼 점검하셨나요?" -> "봄비시즌, 늦기전에 와이퍼 점검."

      원본 텍스트:
      ${text}
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    summary: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["summary", "explanation"],
                },
              },
            },
            required: ["results"],
          },
        },
      });

      let result: { results: { summary: string; explanation: string }[] } = { results: [] };
      try {
        result = JSON.parse(response.text || '{"results": []}');
      } catch {
        result = { results: [] };
      }

      return res.json({ results: Array.isArray(result.results) ? result.results : [] });
    } catch (error: any) {
      console.error("Chair swap summarize error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "YOUNG_GEMINI_API_KEY가 유효하지 않습니다." });
      }
      return res.status(500).json({ error: message || "요약에 실패했습니다." });
    }
  });

  app.post("/api/chair-swap/image-match", async (req, res) => {
    const { imageDataUrl, keywords, tone, maxLength } = req.body || {};
    if (!imageDataUrl || typeof keywords !== "string" || typeof tone !== "string") {
      return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    }

    const apiKey = getYoungGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "서버에 YOUNG_GEMINI_API_KEY가 설정되어 있지 않습니다.",
      });
    }

    const image = decodeDataUrl(imageDataUrl);
    if (!image.data) {
      return res.status(400).json({ error: "이미지 데이터가 비어 있습니다." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = (process.env.CHAIR_SWAP_IMAGE_MODEL || "").trim() || "gemini-2.5-flash";
    const styleGuide = CHAIR_SWAP_STYLE_GUIDES[tone] || "전문 카피라이터";
    const prompt = `
      첨부된 이미지를 분석하고, 해당 이미지에 어울리는 창의적인 카피를 생성해주세요.
      [페르소나] ${styleGuide}
      [필수 조건]
      1. 키워드 포함: [ ${keywords} ]
      2. 작업 스타일: 이미지의 분위기와 맥락을 풍부하게 살리되, 지정된 글자 수를 절대적으로 준수하세요.
      3. 글자 수 제한: ${
        typeof maxLength === "number"
          ? `공백 포함 정확히 '${maxLength}자 이내' (엄격히 준수, 초과 시 절대 안 됨)`
          : "자유로운 길이"
      }

      [주의 사항]
      ${
        typeof maxLength === "number"
          ? `- 메인 카피(text)는 반드시 ${maxLength}자 이하여야 합니다. 1자라도 초과하면 실패입니다.`
          : ""
      }
      - 글자 수가 매우 적게 설정된 경우 핵심 명사나 파격적인 줄임말을 사용하여 임팩트 있게 축약하세요.

      [결과 스키마]
      - text: 메인 카피 문구
      - subtext: 해당 카피의 전략적 의도
      정확히 3가지 제안을 출력하세요.
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              copies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    subtext: { type: Type.STRING },
                  },
                  required: ["text", "subtext"],
                },
              },
            },
            required: ["copies"],
          },
        },
      });

      let result: { copies: { text: string; subtext: string }[] } = { copies: [] };
      try {
        result = JSON.parse(response.text || '{"copies": []}');
      } catch {
        result = { copies: [] };
      }

      return res.json({ copies: Array.isArray(result.copies) ? result.copies : [] });
    } catch (error: any) {
      console.error("Chair swap image-match error:", error);
      const message = String(error?.message || "");
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "YOUNG_GEMINI_API_KEY가 유효하지 않습니다." });
      }
      return res.status(500).json({ error: message || "이미지 매칭에 실패했습니다." });
    }
  });

  app.post("/api/upscaler/gemini", async (req, res) => {
    try {
      const { base64, imageSize, prompt, model } = req.body ?? {};
      const apiKey = getChaeGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "CHAE_GEMINI_API_KEY가 설정되어 있지 않습니다." });
      }
      if (!base64 || !prompt) {
        return res.status(400).json({ error: "이미지 데이터가 필요합니다." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || "gemini-3.1-flash-image-preview",
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: "image/png" } },
            { text: prompt },
          ],
        },
        config: {
          temperature: 0.05,
          topP: 0.2,
          imageConfig: { imageSize: (imageSize || "2K") as "1K" | "2K" | "4K" },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        return res.status(500).json({ error: "Gemini가 이미지를 반환하지 않았습니다." });
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          return res.json({ dataUrl: `data:${mime};base64,${part.inlineData.data}` });
        }
      }

      return res.status(500).json({ error: "Gemini가 이미지를 반환하지 않았습니다." });
    } catch (error: any) {
      console.error("Upscaler gemini error:", error);
      const message = String(error?.message || "");
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "크레딧이 부족해요 ㅠㅠ 내일 다시 시도해주세요." });
      }
      return res.status(500).json({ error: message || "Gemini 업스케일에 실패했습니다." });
    }
  });

  app.post("/api/upscaler/openai", async (req, res) => {
    const started = Date.now();
    try {
      const { base64, outputSize, prompt, quality, model } = req.body ?? {};
      const apiKey = getChaeGptApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "CHAE_GPT_API_KEY가 설정되어 있지 않습니다." });
      }
      if (!base64 || !prompt) {
        return res.status(400).json({ error: "이미지 데이터가 필요합니다." });
      }

      const buffer = Buffer.from(base64, "base64");
      const blob = new Blob([buffer], { type: "image/png" });
      const form = new FormData();
      form.append("model", model || "gpt-image-2");
      form.append("prompt", prompt);
      form.append("quality", quality || "high");
      form.append("output_format", "png");
      form.append("background", "opaque");
      form.append("size", outputSize || "1024x1024");
      form.append("image", blob, "input.png");

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errText = typeof data?.error?.message === "string" ? data.error.message : JSON.stringify(data);
        if (response.status === 429) {
          return res.status(429).json({ error: "크레딧이 부족해요 ㅠㅠ 내일 다시 시도해주세요." });
        }
        return res.status(response.status).json({ error: errText || "OpenAI 업스케일에 실패했습니다." });
      }

      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        return res.status(500).json({ error: "OpenAI가 이미지를 반환하지 않았습니다." });
      }

      return res.json({
        dataUrl: `data:image/png;base64,${b64}`,
        durationMs: Date.now() - started,
      });
    } catch (error: any) {
      console.error("Upscaler openai error:", error);
      return res.status(500).json({ error: String(error?.message || "OpenAI 업스케일에 실패했습니다.") });
    }
  });

  // [2순위] 정적 파일 설정 (배포용)
  const distPath = path.resolve(process.cwd(), "dist");
  const publicAdsTxtPath = path.resolve(process.cwd(), "public", "ads.txt");
  const distAdsTxtPath = path.join(distPath, "ads.txt");

  app.get("/ads.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(publicAdsTxtPath, (err) => {
      if (err) {
        res.sendFile(distAdsTxtPath, (fallbackErr) => {
          if (fallbackErr) {
            res.status(404).type("text/plain").send("Not found");
          }
        });
      }
    });
  });

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        applyStaticCacheHeaders(res, filePath);
      },
    }),
  );

  // [3순위] SPA 폴백 — 실제 정적 파일(또는 /assets/*) 요청에는 index.html을 주지 않습니다.
  // 그렇지 않으면 누락된 JS가 HTML로 내려가 브라우저가 조용히 흰 화면만 냅니다.
  app.get(/.*/, (req, res) => {
    const p = req.path;
    if (p.startsWith("/assets/") || /\.[a-zA-Z0-9]+$/.test(p)) {
      return res.status(404).type("text/plain").send("Not found");
    }
    res.setHeader("Cache-Control", "no-cache");
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
