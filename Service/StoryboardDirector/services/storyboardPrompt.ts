export function buildStoryboardGeneratePrompt(
  prompt: string,
  references: { color: string; type: string }[],
): string {
  const referenceContext = references
    .map(
      (ref) =>
        `The area marked with ${ref.color} in the mask corresponds to ${ref.type}. Refer to the provided reference image for this object's design and identity.`,
    )
    .join('\n');

  let descriptionText = prompt;
  let styleGuideText = '';
  if (prompt.includes('\n\nStyle Guide: ')) {
    const parts = prompt.split('\n\nStyle Guide: ');
    descriptionText = parts[0];
    styleGuideText = parts[1];
  }

  let styleInstructions = '';
  if (styleGuideText) {
    const lowerStyle = styleGuideText.toLowerCase();
    if (lowerStyle.includes('cinematic film style') || lowerStyle.includes('photorealistic')) {
      styleInstructions = `
      CRITICAL STYLE DIRECTIVE (MUST BE REAL-LIFE PHOTOGRAPHY):
      - You MUST render this output image as a live-action, real-life photorealistic movie still (실사 사진).
      - Use real-life photography aesthetics: 8k resolution, highly detailed skin textures, realistic clothing/material folds, physical glass lens optics, and shot on a 35mm cinematic camera lens.
      - Use professional cinematic lighting: high dynamic range (HDR), shallow depth of field (blurred background bokeh), professional color grading, realistic and dramatic cinematic shadows and lights.
      - ABSOLUTE PROHIBITION: Do NOT generate an illustration, digital art, cartoon, anime, 3D CGI render, drawing, sketch, oil painting, watercolor, or graphic design. It must look 100% like a real-life physical photo (실사).
      `;
    } else {
      styleInstructions = `
      STYLE DIRECTIVE:
      - You MUST render this output image strictly in the following style: ${styleGuideText}
      - Ensure all textures, lighting, shading, artistic strokes, and rendering medium strictly match this specified aesthetic.
      `;
    }
  }

  return `
    TASK: Transform this storyboard sketch and color mask into a high-quality finished image.
    ${styleInstructions || 'STYLE: Professional high-fidelity render.'}
    
    LOCATE: Maintain the composition, framing, and perspective of the original sketch.
    ASSIGN: 
    ${referenceContext}
    
    STORY & SCENE CONTEXT: 
    ${descriptionText}
    
    The output should be a single high-fidelity image that strictly follows these layout, design, and style constraints.
  `;
}
