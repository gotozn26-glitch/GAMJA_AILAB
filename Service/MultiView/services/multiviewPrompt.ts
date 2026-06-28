import type { Rotation } from '../types';

export function getCameraDirectives(rotation: Rotation): string {
  const { x: pitch, y: yaw } = rotation;
  const directives = [
    'RED FRAME (FRONT): This is the anchor representing the original FRONT direction.',
  ];

  if (pitch > 0) {
    directives.push(
      'TOP-DOWN VIEW (Pitch is positive): The camera is positioned high, looking down. Show the TOP surface (head, back, top shell) of the object clearly.',
    );
  } else if (pitch < 0) {
    directives.push(
      'BOTTOM-UP VIEW (Pitch is negative / LOW-ANGLE): The camera is positioned underneath the object, looking up. The object MUST be tilted or floating in mid-air to fully expose its BOTTOM surface (sole of feet, underbelly, bottom plate) to the camera. It must NOT be resting flatly on a ground floor that covers the bottom. Show the underside of the object clearly.',
    );
  }

  if (yaw > 0) {
    directives.push(
      "YAW IS POSITIVE (Yaw > 0): The camera has moved to the right. The object's eyes/face must point towards the LEFT side of the image. Consequently, the object's RIGHT side profile (right cheek, right side of body, right arm/leg) must face the camera.",
    );
  } else if (yaw < 0) {
    directives.push(
      "YAW IS NEGATIVE (Yaw < 0): The camera has moved to the left. The object's eyes/face must point towards the RIGHT side of the image. Consequently, the object's LEFT side profile (left cheek, left side of body, left arm/leg) must face the camera.",
    );
  }

  return directives.join('\n- ');
}

export function buildMultiviewPerspectivePrompt(rotation: Rotation, hasExtraReference = false): string {
  const cameraDirectives = getCameraDirectives(rotation);

  return `
[SYSTEM: 3D SPATIAL VECTORING ENGINE]

### 1. ABSOLUTE ROTATION AND ORIENTATION MECHANICS
You must translate the 3D rotation parameters into the precise 2D rendered orientation of the object. Look at the guide wireframe cube (the last image) and apply these physical laws:

- **Y-Spin (Yaw) is POSITIVE (+${rotation.y}°)**:
  - **Object's Facing Direction**: The object must look/face towards the **LEFT side of the final image**.
  - **Visible Flank**: The camera captures the object's **actual RIGHT side/profile** (right cheek, right side of body).
  - **ERROR TO AVOID**: Do NOT make the object face the right side! Do NOT show the left profile!

- **Y-Spin (Yaw) is NEGATIVE (-${Math.abs(rotation.y)}°)**:
  - **Object's Facing Direction**: The object must look/face towards the **RIGHT side of the final image**.
  - **Visible Flank**: The camera captures the object's **actual LEFT side/profile** (left cheek, left side of body).
  - **ERROR TO AVOID**: Do NOT make the object face the left side! Do NOT show the right profile!

- **X-Tilt (Pitch) is POSITIVE (+${rotation.x}°)**:
  - High angle camera. The top of the object (top of the head, back, upper surfaces) must be highly visible and angled downwards towards the viewer.

- **X-Tilt (Pitch) is NEGATIVE (-${Math.abs(rotation.x)}°)**:
  - Low angle camera view. The camera is underneath looking up.
  - **CRITICAL**: Do NOT place the object flatly on a ground plane or floor. It must be floating, elevated, or tilted backwards/upwards in mid-air so that its **BOTTOM surface** (underbelly, soles of feet, belly, bottom plate) is fully exposed to the camera and highly visible to the viewer.
  - Any ground shadows or reflections must be cast way below the floating object, leaving its underside clearly visible on the white background.

### 2. IDENTITY AND DETAIL SEEDING (IMAGE INPUTS)
- **IMAGE 1** is the true **FRONT VIEW** identity of the object.
${hasExtraReference ? '- **IMAGE 2** is the **ORIGINAL UPLOADED IMAGE** showing the object from a specific perspective. Use this image as a secondary detail source! Use its high-frequency details, textures, and unseen parts (like side profiles, backside, or colors) to make the rotated 3D view highly realistic and structurally accurate.' : ''}
- The last image is the Guide Cube Wireframe. It serves as a spatial transform guide. Match the orientation of the Red Frame (FRONT face) and the adjacent faces labeled "LEFT", "RIGHT", "TOP", "BOTTOM".

### 3. RENDERING STYLE
- Render the result on a pure white (#FFFFFF) background.
- NO cube wireframe lines, NO text labels, NO UI overlay.
- Maintain the high-quality 3D asset/toy style, textures, lighting, and colors of the source object perfectly.

### 4. SUMMARY SPECIFICATIONS
- ${cameraDirectives}
`;
}

export function buildFrontViewPrompt(objectName: string): string {
  return `
[SYSTEM: 3D FRONT-VIEW GENERATION ENGINE]
- **SOURCE IDENTITY**: The provided image contains an object described as "${objectName}".
- **TASK**: The provided image shows a non-front view (e.g., side, back, or top) of this object. You MUST generate a new high-quality 3D asset style FRONT-VIEW image of this exact same object, facing the camera directly.
- **STYLE AND STYLE ATTRIBUTES**: Maintain the exact same colors, textures, style, and identity of the object in the source image.
- **OUTPUT**: Render the true front view of the object on a pure white (#FFFFFF) background. No UI, no labels, no other objects.
`;
}
