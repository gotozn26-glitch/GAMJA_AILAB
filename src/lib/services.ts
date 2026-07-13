export type ServiceId =
  | 'object-creator'
  | 'object-rotator'
  | 'upscaler'
  | 'logo-maker'
  | 'chair-swap'
  | 'bongjoonho'
  | 'scene-creator';

export type ServiceDef = {
  id: ServiceId;
  label: string;
  route: string;
  /** main 화면용 라벨 이미지 */
  mainLabelSrc: string;
  /** 사이드 토글 메뉴용 라벨 이미지 */
  menuLabelSrc: string;
  /** filled | outline — 피그마 버튼 스타일 */
  style: 'filled' | 'outline';
  /** 그라데이션 계열 */
  tone: 'violet' | 'violet-blue' | 'mint' | 'mint-reverse';
};

export const SERVICES: ServiceDef[] = [
  {
    id: 'object-creator',
    label: 'OBJECT CREATOR',
    route: '/service/creator-object',
    mainLabelSrc: '/renewal/main/001-OBJECT-CREATOR.svg',
    menuLabelSrc: '/renewal/menu/001-OBJECT-CREATOR.svg',
    style: 'filled',
    tone: 'violet',
  },
  {
    id: 'object-rotator',
    label: 'OBJECT ROTATOR',
    route: '/service/multiview',
    mainLabelSrc: '/renewal/main/002-OBJECT-ROTATOR.svg',
    menuLabelSrc: '/renewal/menu/002-OBJECT-ROTATOR.svg',
    style: 'outline',
    tone: 'violet',
  },
  {
    id: 'upscaler',
    label: 'UP-SCALER',
    route: '/service/upscaler',
    mainLabelSrc: '/renewal/main/003-UP-SCALER.svg',
    menuLabelSrc: '/renewal/menu/003-UP-SCALER.svg',
    style: 'filled',
    tone: 'violet-blue',
  },
  {
    id: 'logo-maker',
    label: 'LOGO MAKER',
    route: '/service/logo-maker',
    mainLabelSrc: '/renewal/main/004-LOGO-MAKER.svg',
    menuLabelSrc: '/renewal/menu/004-LOGO-MAKER.svg',
    style: 'filled',
    tone: 'mint',
  },
  {
    id: 'chair-swap',
    label: '의자뺏기',
    route: '/service/chair-swap',
    mainLabelSrc: '/renewal/main/005-asset.svg',
    menuLabelSrc: '/renewal/menu/005-asset.svg',
    style: 'outline',
    tone: 'mint',
  },
  {
    id: 'bongjoonho',
    label: '봉준호',
    route: '/service/bongjoonho',
    mainLabelSrc: '/renewal/main/006-asset.svg',
    menuLabelSrc: '/renewal/menu/006-asset.svg',
    style: 'outline',
    tone: 'mint',
  },
  {
    id: 'scene-creator',
    label: 'SCENE CREATOR',
    route: '/service/storyboard-director',
    mainLabelSrc: '/renewal/main/007-SCENE-CREATOR.svg',
    menuLabelSrc: '/renewal/menu/007-SCENE-CREATOR.svg',
    style: 'outline',
    tone: 'mint',
  },
];

export const TONE_GRADIENT: Record<ServiceDef['tone'], string> = {
  violet: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)',
  'violet-blue':
    'linear-gradient(180deg, #ad89f5 0%, #93b7eb 56%, #becffa 100%)',
  mint: 'linear-gradient(180deg, #a4ffdc 0%, #7cc6ff 100%)',
  'mint-reverse': 'linear-gradient(180deg, #7cc6ff 0%, #a4ffdc 100%)',
};

export function serviceIdFromPath(pathname: string): ServiceId | null {
  const found = SERVICES.find(
    (service) =>
      pathname === service.route || pathname.startsWith(`${service.route}/`),
  );
  return found?.id ?? null;
}
