import OpenAI from "openai";
import { DesignConfig } from "../types";

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

const normalizeEnvValue = (value?: string) =>
  (value || "").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");

const getClient = () => {
  const apiKey = normalizeEnvValue(import.meta.env.CHAE_GPT_API_KEY);
  if (!apiKey) {
    throw new Error("CHAE_GPT_API_KEY is missing. Set it in .env.local (see vite envPrefix).");
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

const plannerModelCandidates = [
  import.meta.env.VITE_OPENAI_PLANNER_MODEL,
  "gpt-4o-mini",
].filter(Boolean) as string[];

/** 로고 생성·편집에 사용하는 이미지 모델 (고정) */
const primaryImageModel = "gpt-image-2";

export type LogoGenerationContext = {
  strategy: LogoStrategy;
  fontSketchProfile: FontSketchProfile | null;
};

const formatOpenAiError = (err: any) => {
  const parts = [
    err?.status ? `HTTP ${err.status}` : "",
    err?.code ? `code=${err.code}` : "",
    err?.type ? `type=${err.type}` : "",
    err?.message || "Unknown OpenAI error",
  ].filter(Boolean);

  return parts.join(" | ");
};

const buildStrategyPrompt = (
  userPrompt: string,
  config: DesignConfig,
  variationHint: string,
  hasStyleRef: boolean,
  hasCompositionRef: boolean,
  hasFontSketch: boolean,
  fontSketchProfile: FontSketchProfile | null
) => {
  const strictFontSimilarityMode = hasFontSketch;
  const colorInstruction =
    config.colorMode === "auto"
      ? "Decide color palette autonomously from user intent and references."
      : `Use manual palette. Accent: ${config.colors.main}, Base: ${config.colors.sub}.`;

  return `
You are a senior Korean lettering logo creative director.
Please decide everything from scratch in the same spirit as a direct ChatGPT request.
The user wants AI-led end-to-end creative decisions.

${STYLE_BANK_GUIDE}

[USER PROMPT]
${userPrompt || "(empty prompt, infer intent from reference images)"}

[VARIATION HINT]
${variationHint || "(none)"}

[CONFIG]
- aspect ratio: ${config.aspectRatio}
- color mode: ${config.colorMode}
- color guidance: ${colorInstruction}
- font sketch provided: ${hasFontSketch ? "yes" : "no"}
- style ref provided: ${hasStyleRef ? "yes" : "no"}
- composition ref provided: ${hasCompositionRef ? "yes" : "no"}

[REFERENCE PRIORITY]
- If FONT SKETCH exists, it has absolute top priority for letterform morphology (stroke flow, proportion, angle, curvature, terminal shape, playful character).
- STYLE reference affects rendering mood/color/detail, but must NEVER override FONT SKETCH letterform structure.
- Composition reference only guides overall placement.
- Reject generations that drift away from FONT SKETCH skeleton when font sketch is provided.
- FONT similarity priority mode: ${strictFontSimilarityMode ? "ON (STRICT)" : "OFF"}

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

const buildFinalImagePrompt = (
  strategy: LogoStrategy,
  userPrompt: string,
  variationHint: string,
  hasFontSketch: boolean,
  fontSketchProfile: FontSketchProfile | null
) => `
Create a high-quality logo on pure white background.

[Creative Direction Decided by Planner]
- Core concept: ${strategy.coreConcept}
- Visual style: ${strategy.visualStyle}
- Composition: ${strategy.compositionPlan}
- Color plan: ${strategy.colorPlan}
- Constraints: ${strategy.constraints.join("; ")}

[Original User Prompt]
${userPrompt || "(empty)"}

[Variation]
${variationHint || "(none)"}

[Critical Legibility Requirement]
- Keep every Korean syllable readable exactly as intended text.
- If text includes "돈", it must be unmistakably readable as "돈" (not "톤", "론", etc.).

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
- If the prompt includes Korean naming text, keep Korean text exactly as the primary lettering.
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

const buildPlannerInput = (
  userPrompt: string,
  config: DesignConfig,
  variationHint: string,
  styleRefImage: string | null,
  compositionRefImage: string | null,
  fontSketchImage: string | null,
  fontSketchProfile: FontSketchProfile | null
) => {
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
            userPrompt,
            config,
            variationHint,
            Boolean(styleRefImage),
            Boolean(compositionRefImage),
            Boolean(fontSketchImage),
            fontSketchProfile
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

  return plannerInput;
};

/** 배치 생성 시 1회만 호출 — 플래너를 공유해 변형 수만큼 반복하지 않음 */
export const prepareLogoGenerationContext = async (
  userPrompt: string,
  config: DesignConfig,
  compositionRefImage: string | null,
  fontSketchImage: string | null,
  styleRefImage: string | null
): Promise<LogoGenerationContext> => {
  const client = getClient();
  const strategy = await createPlannerStrategy(
    client,
    buildPlannerInput(
      userPrompt,
      config,
      "Plan one strong logo direction; per-variation color and decoration differences come later.",
      styleRefImage,
      compositionRefImage,
      fontSketchImage,
      null
    )
  );
  return { strategy, fontSketchProfile: null };
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
  const model = primaryImageModel;

  // gpt-image 계열: images.generate
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
      size,
    } as any);

    const withSizeImage = extractGeneratedImage(withSize);
    if (withSizeImage) return await normalizeImageResult(withSizeImage);
    throw new Error(`No image returned from model '${model}'.`);
  } catch (err) {
    throw new Error(`Image generation failed (model='${model}'): ${formatOpenAiError(err)}`);
  }
};

export const generateLogoConcept = async (
  userPrompt: string,
  config: DesignConfig,
  variationHint: string,
  styleRefImage: string | null,
  compositionRefImage: string | null,
  fontSketchImage: string | null,
  sharedContext?: LogoGenerationContext
): Promise<string> => {
  const client = getClient();

  const strategy =
    sharedContext?.strategy ??
    (await createPlannerStrategy(
      client,
      buildPlannerInput(
        userPrompt,
        config,
        variationHint,
        styleRefImage,
        compositionRefImage,
        fontSketchImage,
        null
      )
    ));

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
            userPrompt,
            variationHint,
            Boolean(fontSketchImage),
            null
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
      model: primaryImageModel,
      image: imageFile,
      mask: maskFile,
      prompt: `${editPrompt}\n\nKeep all unmasked areas unchanged and preserve original style consistency.`,
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
      model: primaryImageModel,
      image: imageFile,
      mask: maskFile,
      prompt: `${editPrompt}\n\nKeep all unmasked areas unchanged and preserve original style consistency.`,
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
