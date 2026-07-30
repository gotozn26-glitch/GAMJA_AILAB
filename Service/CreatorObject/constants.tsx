import { StyleConfig } from './types';
import modernStylePreview from './image/modern.png';

export const STYLES: StyleConfig[] = [
  {
    id: 'knitted',
    name: '패브릭토이',
    image: '/image/febric.png',
    promptSuffix:
      'an adorable handcrafted amigurumi yarn toy made of high-lightness bright pastel-toned knitted wool yarns (incorporating the iconic colors of the object if applicable, using 1 to 2 main harmonious pastel shades, avoiding plain all-white yarn and chaotic rainbow patterns), detailed visible crochet stitches and interlacing yarn loops, realistic cozy fabric wool fiber texture, chunky miniature toy silhouette, isolated on a solid pure white background, studio lighting',
    isActive: true,
  },
  {
    id: 'glass',
    name: '유리&홀로그램',
    image: '/image/glass.png',
    promptSuffix:
      'sculpted from high-gloss transparent clear glass and crystal with a shimmering iridescent rainbow hologram sheen, subtly infused with 1 elegant soft pastel color tint (such as pastel blue, pink, or mint). Highly translucent and clear with realistic rainbow light dispersion and caustics, isolated on a solid pure white background.',
    isActive: true,
  },
  {
    id: 'clay-3d',
    name: '3D 클레이',
    image: '/image/3dclay.png',
    promptSuffix:
      'a handcrafted chunky toy clay sculpture made of soft high-lightness bright pastel-toned modeling dough (reflecting the object iconic colors in soft pastel hues if applicable), authentic stop-motion claymation style with visible organic handmade thumbprints and clay seam details, warm tactile plasticine dough material with soft studio lighting.',
    isActive: true,
  },
  {
    id: 'modern-3d',
    name: '모던 3D',
    image: modernStylePreview,
    promptSuffix:
      'a sleek digital 3D asset render (Figma/Blender style), smooth plastic material with a soft satin sheen and subtle glossy highlights, precision chamfered bevel edges, crisp flawless geometry without any handmade flaws, high-lightness bright pastel color palette using 1-2 primary accent colors (incorporating the object signature iconic colors in bright pastel tones), soft ambient occlusion studio lighting.',
    isActive: true,
  },
  {
    id: 'simple-line',
    name: '업데이트 예정',
    image:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23ccc"%3E...%3C/text%3E%3C/svg%3E',
    promptSuffix: '',
    isActive: false,
  },
  {
    id: 'paper-art',
    name: '업데이트 예정',
    image:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23ccc"%3E...%3C/text%3E%3C/svg%3E',
    promptSuffix: '',
    isActive: false,
  },
];
