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

    const apiKey =
      (typeof req.headers["x-google-api-key"] === "string" && req.headers["x-google-api-key"].trim()) ||
      (typeof req.headers["x-gemini-api-key"] === "string" && req.headers["x-gemini-api-key"].trim()) ||
      "";
    if (!apiKey) {
      return res.status(401).json({
        error: "Google API Key가 없습니다. 메인 화면에서 API Key를 등록해 주세요.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.replace(/^"|"$/g, "").replace(/^'|'$/g, "") });

    try {
      // 1. 키워드 번역 및 정제
      const translationResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a creative prompt engineer for an AI image generator.
        Translate the Korean word "${keyword}" into a cute, toy-like English visual description.
        
        Strict Rules:
        1. If the word is "주사위" or relates to "Dice", translate it as "a cute decorative toy cube with soft rounded edges". NEVER use the word 'dice' or 'gambling'.
        2. Describe the object as a simplified, chunky, and adorable miniature toy version.
        3. Focus on "kawaii" proportions: oversized features, soft rounded silhouettes, and a charming toy-like structure.
        4. Do NOT include color words in the translation unless essential.
        5. Output ONLY the English description.`,
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
      Background: ESSENTIAL - Solid, pure, clean flat WHITE background. NO shadows on the floor, NO horizon line, just the object isolated on WHITE.
      Color Guidance: ALWAYS prioritize a high-lightness, bright pastel color palette across all styles. Except for Glass & Hologram style, reflect and incorporate the natural, iconic, or culturally signature colors associated with "${keyword}" (e.g. green/red/gold for a Christmas tree, yellow for a banana) re-interpreted in clean, high-brightness, soft pastel hues so the object's identity is clearly preserved without dark or murky tones.
      Detail: Focus intensely on the tactile surface qualities. 
      If fabric/knitted, make sure to use high-lightness bright pastel wool yarns (focused on 1 to 2 main harmonious pastel color families suited for the object's signature look, avoiding plain all-white yarn and strictly avoiding 3+ chaotic colors), detailed crochet stitches, and amigurumi knit patterns clearly like a real handmade doll.
      If modern 3D, render a sleek digital 3D style using smooth precision-chamfered plastic with a soft satin sheen and subtle glossy reflections, crisp geometric contours with ZERO handmade imperfections, and a clean minimalist high-lightness bright pastel color palette respecting the object's iconic colors.
      If 3D clay, show rich organic stop-motion claymation details: visible subtle thumbprints, clay dough seams, and handcrafted plasticine texture in bright pastel shades reflecting the object's signature colors.
      If glass, show high transparency and light refraction with a subtle shimmering iridescent rainbow hologram sheen, combined with 1 gentle pastel color tint (strictly avoiding dark purple/amethyst dominance). 
      Form: Chunky, simplified, rounded "kawaii" designer toy silhouette.
      Lighting: Soft studio lighting with crisp highlight reflections that enhance the material's texture without casting heavy dark shadows.
      Composition: ${selectedView}, perfectly centered.
      Prohibited: NO text, NO labels, NO people, NO realistic skin, NO photographic noise, NO background elements.`;

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
        return res.status(401).json({
          error: "Google API Key가 유효하지 않습니다. 메인 화면에서 키를 다시 등록해 주세요.",
          code: "INVALID_API_KEY",
        });
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
