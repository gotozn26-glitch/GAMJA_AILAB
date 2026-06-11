import type { SourceVisualStyle } from './source-style';

const BASE_PROMPT = `You are an image upscaling specialist. Upscale very small or low-resolution images into the best possible high-resolution result while restoring the original as faithfully as possible. Preserve the original colors, shapes, proportions, and overall appearance as closely as possible. Do not redesign, reinterpret, restyle, or add unnecessary new details. Output on a pure white (#FFFFFF) background. Increase resolution only — do not redraw in a different art style.

Text and logo fidelity:
- Preserve narrow gaps and counters between strokes and letter parts (e.g. Hangul ㅐ, ㅔ middle openings).
- Do not bridge or thicken thin spaces that are background in the source.`;

const STYLE_BLOCKS: Record<SourceVisualStyle, string> = {
  flat_2d: `Detected source style: FLAT 2D illustration.
- Keep flat color fills flat. Match the source's exact level of flatness.
- Do not add drop shadows, bevels, embossing, specular highlights, or glossy 3D rendering.
- Preserve only the shading that already exists — same intensity, not stronger.`,

  soft_3d: `Detected source style: SOFT 3D icon / logo / UI asset.
- Preserve bevels, metallic gradients, soft embossing, and gentle drop shadows exactly as in the source.
- Do NOT flatten into flat 2D color blocks. Keep the same dimensional feel as the original.
- Do not add extra gloss, liquid-metal shine, or deeper 3D than the source.`,

  photo: `Detected source style: PHOTOGRAPH.
- Preserve natural photographic texture, lighting, and color transitions.
- Do not cartoonify, flatten, or turn into illustration.
- Keep realistic detail and noise character faithful to the source.`,

  pixel_art: `Detected source style: PIXEL ART / tiny icon.
- Preserve crisp edges and the limited-palette character of the source.
- Do not blur into soft illustration. Keep shapes sharp and readable.`,
};

const GEMINI_UI_BLOCK = `UI fidelity (when present in the source):
- Preserve concentric circles and cursor ripples exactly — do not warp them.`;

export const buildUpscalePrompt = (style: SourceVisualStyle = 'flat_2d'): string =>
  `${BASE_PROMPT}\n\n${STYLE_BLOCKS[style]}`;

export const buildOpenAiUpscalePrompt = (style: SourceVisualStyle = 'flat_2d'): string =>
  buildUpscalePrompt(style);

export const buildGeminiUpscalePrompt = (style: SourceVisualStyle = 'flat_2d'): string =>
  `${buildUpscalePrompt(style)}\n\n${GEMINI_UI_BLOCK}`;

export const SHARED_UPSCALE_PROMPT_HASH = 'upscale-v32-style-aware';
