import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  // Cloud Run / Firebase App Hosting: PORT(기본 8080)로 0.0.0.0에 바인딩해야 헬스체크가 통과합니다.
  const PORT = Number(process.env.PORT) || 8080;
  const HOST = process.env.HOST || "0.0.0.0";

  app.use(express.json({ limit: '50mb' }));

  // [1순위] Gemini API Proxy Route (감자님의 소중한 로직)
  app.post("/api/generate", async (req, res) => {
    const { keyword, styleSuffix, referenceImageBase64, variationIndex } = req.body;
    
    if (!keyword || !styleSuffix) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
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

  // [2순위] 정적 파일 설정 (배포용)
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));

  // [3순위] SPA 대응 (Express 5 에러 방지 정규식)
  app.get(/.*/, (req, res) => {
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
