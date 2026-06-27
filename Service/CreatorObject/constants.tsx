
import { StyleConfig } from './types';
import modernStylePreview from './image/modern.png';

export const STYLES: StyleConfig[] = [
  {
    id: 'knitted',
    name: '패브릭토이',
    image: '/image/febric.png',
    promptSuffix: 'an adorable handcrafted amigurumi dog toy made of thick cream-colored knitted wool yarn, visible crochet stitches and interlacing yarn loops, realistic wool fiber texture, chunky miniature toy silhouette, isolated on a solid pure white background, studio lighting',
    isActive: true
  },
  {
    id: 'glass',
    name: '유리&홀로그램',
    image: '/image/glass.png',
    promptSuffix: 'sculpted from a single piece of high-gloss liquid glass and translucent crystal. Featuring hyper-smooth organic liquid curves, high-refraction indices, and elegant light caustics. Primarily TRANSPARENT and CLEAR amethyst-tinted glass.',
    isActive: true
  },
  {
    id: 'clay-3d',
    name: '3D 클레이',
    image: '/image/3dclay.png',
    promptSuffix: 'a handcrafted chunky toy clay sculpture, stop-motion claymation style, visible fingerprints and adorable dough textures, matte vibrant plasticine material. OPAQUE and MATTE.',
    isActive: true
  },
  {
    id: 'modern-3d',
    name: '모던 3D',
    image: modernStylePreview,
    promptSuffix: 'a high-quality 3D isometric icon render, modern UI style with soft-touch matte plastic material, extreme chamfered edges and rounded silhouettes, vibrant and playful colors, clean studio lighting with soft ambient occlusion, isolated on a solid pure white background, minimal and simplified geometry.',
    isActive: true
  },
  {
    id: 'simple-line',
    name: '업데이트 예정',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23ccc"%3E...%3C/text%3E%3C/svg%3E',
    promptSuffix: '',
    isActive: false
  },
  {
    id: 'paper-art',
    name: '업데이트 예정',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23ccc"%3E...%3C/text%3E%3C/svg%3E',
    promptSuffix: '',
    isActive: false
  }
];
