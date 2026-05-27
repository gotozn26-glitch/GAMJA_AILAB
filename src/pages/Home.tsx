import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';

const ASSET_BASE = '/page1/image';
const POPUP_ASSET_BASE = '/page-pop/image';
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 4173;
const CONTENT_LEFT = 239;
const CONTENT_WIDTH = 1443;
const POPUP_WIDTH = 1562;
const POPUP_HEIGHT = 997;
const LABCORD_BOARD_URL =
  'https://www.notion.so/ae0d2817213d40869b39de9a057e9cde?v=d13740fc81a24bfd99964d449ce40812&source=copy_link';
const TOOL_SUPPORTER_BOARD_URL =
  'https://www.notion.so/396c62263bcd4bf2a49127c95a487941?v=4d4247af80ab44a28b6fd00c50911d21&source=copy_link';
const LABCORD_TITLE_LIMIT = 46;
const TOOL_SUPPORTER_TITLE_LIMIT = 28;
const TOOL_SUPPORTER_CATEGORY_COLORS: Record<string, string> = {
  Figma: '#b58aff',
  'After Effect': '#00aff7',
  Photoshop: '#00d46b',
  Illustrator: '#ff5c08',
  Office: '#ff001e',
  Etc: '#ffffff',
};
const YELLOW_SECTION_TOP = 1516;
const YELLOW_SECTION_HEIGHT = 1008;
const BOTTOM_SKY_TOP = 2860;
const BOTTOM_SKY_HEIGHT = 1261;
const BOTTOM_SKY_FADE_HEIGHT = 620;
const FOOTER_BAR_TOP = 3962;
const FOOTER_BAR_HEIGHT = 257;
const FOOTER_BORDER_HEIGHT = 3;
const TITLE_BG_WIDTH = 1757;
const TITLE_BG_HEIGHT = 750;
const TITLE_BG_TOP = 134;
const HOME_LAYOUT_SCALE = 0.75;

type PopupPreviewLayer =
  | {
      kind: 'image';
      src: string;
      style: CSSProperties;
    }
  | {
      kind: 'text';
      text: string;
      style: CSSProperties;
    };

type PopupKey =
  | 'rotation'
  | 'object-creator'
  | 'logo-maker'
  | 'chair-swap'
  | 'bongjoonho'
  | 'scene-creator';

type PopupConfig = {
  key: PopupKey;
  title: string;
  route: string;
  mask: string;
  preview?: string;
  previewStyle?: CSSProperties;
  previewLayers?: PopupPreviewLayer[];
  titleLeft: number;
  description: string;
  buttonBackground: string;
  buttonIcon: string;
  buttonIconStyle: CSSProperties;
};

type LabcordPost = {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  url: string;
};

type ToolSupporterPost = {
  id: string;
  title: string;
  tool: string;
  description: string;
  url: string;
};

type AsyncStatus = 'loading' | 'ready' | 'error';

const popupConfigs: Record<PopupKey, PopupConfig> = {
  rotation: {
    key: 'rotation',
    title: 'Rotation',
    route: '/service/multiview',
    mask: '002-Mask-group.svg',
    preview: '004-icon_rotaiton.png',
    previewStyle: abs(206, 142, 274, 235),
    titleLeft: 640,
    description: `2D 이미지나 캐릭터를 원하는 각도로 회전시켜 입체적인 오브젝트로 생성해주는 도구입니다.
평면 이미지를 업로드한 뒤 3D 투영 좌표를 설정하면,
원하는 앵글과 정밀한 각도(하이 앵글, 반측면 등)가 반영된 입체적인 결과물을 빠르게 얻을 수 있습니다.
초기 기획 단계에서 캐릭터나 제품의 다각도 뷰를 검토하거나,
3D 모델링 전 에셋의 볼륨감을 미리 시각화할 때 유용합니다.
복잡한 3D 그래픽 툴이 없어도 평면 이미지를 입체감 있는 비주얼로 간편하게 전환할 수 있습니다.`,
    buttonBackground: '005-2.svg',
    buttonIcon: '007-2.png',
    buttonIconStyle: abs(32, 15, 29, 40),
  },
  'object-creator': {
    key: 'object-creator',
    title: 'Object Creator',
    route: '/service/creator-object',
    mask: '009-Mask-group.svg',
    preview: '010-icon_object.png',
    previewStyle: abs(238, 141, 211, 228),
    titleLeft: 640,
    description: `특정 텍스처와 스타일로 오브젝트를 빠르게 생성해주는 도구입니다.
원하는 키워드를 입력하거나 레퍼런스 이미지를 업로드한 뒤,
제공되는 스타일 프리셋(패브릭 토이, 유리&홀로그램, 3D 클레이 등)을 선택해 즉시 생성할 수 있습니다.
번거로운 텍스처링이나 복잡한 렌더링 세팅 과정 없이도 클릭 몇 번만으로
완성도 높은 스타일의 비주얼을 구현합니다.`,
    buttonBackground: '011-2.svg',
    buttonIcon: '007-2.png',
    buttonIconStyle: abs(32, 15, 29, 40),
  },
  'logo-maker': {
    key: 'logo-maker',
    title: '로고작업실',
    route: '/service/logo-maker',
    mask: '018-Mask-group.svg',
    preview: '019-logo-variation-01.png',
    previewStyle: abs(199, 115, 299, 299),
    titleLeft: 639,
    description: `브랜드나 서비스에 맞는 로고 시안을 빠르게 만들어볼 수 있는 로고작업실입니다.
원하는 키워드와 분위기를 프롬프트에 입력하면 다양한 방향의 로고 아이디어를 확인할 수 있습니다.
초기 기획 단계에서 로고 콘셉트를 잡거나 시안을 비교할 때 유용합니다.
복잡한 디자인 툴 없이도 간단하게 브랜드 이미지를 시각화할 수 있습니다.
로고 제작 전 아이디어를 넓히고 방향성을 정리하는 데 도움을 주는 도구입니다.`,
    buttonBackground: '020-2.svg',
    buttonIcon: '015-8.png',
    buttonIconStyle: abs(32, 16, 28, 38),
  },
  'chair-swap': {
    key: 'chair-swap',
    title: '의자뺏기',
    route: '/service/chair-swap',
    mask: '022-Mask-group.svg',
    previewLayers: [
      { kind: 'image', src: '023-4.svg', style: abs(168, 208, 376, 97) },
      { kind: 'image', src: '024-2.svg', style: abs(211, 199, 17, 104) },
      { kind: 'image', src: '025-2.svg', style: abs(485, 199, 17, 104) },
      {
        kind: 'image',
        src: '026-3.svg',
        style: { ...abs(219, 216, 276, 83), opacity: 0.1 },
      },
      {
        kind: 'text',
        text: 'TEXT',
        style: {
          ...abs(241, 222, 240, 84),
          fontSize: 100,
          fontWeight: 500,
          lineHeight: 'normal',
          letterSpacing: '-2.5px',
          color: '#000',
        },
      },
    ],
    titleLeft: 639,
    description: `의자뺏기는 텍스트 검수 및 카피라이팅에 특화된 웹앱입니다.
가이드라인 위반 단어나 과도하게 긴 단어를 식별하여 유의어 및 축약어로 자동 교체해 줍니다.
또한, 사용자가 이미지를 삽입하고 필수 키워드와 톤앤매너를 지정하면,
설정한 글자 수에 맞춰 최적화된 마케팅 카피를 자동으로 생성하는 기능을 제공합니다.`,
    buttonBackground: '027-2.svg',
    buttonIcon: '028-7.png',
    buttonIconStyle: abs(27, 15, 35, 40),
  },
  bongjoonho: {
    key: 'bongjoonho',
    title: '봉준호',
    route: '/service/bongjoonho',
    mask: '030-Mask-group.svg',
    previewLayers: [
      { kind: 'image', src: '031-icon_bong.png', style: abs(239, 151, 130, 242) },
      { kind: 'image', src: '032-asset.png', style: abs(333, 213, 140, 131) },
    ],
    titleLeft: 639,
    description: `봉준호는 이미지 생성 및 영상 연출 프롬프트 작성 시 정확한 시각적 구도를 설정하도록 돕는 웹앱입니다.
사용자가 프롬프트를 작성할 때 혼동하기 쉬운
카메라 각도(Angle)와 프레임(Frame) 종류를 명확하게 안내합니다.
이를 통해 의도한 연출 방향에 맞는 정확한 구도와 뷰를 프롬프트에 반영할 수 있도록 지원합니다.`,
    buttonBackground: '033-2.svg',
    buttonIcon: '028-7.png',
    buttonIconStyle: abs(27, 15, 35, 40),
  },
  'scene-creator': {
    key: 'scene-creator',
    title: 'Scene Creator',
    route: '/service/storyboard-director',
    mask: '035-Mask-group.svg',
    preview: '036-icon_sb.png',
    previewStyle: abs(222, 124, 241, 270),
    titleLeft: 640,
    description: `스케치 콘티를 기반으로 콘셉트에 맞는 완성도 높은 장면 이미지를 빠르게 생성해주는 도구입니다.
준비된 스케치를 업로드하고 원하는 씬 스타일을 선택하면, 원본의 레이아웃과 구도를 그대로 유지한 채
감각적인 비주얼로 시각화합니다.
특히 콘티 내 특정 오브젝트를 지정해 별도의 레퍼런스를 첨부할 수 있어, 주요 에셋의 디테일과 재질을
더욱 정확하고 정교하게 표현할 수 있습니다.
복잡한 드로잉이나 채색 작업 없이도 초기 아이디어 단계에서 완성도 높은 장면을 만들어 냅니다.`,
    buttonBackground: '037-2.svg',
    buttonIcon: '007-2.png',
    buttonIconStyle: abs(32, 15, 29, 40),
  },
};

const supporterCardLayouts = [
  { bg: '005-6.svg', chip: '006-7.svg', x: 243, y: 3310 },
  { bg: '008-6.svg', chip: '009-7.svg', x: 714, y: 3309 },
  { bg: '010-6.svg', chip: '009-7.svg', x: 1186, y: 3307 },
  { bg: '011-6.svg', chip: '006-7.svg', x: 243, y: 3512 },
  { bg: '012-6.svg', chip: '009-7.svg', x: 714, y: 3514 },
  { bg: '013-6.svg', chip: '009-7.svg', x: 1186, y: 3512, dark: true },
];

function abs(left: number, top: number, width: number, height: number): CSSProperties {
  return { position: 'absolute', left, top, width, height };
}

function DecoImage({
  src,
  alt = '',
  style,
  className = '',
}: {
  src: string;
  alt?: string;
  style: CSSProperties;
  className?: string;
}) {
  return <img src={src} alt={alt} style={style} className={className} draggable={false} />;
}

function DecoVideo({
  src,
  style,
  className = '',
  poster,
}: {
  src: string;
  style: CSSProperties;
  className?: string;
  poster?: string;
}) {
  return (
    <video
      src={src}
      style={style}
      className={className}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    />
  );
}

function truncateText(value: string, limit: number): string {
  const chars = Array.from(value);
  if (chars.length <= limit) {
    return value;
  }

  return `${chars.slice(0, Math.max(limit - 3, 0)).join('')}...`;
}

function formatLabcordTitle(title: string, author: string, limit: number): string {
  if (!author) {
    return truncateText(title, limit);
  }

  const authorSuffix = ` - ${author}`;
  const availableTitleLimit = Math.max(limit - Array.from(authorSuffix).length, 4);

  return `${truncateText(title, availableTitleLimit)}${authorSuffix}`;
}

function normalizeToolSupporterCategory(value: string): keyof typeof TOOL_SUPPORTER_CATEGORY_COLORS {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'figma') {
    return 'Figma';
  }
  if (normalized === 'after effect') {
    return 'After Effect';
  }
  if (normalized === 'photoshop') {
    return 'Photoshop';
  }
  if (normalized === 'illustrator') {
    return 'Illustrator';
  }
  if (normalized === 'office') {
    return 'Office';
  }

  return 'Etc';
}

function NavOverlay({
  label,
  left,
  top,
  width,
  height,
  onClick,
}: {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{ ...abs(left, top, width, height), background: 'transparent' }}
      className="z-20 cursor-pointer"
    />
  );
}

function TextSwapIllustration() {
  return (
    <div style={abs(769, 1466, 376, 120)} className="pointer-events-none">
      <DecoImage src={`${ASSET_BASE}/030-3.svg`} style={abs(0, 35, 374, 4)} />
      <DecoImage src={`${ASSET_BASE}/031-3-3.svg`} style={abs(1, 59, 375, 4)} />
      <DecoImage src={`${ASSET_BASE}/031-3-3.svg`} style={abs(1, 12, 375, 4)} />
      <DecoImage src={`${ASSET_BASE}/031-3-3.svg`} style={abs(1, 105, 375, 4)} />
      <DecoImage src={`${ASSET_BASE}/030-3.svg`} style={abs(0, 82, 374, 4)} />
      <DecoImage src={`${ASSET_BASE}/032-3.svg`} style={abs(49, 13, 279, 91)} />
      <DecoImage src={`${ASSET_BASE}/033-2.svg`} style={abs(40, 3, 17, 17)} />
      <DecoImage src={`${ASSET_BASE}/034-2.svg`} style={abs(328, 12, 6, 91)} />
      <DecoImage src={`${ASSET_BASE}/034-2.svg`} style={abs(49, 15, 6, 91)} />
      <DecoImage src={`${ASSET_BASE}/035-2.svg`} style={abs(319, 103, 17, 17)} />
      <div className="absolute left-[73px] top-0 text-[100px] leading-none tracking-[-2.5px] text-black">
        TEXT
      </div>
    </div>
  );
}

function SupporterCard({
  bg,
  chip,
  x,
  y,
  dark,
  post,
}: {
  bg: string;
  chip: string;
  x: number;
  y: number;
  dark?: boolean;
  post: ToolSupporterPost;
}) {
  const category = normalizeToolSupporterCategory(post.tool || 'Etc');
  const accent = TOOL_SUPPORTER_CATEGORY_COLORS[category];
  const toolLabel = truncateText(category, 16);
  const title = truncateText(post.title || post.description || 'Tool Supporter', TOOL_SUPPORTER_TITLE_LIMIT);
  const showDarkBadge = dark || category === 'Etc';

  return (
    <>
      <DecoImage src={`${ASSET_BASE}/${bg}`} style={abs(x, y, 455, 190)} />
      <DecoImage src={`${ASSET_BASE}/${chip}`} style={abs(x + 28, y - 6, 221, 65)} />
      <div
        style={{
          ...abs(x + 28, y - 7, 221, 65),
          color: accent,
          textAlign: 'center',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.55px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {toolLabel}
      </div>
      <div
        style={{
          ...abs(x + 53, y + 77, 258, 62),
          color: '#000',
          textAlign: 'center',
          fontSize: 22,
          fontWeight: 700,
          lineHeight: '130%',
          letterSpacing: '-0.46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {title}
      </div>
      <DecoImage src={`${ASSET_BASE}/007-Group-2.svg`} style={abs(x + 353, y + 72, 72, 71)} />
      {showDarkBadge ? (
        <div style={{ ...abs(x + 28, y - 7, 221, 65), background: '#000', opacity: 0.05, borderRadius: 999 }} />
      ) : null}
      <button
        type="button"
        aria-label={`${post.title} 노션 게시물 열기`}
        onClick={() => window.open(post.url, '_blank', 'noopener,noreferrer')}
        style={{ ...abs(x, y - 7, 455, 197), background: 'transparent' }}
        className="z-20 cursor-pointer"
      />
    </>
  );
}

function PopupModal({
  popup,
  onClose,
  onStart,
}: {
  popup: PopupConfig;
  onClose: () => void;
  onStart: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const width = wrapperRef.current?.clientWidth || POPUP_WIDTH;
      setScale(Math.min(width / POPUP_WIDTH, 1));
    };

    updateScale();

    if (typeof ResizeObserver !== 'undefined' && wrapperRef.current) {
      const observer = new ResizeObserver(updateScale);
      observer.observe(wrapperRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-center justify-center p-4 md:p-6">
        <div
          ref={wrapperRef}
          style={{ width: 'min(92vw, 980px)', height: POPUP_HEIGHT * scale }}
          className="relative"
        >
          <div
            className="relative origin-top-left"
            style={{
              width: POPUP_WIDTH,
              height: POPUP_HEIGHT,
              transform: `scale(${scale})`,
            }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={popup.title}
          >
            <div
              className="absolute inset-0 overflow-hidden rounded-[30px] border-[3px] border-black bg-white"
              style={{
                boxShadow: '6px 8px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <DecoImage src={`${POPUP_ASSET_BASE}/${popup.mask}`} style={abs(0, 0, POPUP_WIDTH, POPUP_HEIGHT)} />
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ ...abs(1454, 37, 72, 72), background: 'transparent' }}
              className="cursor-pointer"
              aria-label="팝업 닫기"
            >
              <DecoImage src={`${POPUP_ASSET_BASE}/003-1.svg`} style={abs(0, 0, 72, 72)} />
            </button>

            {popup.preview && popup.previewStyle ? (
              <DecoImage src={`${POPUP_ASSET_BASE}/${popup.preview}`} style={popup.previewStyle} />
            ) : null}
            {popup.previewLayers?.map((layer, index) =>
              layer.kind === 'image' ? (
                <DecoImage
                  key={`${popup.key}-preview-image-${index}`}
                  src={`${POPUP_ASSET_BASE}/${layer.src}`}
                  style={layer.style}
                />
              ) : (
                <div
                  key={`${popup.key}-preview-text-${index}`}
                  style={layer.style}
                >
                  {layer.text}
                </div>
              ),
            )}

            <div
              style={{
                ...abs(popup.titleLeft, 120, 420, 38),
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-1.41px',
                lineHeight: 'normal',
                color: '#000',
              }}
            >
              {popup.title}
            </div>

            <div
              style={{
                ...abs(639, 187, 760, 305),
                fontSize: 20,
                fontWeight: 400,
                lineHeight: '160%',
                letterSpacing: '-0.88px',
                color: '#000',
                whiteSpace: 'pre-line',
              }}
            >
              {popup.description}
            </div>

            <button
              type="button"
              onClick={onStart}
              style={{ ...abs(1111, 405, 299, 72), background: 'transparent' }}
              className="cursor-pointer"
              aria-label={`${popup.title} 시작하기`}
            >
              <DecoImage src={`${POPUP_ASSET_BASE}/${popup.buttonBackground}`} style={abs(0, 0, 299, 72)} />
              <div
                style={{
                  ...abs(68, 25, 110, 25),
                  fontSize: 25,
                  fontWeight: 700,
                  letterSpacing: '-1.1px',
                  lineHeight: 'normal',
                  color: '#000',
                }}
              >
                시작하기
              </div>
              <DecoImage src={`${POPUP_ASSET_BASE}/006-6.svg`} style={abs(202, 28, 69, 19)} />
              <DecoImage src={`${POPUP_ASSET_BASE}/${popup.buttonIcon}`} style={popup.buttonIconStyle} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const scaleMeasureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(CONTENT_WIDTH);
  const [openPopup, setOpenPopup] = useState<PopupKey | null>(null);
  const [labcordPosts, setLabcordPosts] = useState<LabcordPost[]>([]);
  const [labcordStatus, setLabcordStatus] = useState<AsyncStatus>('loading');
  const [toolSupporterPosts, setToolSupporterPosts] = useState<ToolSupporterPost[]>([]);
  const [toolSupporterStatus, setToolSupporterStatus] = useState<AsyncStatus>('loading');
  const [aiLabBlur, setAiLabBlur] = useState(0);

  useEffect(() => {
    const updateScale = () => {
      const width = scaleMeasureRef.current?.clientWidth || CONTENT_WIDTH;
      setAvailableWidth(width);
      setScale(Math.min(width / CONTENT_WIDTH, 1) * HOME_LAYOUT_SCALE);
    };

    updateScale();

    if (typeof ResizeObserver !== 'undefined' && scaleMeasureRef.current) {
      const observer = new ResizeObserver(updateScale);
      observer.observe(scaleMeasureRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (!openPopup) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPopup(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPopup]);

  useEffect(() => {
    const controller = new AbortController();
    setLabcordStatus('loading');

    fetch("/api/labcord/posts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`LABcord fetch failed: ${response.status}`);
        }

        return response.json() as Promise<{ posts?: LabcordPost[] }>;
      })
      .then((data) => {
        const posts = Array.isArray(data.posts) ? data.posts : [];
        setLabcordPosts(posts);
        setLabcordStatus('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setLabcordPosts([]);
        setLabcordStatus('error');
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setToolSupporterStatus('loading');

    fetch('/api/tool-supporters', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Tool Supporter fetch failed: ${response.status}`);
        }

        return response.json() as Promise<{ posts?: ToolSupporterPost[] }>;
      })
      .then((data) => {
        const posts = Array.isArray(data.posts) ? data.posts : [];
        setToolSupporterPosts(posts);
        setToolSupporterStatus('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setToolSupporterPosts([]);
        setToolSupporterStatus('error');
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let blurTimeout: number | undefined;
    let resetTimeout: number | undefined;

    const schedulePulse = () => {
      const nextDelay =
        Math.random() < 0.5
          ? 1400 + Math.random() * 2200
          : 4200 + Math.random() * 5200;
      blurTimeout = window.setTimeout(() => {
        setAiLabBlur(20);
        resetTimeout = window.setTimeout(() => {
          setAiLabBlur(0);
          schedulePulse();
        }, 1800 + Math.random() * 900);
      }, nextDelay);
    };

    schedulePulse();

    return () => {
      if (blurTimeout) {
        window.clearTimeout(blurTimeout);
      }
      if (resetTimeout) {
        window.clearTimeout(resetTimeout);
      }
    };
  }, []);

  const currentPopup = openPopup ? popupConfigs[openPopup] : null;
  const scaledHeight = DESIGN_HEIGHT * scale;
  const canvasLeft = (availableWidth - CONTENT_WIDTH * scale) / 2 - CONTENT_LEFT * scale;
  const scaledRect = (left: number, top: number, width: number, height: number): CSSProperties => ({
    position: 'absolute',
    left: canvasLeft + left * scale,
    top: top * scale,
    width: width * scale,
    height: height * scale,
  });
  const centeredScaledRect = (top: number, width: number, height: number): CSSProperties => ({
    position: 'absolute',
    left: (availableWidth - width * scale) / 2,
    top: top * scale,
    width: width * scale,
    height: height * scale,
  });

  return (
    <div className="min-h-screen bg-white">
      <div
        ref={scaleMeasureRef}
        className="w-full"
      >
        <div
          className="relative w-full overflow-hidden bg-white"
          style={{ height: scaledHeight }}
        >
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{
              top: YELLOW_SECTION_TOP * scale,
              height: YELLOW_SECTION_HEIGHT * scale,
              background: '#FFF000',
            }}
          />
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{
              top: BOTTOM_SKY_TOP * scale,
              height: BOTTOM_SKY_HEIGHT * scale,
              backgroundImage: "url('/image/home-bottom-sky.png')",
              backgroundPosition: `center ${36 * scale}px`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
            }}
          />
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{
              top: BOTTOM_SKY_TOP * scale,
              height: BOTTOM_SKY_FADE_HEIGHT * scale,
              background:
                'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.99) 22%, rgba(255,255,255,0.94) 46%, rgba(255,255,255,0.72) 72%, rgba(255,255,255,0.38) 88%, rgba(255,255,255,0) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{
              top: FOOTER_BAR_TOP * scale,
              height: Math.max(FOOTER_BORDER_HEIGHT * scale, 2),
              background: '#272727',
            }}
          />
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{
              top: FOOTER_BAR_TOP * scale + Math.max(FOOTER_BORDER_HEIGHT * scale, 2),
              height: FOOTER_BAR_HEIGHT * scale,
              background: '#fff',
            }}
          />
          <DecoImage
            src="/image/home-title-bg.png"
            style={centeredScaledRect(TITLE_BG_TOP, TITLE_BG_WIDTH, TITLE_BG_HEIGHT)}
            className="pointer-events-none"
          />
          <DecoImage
            src="/image/home-yellow-arrow.png"
            style={scaledRect(1562, 1589, 430, 349)}
            className="pointer-events-none"
          />
          <DecoImage
            src="/image/home-bottom-flower.png"
            style={scaledRect(-92, 2881, 302, 270)}
            className="pointer-events-none"
          />
          <DecoImage
            src="/image/home-bottom-spring.png"
            style={scaledRect(1753, 3143, 181, 271)}
            className="pointer-events-none"
          />
          <div
            className="absolute top-0"
            style={{
              left: canvasLeft,
              width: DESIGN_WIDTH * scale,
              height: scaledHeight,
            }}
          >
            <div
              className="relative"
              style={{
                width: DESIGN_WIDTH,
                height: DESIGN_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="pointer-events-none"
                style={{
                  ...abs(705, 223, 771, 742),
                  borderRadius: '50%',
                  background:
                    'radial-gradient(ellipse at 26% 30%, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.28) 34%, rgba(0, 0, 0, 0) 68%)',
                  filter: 'blur(12px)',
                  transform: 'rotate(16deg)',
                  transformOrigin: 'center center',
                }}
              />
              <div
                className="pointer-events-none"
                style={{
                  ...abs(744, 258, 860, 860),
                  borderRadius: '50%',
                  background:
                    'radial-gradient(ellipse at 24% 26%, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.12) 28%, rgba(0, 0, 0, 0.05) 46%, rgba(0, 0, 0, 0) 74%)',
                  filter: 'blur(42px)',
                  transform: 'rotate(18deg)',
                  transformOrigin: 'center center',
                }}
              />
              <DecoVideo
                src="/image/top-potato-transparent.webm"
                poster="/image/top-potato-transparent.png"
                style={{
                  ...abs(462, 42, 980, 927),
                  objectFit: 'contain',
                  transform: 'scaleX(1.08)',
                  transformOrigin: 'center center',
                }}
              />
              <DecoImage
                src={`${ASSET_BASE}/050-AI-LAB.svg`}
                style={{
                  ...abs(552, 486, 816, 218),
                  filter: `blur(${aiLabBlur}px)`,
                  transition: 'filter 2200ms ease-in-out',
                }}
              />
              <DecoImage src={`${ASSET_BASE}/051-Gamjas.svg`} style={abs(864, 398, 286, 69)} />
              <DecoImage src={`${ASSET_BASE}/052-SINCE-2026.png`} style={abs(903, 706, 175, 20)} />

              <DecoImage src={`${ASSET_BASE}/014-2.svg`} style={abs(240, 1049, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/015-btn.svg`} style={abs(639, 1297, 38, 38)} />
              <DecoImage src={`${ASSET_BASE}/016-icon_rotaiton.png`} style={abs(330, 1060, 274, 235)} />
              <DecoImage src={`${ASSET_BASE}/017-Rotation.svg`} style={abs(403, 1268, 127, 31)} />
              <div
                style={{
                  ...abs(336, 1303, 285, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                }}
              >
                오브젝트를 정교하게 회전시킵니다
              </div>

              <DecoImage src={`${ASSET_BASE}/018-2.svg`} style={abs(730, 1049, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/019-icon_object.png`} style={abs(886, 1089, 143, 155)} />
              <div
                style={{
                  ...abs(847, 1268, 214, 31),
                  fontSize: 27.5,
                  fontWeight: 800,
                  letterSpacing: '-1.1px',
                  lineHeight: 'normal',
                  textAlign: 'center',
                }}
              >
                Object Creator
              </div>
              <div
                style={{
                  ...abs(871, 1303, 220, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                }}
              >
                오브젝트를 생성합니다
              </div>
              <DecoImage src={`${ASSET_BASE}/021-btn.svg`} style={abs(1128, 1297, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/022-2.svg`} style={abs(1227, 1049, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/024-9.png`} style={abs(1364, 1083, 160, 184)} />
              <DecoImage src={`${ASSET_BASE}/023-UpScaler.svg`} style={abs(1387, 1269, 132, 31)} />
              <div
                style={{
                  ...abs(1319, 1303, 287, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                }}
              >
                화질을 더 선명하게 업스케일 합니다
              </div>
              <DecoImage src={`${ASSET_BASE}/025-btn.svg`} style={abs(1626, 1297, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/026-2.svg`} style={abs(240, 1393, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/027-Mask-group.svg`} style={abs(326, 1415, 282, 188)} />
              <div
                style={{
                  ...abs(410, 1612, 150, 31),
                  fontSize: 27.5,
                  fontWeight: 800,
                  letterSpacing: '-1.1px',
                  lineHeight: 'normal',
                }}
              >
                로고작업실
              </div>
              <div
                style={{
                  ...abs(343, 1647, 260, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                }}
              >
                서비스에 맞는 로고를 제작합니다
              </div>
              <DecoImage src={`${ASSET_BASE}/028-btn.svg`} style={abs(639, 1638, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/029-2.svg`} style={abs(730, 1393, 454, 304)} />
              <TextSwapIllustration />
              <button
                type="button"
                aria-label="의자뺏기 카드 열기"
                onClick={() => setOpenPopup('chair-swap')}
                style={{ ...abs(730, 1393, 454, 304), background: 'transparent' }}
                className="z-10 cursor-pointer"
              />
              <div
                style={{
                  ...abs(911, 1612, 120, 31),
                  fontSize: 27.5,
                  fontWeight: 800,
                  letterSpacing: '-1.1px',
                  lineHeight: 'normal',
                }}
              >
                의자뺏기
              </div>
              <div
                style={{
                  ...abs(823, 1647, 280, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                }}
              >
                텍스트 검수 및 텍스트를 교체합니다
              </div>
              <DecoImage src={`${ASSET_BASE}/036-btn.svg`} style={abs(1128, 1638, 38, 38)} />
              <button
                type="button"
                aria-label="의자뺏기 서비스 열기"
                onClick={() => setOpenPopup('chair-swap')}
                style={{ ...abs(1118, 1628, 58, 58), background: 'transparent' }}
                className="z-20 cursor-pointer"
              />

              <DecoImage src={`${ASSET_BASE}/037-2.svg`} style={abs(1227, 1393, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/038-Group-3.svg`} style={abs(1325, 1415, 244, 188)} />
              <button
                type="button"
                aria-label="봉준호 카드 열기"
                onClick={() => setOpenPopup('bongjoonho')}
                style={{ ...abs(1227, 1393, 454, 304), background: 'transparent' }}
                className="z-10 cursor-pointer"
              />
              <div
                style={{
                  ...abs(1334, 1612, 226, 31),
                  fontSize: 27.5,
                  fontWeight: 800,
                  letterSpacing: '-1.1px',
                  lineHeight: 'normal',
                  textAlign: 'center',
                }}
              >
                봉준호
              </div>
              <div
                style={{
                  ...abs(1266, 1647, 358, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                  textAlign: 'center',
                }}
              >
                카메라 앵글에 대한 프롬프트를 알려줍니다
              </div>
              <DecoImage src={`${ASSET_BASE}/039-btn.svg`} style={abs(1626, 1638, 38, 38)} />
              <button
                type="button"
                aria-label="봉준호 서비스 열기"
                onClick={() => setOpenPopup('bongjoonho')}
                style={{ ...abs(1616, 1628, 58, 58), background: 'transparent' }}
                className="z-20 cursor-pointer"
              />

              <DecoImage src={`${ASSET_BASE}/040-2.svg`} style={abs(240, 1737, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/041-534.svg`} style={abs(255, 1752, 116, 41)} />
              <DecoImage src={`${ASSET_BASE}/042-icon_sb.png`} style={abs(384, 1761, 174, 195)} />
              <div
                style={{
                  ...abs(361, 1957, 207, 31),
                  fontSize: 27.5,
                  fontWeight: 800,
                  letterSpacing: '-1.1px',
                  lineHeight: 'normal',
                  textAlign: 'center',
                }}
              >
                Scene Creator
              </div>
              <DecoImage src={`${ASSET_BASE}/044-beta.svg`} style={abs(287, 1761, 54, 23)} />
              <div
                style={{
                  ...abs(345, 1991, 280, 26),
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.88px',
                  lineHeight: 'normal',
                }}
              >
                스토리보드로 장면을 생성합니다
              </div>
              <DecoImage src={`${ASSET_BASE}/045-btn.svg`} style={abs(639, 1985, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/048-LABcord.png`} style={abs(239, 2217, 234, 35)} />
              <DecoImage src={`${ASSET_BASE}/047-asset.svg`} style={abs(1504, 2220, 103, 60)} />
              <button
                type="button"
                aria-label="LABCord 노션 게시판 열기"
                onClick={() => window.open(LABCORD_BOARD_URL, '_blank', 'noopener,noreferrer')}
                style={{ ...abs(1504, 2220, 103, 60), background: 'transparent' }}
                className="z-20 cursor-pointer"
              />

              {labcordStatus === 'ready' && labcordPosts.length > 0 ? (
                <>
                  <DecoImage src={`${ASSET_BASE}/046-frame.svg`} style={abs(243, 2317, 1398, 729)} />
                  {labcordPosts.map((post, index) => {
                    const top = 2330 + index * 102;
                    const displayTitle = formatLabcordTitle(post.title, post.author, LABCORD_TITLE_LIMIT);
                    return (
                      <div key={post.id}>
                        <button
                          type="button"
                          aria-label={`${post.title} 노션 게시물 열기`}
                          onClick={() => window.open(post.url, '_blank', 'noopener,noreferrer')}
                          style={{ ...abs(314, top, 1310, 84), background: 'transparent' }}
                          className="z-20 cursor-pointer"
                        />
                        <div
                          style={{
                            ...abs(314, top, 1000, 84),
                            fontSize: 30,
                            fontWeight: post.category === '연구' ? 700 : 500,
                            lineHeight: '84px',
                            letterSpacing: '-0.55px',
                            color: '#000',
                          }}
                        >
                          {displayTitle}
                        </div>
                        <div
                          style={{
                            ...abs(1463, top + 3, 160, 81),
                            fontSize: 30,
                            fontWeight: 500,
                            lineHeight: '81px',
                            letterSpacing: '-0.55px',
                            color: '#000',
                            textAlign: 'left',
                          }}
                        >
                          {post.date}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : labcordStatus === 'loading' ? (
                <div
                  style={{
                    ...abs(314, 2360, 800, 84),
                    fontSize: 30,
                    fontWeight: 500,
                    lineHeight: '84px',
                    letterSpacing: '-0.55px',
                    color: '#000',
                  }}
                >
                  LABcord 글을 불러오는 중입니다...
                </div>
              ) : null}

              <DecoImage src={`${ASSET_BASE}/004-Tool-Supporter.png`} style={abs(257, 3221, 354, 43)} />
              <DecoImage src={`${ASSET_BASE}/047-asset.svg`} style={abs(1504, 3220, 103, 60)} />
              <button
                type="button"
                aria-label="Tool Supporter 노션 게시판 열기"
                onClick={() => window.open(TOOL_SUPPORTER_BOARD_URL, '_blank', 'noopener,noreferrer')}
                style={{ ...abs(1504, 3220, 103, 60), background: 'transparent' }}
                className="z-20 cursor-pointer"
              />

              {toolSupporterStatus === 'ready' && toolSupporterPosts.length > 0
                ? toolSupporterPosts.slice(0, supporterCardLayouts.length).map((post, index) => {
                    const layout = supporterCardLayouts[index];
                    return layout ? (
                      <Fragment key={post.id}>
                        <SupporterCard
                          bg={layout.bg}
                          chip={layout.chip}
                          x={layout.x}
                          y={layout.y}
                          dark={layout.dark}
                          post={post}
                        />
                      </Fragment>
                    ) : null;
                  })
                : null}

              {toolSupporterStatus === 'loading' ? (
                <div
                  style={{
                    ...abs(257, 3310, 800, 84),
                    fontSize: 30,
                    fontWeight: 500,
                    lineHeight: '84px',
                    letterSpacing: '-0.55px',
                    color: '#000',
                  }}
                >
                  Tool Supporter 글을 불러오는 중입니다...
                </div>
              ) : null}

              <DecoImage src={`${ASSET_BASE}/049-asset.svg`} style={abs(-69, 3896, 2058, 323)} />
              <DecoVideo
                src="/image/done.webm"
                style={{
                  ...abs(1620, 3896, 113, 218),
                  objectFit: 'contain',
                }}
                className="pointer-events-none"
              />

              <NavOverlay
                label="Rotation"
                left={240}
                top={1049}
                width={454}
                height={304}
                onClick={() => setOpenPopup('rotation')}
              />
              <NavOverlay
                label="Object Creator"
                left={730}
                top={1049}
                width={454}
                height={304}
                onClick={() => setOpenPopup('object-creator')}
              />
              <NavOverlay
                label="로고작업실"
                left={240}
                top={1393}
                width={454}
                height={304}
                onClick={() => setOpenPopup('logo-maker')}
              />
              <NavOverlay
                label="Scene Creator"
                left={240}
                top={1737}
                width={454}
                height={304}
                onClick={() => setOpenPopup('scene-creator')}
              />
            </div>
          </div>
        </div>
      </div>

      {currentPopup ? (
        <PopupModal
          popup={currentPopup}
          onClose={() => setOpenPopup(null)}
          onStart={() => {
            const route = currentPopup.route;
            setOpenPopup(null);
            window.open(route, '_blank', 'noopener,noreferrer');
          }}
        />
      ) : null}
    </div>
  );
}

