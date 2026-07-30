import OpenAI from "openai";
import { DesignConfig } from "../types";
import { notifyInvalidApiKey } from "../../../src/lib/apiKeys";

type LogoStrategy = {
  coreConcept: string;
  visualStyle: string;
  compositionPlan: string;
  colorPlan: string;
  constraints: string[];
};

type FontSketchProfile = {
  cornerStyle: "angular" | "rounded" | "mixed";
  strokeWeight: "light" | "medium" | "bold" | "ultra-bold";
  regularity: "structured" | "organic" | "irregular";
  tilt: "upright" | "slanted" | "mixed";
  energy: "calm" | "playful" | "aggressive";
  notes: string;
};

type StyleRefProfile = {
  colorPalette: string;
  strokeStyle: string;
  decorationLevel: "minimal" | "moderate" | "rich";
  mood: string;
  texture: string;
  notes: string;
};

type LogoScript = "korean" | "english" | "mixed";

const detectLogoScript = (text: string): LogoScript => {
  const koreanCount = (text.match(/[\uAC00-\uD7A3\u3131-\u318E]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (koreanCount === 0 && latinCount === 0) return "mixed";
  if (koreanCount > latinCount * 1.2) return "korean";
  if (latinCount > koreanCount * 1.2) return "english";
  return "mixed";
};

const buildScriptInstruction = (script: LogoScript, logoText: string) => {
  if (!logoText.trim()) {
    return "No explicit logo text provided. Infer brand name only from references if needed, but never render style instructions as logo text.";
  }
  if (script === "english") {
    return `Render ONLY this exact English logo text on the logo: "${logoText.trim()}". Do NOT add any other words from style instructions. Do NOT translate into Korean.`;
  }
  if (script === "korean") {
    return `Render ONLY this exact Korean logo text on the logo: "${logoText.trim()}". Do NOT add any other words from style instructions. Do NOT translate into English.`;
  }
  return `Render ONLY this exact logo text on the logo: "${logoText.trim()}". Preserve original script. Do NOT render style instructions as visible text.`;
};

const buildLogoTextBlock = (logoText: string, stylePrompt: string) => {
  const trimmedLogo = logoText.trim();
  const trimmedStyle = stylePrompt.trim();
  return `[LOGO TEXT — RENDER EXACTLY ON LOGO]
${trimmedLogo || "(none — infer only from references if absolutely necessary)"}

[STYLE INSTRUCTIONS — NEVER RENDER AS VISIBLE TEXT]
${trimmedStyle || "(none)"}

CRITICAL: Only the LOGO TEXT section may appear as lettering on the logo. Style instructions describe look/feel only and must NOT be written on the logo.`;
};

const buildManualColorInstruction = (config: DesignConfig) =>
  `[MANDATORY MANUAL COLOR PALETTE]
- Point/Accent color (main highlights, key strokes): ${config.colors.main}
- Base/Secondary color (fills, supporting elements): ${config.colors.sub}
- These hex colors are REQUIRED. Do not substitute other primary colors.
- Build the logo primarily from these two colors with tasteful tints/shades only.`;

const STYLE_BANK_GUIDE = `
[STYLE BANK - QUALITY REFERENCES]
Use these as internal style families and pick the best fit from user intent:
1) Wild Angular Hand-Drawn: bold, tilted, irregular, playful, energetic.
2) Geometric Pop Minimal: clean primitives, strong shape language, clear hierarchy.
3) Cute Puffy/Kawaii: rounded forms, sticker-like outlines, pastel accents, soft highlights.
4) Retro Pixel/Arcade: chunky pixel edges, high contrast accents, nostalgic decorative icons.
5) Heavy Broadcast/K-League Title: aggressive motion, thick strokes, sporty impact.
6) Elegant Soft Curves: balanced spacing, restrained decoration, premium calm tone.

[QUALITY BAR]
- Strong silhouette readability at small size.
- Intentional spacing and visual rhythm.
- Controlled contrast (not muddy, not flat).
- Decor supports lettering, never overwhelms it.
- Infer 1 key semantic motif from prompt (e.g., money, growth, home, tech) and express it subtly.
`;

const aspectRatioToSize: Record<DesignConfig["aspectRatio"], string> = {
  "1:1": "1024x1024",
  "4:3": "1536x1024",
  "16:9": "1536x1024",
};

const normalizeKeyValue = (value?: string) =>
  (value || "").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");

const readSessionOpenAiKey = (): string => {
  try {
    const raw = sessionStorage.getItem("gamja.apiKeys.session");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { openai?: string };
    return normalizeKeyValue(parsed.openai);
  } catch {
    return "";
  }
};

const getClient = () => {
  const apiKey = readSessionOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API Key가 없습니다. 메인 화면에서 OpenAI API Key를 등록해 주세요.",
    );
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

const plannerModelCandidates = [
  import.meta.env.VITE_OPENAI_PLANNER_MODEL,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

// 기본은 gpt-image-2(덕테이프) 고정. 필요시 env로만 덮어쓰기.
const primaryImageModel = import.meta.env.VITE_OPENAI_IMAGE_MODEL || "gpt-image-2";

const formatOpenAiError = (err: any) => {
  const blob = `${err?.code ?? ""} ${err?.type ?? ""} ${err?.message ?? ""}`.toLowerCase();
  if (
    err?.status === 401 ||
    blob.includes("invalid_api_key") ||
    blob.includes("incorrect api key")
  ) {
    notifyInvalidApiKey();
  }

  const parts = [
    err?.status ? `HTTP ${err.status}` : "",
    err?.code ? `code=${err.code}` : "",
    err?.type ? `type=${err.type}` : "",
    err?.message || "Unknown OpenAI error",
  ].filter(Boolean);

  return parts.join(" | ");
};

const buildStrategyPrompt = (
  logoText: string,
  stylePrompt: string,
  config: DesignConfig,
  variationHint: string,
  hasStyleRef: boolean,
  hasCompositionRef: boolean,
  hasFontSketch: boolean,
  fontSketchProfile: FontSketchProfile | null,
  styleRefProfile: StyleRefProfile | null,
  logoScript: LogoScript
) => {
  const strictFontSimilarityMode = hasFontSketch;
  const colorInstruction =
    config.colorMode === "auto"
      ? "Decide color palette autonomously from user intent and references."
      : buildManualColorInstruction(config);

  return `
You are a senior Korean lettering logo creative director.
Please decide everything from scratch in the same spirit as a direct ChatGPT request.
The user wants AI-led end-to-end creative decisions.

${STYLE_BANK_GUIDE}

${buildLogoTextBlock(logoText, stylePrompt)}

[VARIATION HINT]
${variationHint || "(none)"}

[CONFIG]
- aspect ratio: ${config.aspectRatio}
- color mode: ${config.colorMode}
- color guidance: ${colorInstruction}
- font sketch provided: ${hasFontSketch ? "yes" : "no"}
- style ref provided: ${hasStyleRef ? "yes" : "no"}
- composition ref provided: ${hasCompositionRef ? "yes" : "no"}

[LETTERING SCRIPT]
${buildScriptInstruction(logoScript, logoText)}

[REFERENCE PRIORITY]
- If FONT SKETCH exists, it has absolute top priority for letterform morphology (stroke flow, proportion, angle, curvature, terminal shape, playful character).
- STYLE reference (second priority after font sketch) must strongly influence color mood, stroke finish, decoration density, and visual texture.
- When STYLE reference is provided, colorPlan and visualStyle must explicitly follow the uploaded style reference image.
- Composition reference only guides overall placement.
- Reject generations that drift away from FONT SKETCH skeleton when font sketch is provided.
- FONT similarity priority mode: ${strictFontSimilarityMode ? "ON (STRICT)" : "OFF"}

[STYLE PROFILE EXTRACTED FROM REFERENCE]
${styleRefProfile ? `
- color palette: ${styleRefProfile.colorPalette}
- stroke style: ${styleRefProfile.strokeStyle}
- decoration level: ${styleRefProfile.decorationLevel}
- mood: ${styleRefProfile.mood}
- texture: ${styleRefProfile.texture}
- notes: ${styleRefProfile.notes}
` : "- no profile (no style reference)"}

[FONT PROFILE EXTRACTED FROM SKETCH]
${fontSketchProfile ? `
- corner style: ${fontSketchProfile.cornerStyle}
- stroke weight: ${fontSketchProfile.strokeWeight}
- regularity: ${fontSketchProfile.regularity}
- tilt: ${fontSketchProfile.tilt}
- energy: ${fontSketchProfile.energy}
- notes: ${fontSketchProfile.notes}
` : "- no profile (no font sketch)"}

Output strict JSON that matches schema.
Keep each field concise and practical for an image generation model.
visualStyle must name one clear style family and why it matches the user's intent.
constraints should include one subtle keyword motif insertion rule.
`;
};

const logoStrategySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    coreConcept: { type: "string" },
    visualStyle: { type: "string" },
    compositionPlan: { type: "string" },
    colorPlan: { type: "string" },
    constraints: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "coreConcept",
    "visualStyle",
    "compositionPlan",
    "colorPlan",
    "constraints",
  ],
};

const styleRefProfileSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    colorPalette: { type: "string" },
    strokeStyle: { type: "string" },
    decorationLevel: { type: "string", enum: ["minimal", "moderate", "rich"] },
    mood: { type: "string" },
    texture: { type: "string" },
    notes: { type: "string" },
  },
  required: ["colorPalette", "strokeStyle", "decorationLevel", "mood", "texture", "notes"],
};

const fontSketchProfileSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    cornerStyle: { type: "string", enum: ["angular", "rounded", "mixed"] },
    strokeWeight: { type: "string", enum: ["light", "medium", "bold", "ultra-bold"] },
    regularity: { type: "string", enum: ["structured", "organic", "irregular"] },
    tilt: { type: "string", enum: ["upright", "slanted", "mixed"] },
    energy: { type: "string", enum: ["calm", "playful", "aggressive"] },
    notes: { type: "string" },
  },
  required: ["cornerStyle", "strokeWeight", "regularity", "tilt", "energy", "notes"],
};

const buildFinalImagePrompt = (
  strategy: LogoStrategy,
  logoText: string,
  stylePrompt: string,
  variationHint: string,
  config: DesignConfig,
  hasFontSketch: boolean,
  hasStyleRef: boolean,
  fontSketchProfile: FontSketchProfile | null,
  styleRefProfile: StyleRefProfile | null,
  logoScript: LogoScript
) => `
Create a high-quality logo on pure white background.

${buildLogoTextBlock(logoText, stylePrompt)}

[Creative Direction Decided by Planner]
- Core concept: ${strategy.coreConcept}
- Visual style: ${strategy.visualStyle}
- Composition: ${strategy.compositionPlan}
- Color plan: ${strategy.colorPlan}
- Constraints: ${strategy.constraints.join("; ")}

[Variation]
${variationHint || "(none)"}

[Lettering Script - Mandatory]
${buildScriptInstruction(logoScript, logoText)}

[Critical Legibility Requirement]
- Keep every character readable exactly as intended text.
- If text includes "돈", it must be unmistakably readable as "돈" (not "톤", "론", etc.).

${config.colorMode === "manual" ? buildManualColorInstruction(config) : ""}

[Style Reference Guidance]
${hasStyleRef ? "- Match the uploaded STYLE REFERENCE image closely for color mood, stroke finish, decoration density, and texture." : "- No dedicated style reference; choose style autonomously."}
${styleRefProfile ? `- Apply extracted style profile strictly: ${JSON.stringify(styleRefProfile)}` : ""}

[Typography Guidance]
- ${hasFontSketch ? "Use uploaded FONT SKETCH as letterform morphology reference only." : "No dedicated font sketch provided."}
- Preserve readability while following the sketch rhythm and stroke feeling.
- If FONT SKETCH exists, match its skeleton and personality first; style is second.
- Do not reinterpret into a different typeface when FONT SKETCH is provided.
- Preserve sketch traits such as tilt, angularity/roundness balance, chunky weight, playful irregularity, and hand-drawn energy.
- ${hasFontSketch ? "FONT similarity priority mode is ON and mandatory." : "Font similarity priority mode is OFF."}
- ${fontSketchProfile ? `Apply extracted profile strictly: ${JSON.stringify(fontSketchProfile)}` : "No extracted font profile."}

[Hard Rules]
- Clean white background (#FFFFFF), no scene/background objects.
- Logo-first framing with strong legibility.
- Crisp edges, vector-like feel.
- Do not include watermarks or mockup elements.
- Preserve the intended naming text exactly. Do not translate, paraphrase, replace, or invent brand words.
- Never convert English logo text into Korean, and never convert Korean logo text into English.
- Never write style instructions (e.g. "필기체", "단색", "두꺼운") as visible logo lettering.
- Make this variation meaningfully different from other random attempts.
- Keep output at high design quality bar (spacing, hierarchy, contrast, finish).
- Include at least one subtle motif tied to the main keyword from user intent (for finance: coin, graph, arrow, currency cue, etc.).
- Keep motif integrated into lettering/logo shape; avoid turning it into a separate large sticker.
- Decorative accents must not cover or break core glyph strokes/counters.
- Keep accents in negative space / outside contours when possible.
- Prioritize text readability over decoration at all times.
- If extracted cornerStyle is angular, avoid excessive rounding.
- If extracted cornerStyle is rounded, avoid aggressive sharp corners.
- Preserve extracted strokeWeight and tilt before adding decorative styling.
- Across variations, keep the same font skeleton but intentionally diversify color system and decoration language.
- Avoid producing four near-identical colorways.
`;

const extractGeneratedImage = (response: any): string | null => {
  const outputs = response?.output ?? [];

  for (const item of outputs) {
    if (item?.type === "image_generation_call" && item?.result) {
      return `data:image/png;base64,${item.result}`;
    }
  }

  return null;
};

const extractImageFromImagesApi = (response: any): string | null => {
  const first = response?.data?.[0];
  if (!first) return null;
  if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first.url) return first.url;
  return null;
};

const toDataUrlFromRemoteImage = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image URL: ${response.status}`);
  }
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const normalizeImageResult = async (imageDataOrUrl: string): Promise<string> => {
  if (imageDataOrUrl.startsWith("data:image")) return imageDataOrUrl;
  if (imageDataOrUrl.startsWith("http")) return toDataUrlFromRemoteImage(imageDataOrUrl);
  return imageDataOrUrl;
};

const createPlannerStrategy = async (
  client: OpenAI,
  plannerInput: any[]
): Promise<LogoStrategy> => {
  let lastError: unknown;

  for (const model of plannerModelCandidates) {
    try {
      const strategyResponse = await client.responses.create({
        model,
        input: plannerInput,
        text: {
          format: {
            type: "json_schema",
            name: "logo_strategy",
            schema: logoStrategySchema,
          },
        },
      });

      return JSON.parse(strategyResponse.output_text) as LogoStrategy;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Planner failed: ${formatOpenAiError(lastError)}`);
};

const analyzeStyleRefProfile = async (
  client: OpenAI,
  styleRefImage: string | null
): Promise<StyleRefProfile | null> => {
  if (!styleRefImage) return null;
  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this logo style reference image. Extract color palette, stroke style, decoration density, mood, and texture for logo generation. Return strict JSON.",
            },
            {
              type: "input_image",
              image_url: styleRefImage,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "style_ref_profile",
          schema: styleRefProfileSchema,
        },
      },
    });
    return JSON.parse(response.output_text) as StyleRefProfile;
  } catch {
    return null;
  }
};

const analyzeFontSketchProfile = async (
  client: OpenAI,
  fontSketchImage: string | null
): Promise<FontSketchProfile | null> => {
  if (!fontSketchImage) return null;
  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this font sketch and extract lettering morphology profile for logo generation. Focus on corner shape, stroke weight, regularity, tilt, and visual energy. Return strict JSON.",
            },
            {
              type: "input_image",
              image_url: fontSketchImage,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "font_sketch_profile",
          schema: fontSketchProfileSchema,
        },
      },
    });
    return JSON.parse(response.output_text) as FontSketchProfile;
  } catch {
    return null;
  }
};

const createImageWithFallback = async (
  client: OpenAI,
  imageInput: any[],
  size: string
): Promise<string> => {
  const promptText = imageInput?.[1]?.content
    ?.filter((item: any) => item.type === "input_text")
    ?.map((item: any) => item.text)
    ?.join("\n\n");
  const hasReferenceImages = imageInput?.[1]?.content?.some(
    (item: any) => item.type === "input_image"
  );
  const model = primaryImageModel;

  // Reference images must go through responses API so the model can actually see them.
  if (hasReferenceImages) {
    try {
      const withRefs = await client.responses.create({
        model,
        input: imageInput,
        tools: [{ type: "image_generation" }],
      } as any);

      const withRefsImage = extractGeneratedImage(withRefs);
      if (withRefsImage) return await normalizeImageResult(withRefsImage);
      throw new Error(`No image returned from model '${model}' with references.`);
    } catch (err) {
      // Fallback: style/font profiles are already embedded in the text prompt.
      if (model.startsWith("gpt-image")) {
        try {
          const imageResponse = await client.images.generate({
            model,
            prompt: `${promptText}\n\nOutput size: ${size}.`,
            size: size === "1024x1024" ? "1024x1024" : "1536x1024",
          } as any);

          const imageData = extractImageFromImagesApi(imageResponse);
          if (imageData) return await normalizeImageResult(imageData);
        } catch {
          // throw original reference error below
        }
      }
      throw new Error(`Image generation with references failed (model='${model}'): ${formatOpenAiError(err)}`);
    }
  }

  // gpt-image 계열: images.generate (text-only)
  if (model.startsWith("gpt-image")) {
    try {
      const imageResponse = await client.images.generate({
        model,
        prompt: promptText,
        size: size === "1024x1024" ? "1024x1024" : "1536x1024",
      } as any);

      const imageData = extractImageFromImagesApi(imageResponse);
      if (imageData) return await normalizeImageResult(imageData);
      throw new Error(`No image returned from model '${model}'.`);
    } catch (err) {
      throw new Error(`Image generation failed (model='${model}'): ${formatOpenAiError(err)}`);
    }
  }

  // env에서 responses + image_generation 모델을 지정한 경우만 사용
  try {
    const withSize = await client.responses.create({
      model,
      input: imageInput,
      tools: [{ type: "image_generation" }],
    } as any);

    const withSizeImage = extractGeneratedImage(withSize);
    if (withSizeImage) return await normalizeImageResult(withSizeImage);
    throw new Error(`No image returned from model '${model}'.`);
  } catch (err) {
    throw new Error(`Image generation failed (model='${model}'): ${formatOpenAiError(err)}`);
  }
};

export const generateLogoConcept = async (
  logoText: string,
  stylePrompt: string,
  config: DesignConfig,
  variationHint: string,
  styleRefImage: string | null,
  compositionRefImage: string | null,
  fontSketchImage: string | null
): Promise<string> => {
  const client = getClient();
  const logoScript = detectLogoScript(logoText.trim() || stylePrompt);
  const [fontSketchProfile, styleRefProfile] = await Promise.all([
    analyzeFontSketchProfile(client, fontSketchImage),
    analyzeStyleRefProfile(client, styleRefImage),
  ]);

  const plannerInput: any[] = [
    {
      role: "system",
      content:
        "You plan visual generation strategy for logo design tasks. Return strict JSON only.",
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: buildStrategyPrompt(
            logoText,
            stylePrompt,
            config,
            variationHint,
            Boolean(styleRefImage),
            Boolean(compositionRefImage),
            Boolean(fontSketchImage),
            fontSketchProfile,
            styleRefProfile,
            logoScript
          ),
        },
      ],
    },
  ];

  if (compositionRefImage) {
    plannerInput[1].content.push({
      type: "input_image",
      image_url: compositionRefImage,
    });
  }

  if (fontSketchImage) {
    plannerInput[1].content.push({
      type: "input_image",
      image_url: fontSketchImage,
    });
  }

  if (styleRefImage) {
    plannerInput[1].content.push({
      type: "input_image",
      image_url: styleRefImage,
    });
  }

  const strategy = await createPlannerStrategy(client, plannerInput);

  const imageInput: any[] = [
    {
      role: "system",
      content:
        "You are an expert logo image generator. Follow user intent and planner strategy accurately.",
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: buildFinalImagePrompt(
            strategy,
            logoText,
            stylePrompt,
            variationHint,
            config,
            Boolean(fontSketchImage),
            Boolean(styleRefImage),
            fontSketchProfile,
            styleRefProfile,
            logoScript
          ),
        },
      ],
    },
  ];

  if (compositionRefImage) {
    imageInput[1].content.push({
      type: "input_image",
      image_url: compositionRefImage,
    });
  }

  if (fontSketchImage) {
    imageInput[1].content.push({
      type: "input_image",
      image_url: fontSketchImage,
    });
  }

  if (styleRefImage) {
    imageInput[1].content.push({
      type: "input_image",
      image_url: styleRefImage,
    });
  }

  return createImageWithFallback(
    client,
    imageInput,
    aspectRatioToSize[config.aspectRatio]
  );
};

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/png" });
};

const createMaskDataUrl = async (
  imageDataUrl: string,
  box: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const image = new Image();
  image.src = imageDataUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create mask context");

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.clearRect(box.x, box.y, box.width, box.height);

  return canvas.toDataURL("image/png");
};

export const editLogoRegion = async (
  imageDataUrl: string,
  normalizedBox: { x: number; y: number; width: number; height: number },
  editPrompt: string
): Promise<string> => {
  if (!editPrompt.trim()) {
    throw new Error("Edit prompt is required.");
  }

  const client = getClient();
  const imageFile = await dataUrlToFile(imageDataUrl, "logo-base.png");

  const image = new Image();
  image.src = imageDataUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const pixelBox = {
    x: Math.max(0, Math.floor(normalizedBox.x * image.width)),
    y: Math.max(0, Math.floor(normalizedBox.y * image.height)),
    width: Math.max(1, Math.floor(normalizedBox.width * image.width)),
    height: Math.max(1, Math.floor(normalizedBox.height * image.height)),
  };

  const maskDataUrl = await createMaskDataUrl(imageDataUrl, pixelBox);
  const maskFile = await dataUrlToFile(maskDataUrl, "logo-mask.png");

  try {
    const result = await client.images.edit({
      model: primaryImageModel.startsWith("gpt-image") ? primaryImageModel : "gpt-image-2",
      image: imageFile,
      mask: maskFile,
      prompt: `${editPrompt}\n\nEdit ONLY the transparent masked region. Keep all opaque/unmasked areas pixel-identical. Do not burn selection strokes or overlay marks into the result.`,
      size: image.width === image.height ? "1024x1024" : "1536x1024",
    } as any);

    const imageData = extractImageFromImagesApi(result);
    if (!imageData) {
      throw new Error("No edited image returned.");
    }

    return await normalizeImageResult(imageData);
  } catch (err) {
    throw new Error(`Region edit failed: ${formatOpenAiError(err)}`);
  }
};

export const editLogoGlobal = async (
  imageDataUrl: string,
  editPrompt: string
): Promise<string> => {
  if (!editPrompt.trim()) {
    throw new Error("Edit prompt is required.");
  }

  const client = getClient();
  const model = primaryImageModel.startsWith("gpt-image") ? primaryImageModel : "gpt-image-2";

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Edit this logo image based on the instruction below.
Apply the change across the whole logo while preserving overall style, layout, and lettering readability.
Do not add selection marks, brush strokes, or overlay artifacts.

[Edit Instruction]
${editPrompt.trim()}`,
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
            },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    } as any);

    const imageData = extractGeneratedImage(response);
    if (!imageData) {
      throw new Error("No edited image returned.");
    }

    return await normalizeImageResult(imageData);
  } catch (err) {
    throw new Error(`Global edit failed: ${formatOpenAiError(err)}`);
  }
};

export const editLogoWithMask = async (
  imageDataUrl: string,
  maskDataUrl: string,
  editPrompt: string
): Promise<string> => {
  if (!editPrompt.trim()) {
    throw new Error("Edit prompt is required.");
  }

  const client = getClient();
  const imageFile = await dataUrlToFile(imageDataUrl, "logo-base.png");
  const maskFile = await dataUrlToFile(maskDataUrl, "logo-mask.png");

  const image = new Image();
  image.src = imageDataUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  try {
    const result = await client.images.edit({
      model: primaryImageModel.startsWith("gpt-image") ? primaryImageModel : "gpt-image-2",
      image: imageFile,
      mask: maskFile,
      prompt: `${editPrompt}\n\nEdit ONLY the transparent masked region. Keep all opaque/unmasked areas pixel-identical. Do not burn selection strokes or overlay marks into the result.`,
      size: image.width === image.height ? "1024x1024" : "1536x1024",
    } as any);

    const imageData = extractImageFromImagesApi(result);
    if (!imageData) {
      throw new Error("No edited image returned.");
    }

    return await normalizeImageResult(imageData);
  } catch (err) {
    throw new Error(`Mask edit failed: ${formatOpenAiError(err)}`);
  }
};
