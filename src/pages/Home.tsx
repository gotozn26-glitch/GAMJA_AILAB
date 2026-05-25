import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

const ASSET_BASE = '/page1/image';
const POPUP_ASSET_BASE = '/page-pop/image';
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 4173;
const CONTENT_LEFT = 239;
const CONTENT_WIDTH = 1443;
const POPUP_WIDTH = 1562;
const POPUP_HEIGHT = 997;

type PopupKey = 'rotation' | 'object-creator' | 'logo-maker' | 'scene-creator';

type PopupConfig = {
  key: PopupKey;
  title: string;
  route: string;
  mask: string;
  preview: string;
  previewStyle: CSSProperties;
  titleLeft: number;
  description: string;
  buttonBackground: string;
  buttonIcon: string;
  buttonIconStyle: CSSProperties;
};

type LabcordPost = {
  id: string;
  title: string;
  date: string;
};

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

const supporterCards = [
  { bg: '005-6.svg', chip: '006-7.svg', label: 'Figma', accent: '#b58aff', x: 240, y: 3310 },
  { bg: '008-6.svg', chip: '009-7.svg', label: 'After Effect', accent: '#00aff7', x: 733, y: 3309 },
  { bg: '010-6.svg', chip: '009-7.svg', label: 'Photoshop', accent: '#00d46b', x: 1225, y: 3307 },
  { bg: '011-6.svg', chip: '006-7.svg', label: 'Illustrator', accent: '#ff5c08', x: 240, y: 3512 },
  { bg: '012-6.svg', chip: '009-7.svg', label: 'Office', accent: '#ff001e', x: 733, y: 3514 },
  { bg: '013-6.svg', chip: '009-7.svg', label: 'Etc', accent: '#ffffff', x: 1225, y: 3512, dark: true },
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
  label,
  accent,
  x,
  y,
  dark,
}: {
  bg: string;
  chip: string;
  label: string;
  accent: string;
  x: number;
  y: number;
  dark?: boolean;
}) {
  return (
    <>
      <DecoImage src={`${ASSET_BASE}/${bg}`} style={abs(x, y, 455, 190)} />
      <DecoImage src={`${ASSET_BASE}/${chip}`} style={abs(x + 31, y + 10, 221, 65)} />
      <div
        style={{
          ...abs(x + 49, y, 220, 76),
          color: accent,
          textAlign: 'center',
          fontSize: 30,
          fontWeight: 700,
          lineHeight: '84px',
          letterSpacing: '-0.55px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...abs(x + (label === 'Figma' ? 76 : label === 'After Effect' ? 53 : label === 'Photoshop' ? 32 : label === 'Illustrator' ? 49 : label === 'Office' ? 52 : 32), y + 81, 281, 76),
          color: '#000',
          textAlign: label === 'Figma' ? 'left' : 'center',
          fontSize: 25,
          fontWeight: 700,
          lineHeight: '84px',
          letterSpacing: '-0.46px',
        }}
      >
        맞춤 용량 추출 도우미
      </div>
      <DecoImage src={`${ASSET_BASE}/007-Group-2.svg`} style={abs(x + 349, y + 92, 65, 64)} />
      {dark ? (
        <div style={{ ...abs(x + 32, y, 216, 76), background: '#000', opacity: 0.05 }} />
      ) : null}
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
                boxShadow: '-6px 8px 0 rgba(0, 0, 0, 0.3)',
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

            <DecoImage src={`${POPUP_ASSET_BASE}/${popup.preview}`} style={popup.previewStyle} />

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
  const navigate = useNavigate();
  const scaleMeasureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(CONTENT_WIDTH);
  const [openPopup, setOpenPopup] = useState<PopupKey | null>(null);
  const [labcordPosts, setLabcordPosts] = useState<LabcordPost[]>([]);

  useEffect(() => {
    const updateScale = () => {
      const width = scaleMeasureRef.current?.clientWidth || CONTENT_WIDTH;
      setAvailableWidth(width);
      setScale(Math.min(width / CONTENT_WIDTH, 1));
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

    fetch("/api/labcord/posts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`LABcord fetch failed: ${response.status}`);
        }

        return response.json() as Promise<{ posts?: LabcordPost[] }>;
      })
      .then((data) => {
        setLabcordPosts(Array.isArray(data.posts) ? data.posts : []);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setLabcordPosts([]);
      });

    return () => controller.abort();
  }, []);

  const currentPopup = openPopup ? popupConfigs[openPopup] : null;
  const scaledHeight = DESIGN_HEIGHT * scale;
  const canvasLeft = (availableWidth - CONTENT_WIDTH * scale) / 2 - CONTENT_LEFT * scale;

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
            className="absolute top-0"
            style={{
              left: canvasLeft,
              width: DESIGN_WIDTH * scale,
              height: scaledHeight,
            }}
          >
            <div
              className="relative overflow-hidden bg-white"
              style={{
                width: DESIGN_WIDTH,
                height: DESIGN_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <DecoImage src={`${ASSET_BASE}/001-bg.svg`} style={abs(-92, 0, 2127, 4320)} />
              <DecoImage src={`${ASSET_BASE}/002-1.png`} style={abs(705, 223, 771, 742)} />
              <DecoImage src={`${ASSET_BASE}/003-0.png`} style={abs(647, 227, 604, 570)} />
              <DecoImage src={`${ASSET_BASE}/050-AI-LAB.svg`} style={abs(552, 486, 816, 218)} />
              <DecoImage src={`${ASSET_BASE}/051-Gamjas.svg`} style={abs(864, 398, 286, 69)} />
              <DecoImage src={`${ASSET_BASE}/052-SINCE-2026.png`} style={abs(903, 706, 175, 20)} />

              <DecoImage src={`${ASSET_BASE}/014-2.svg`} style={abs(240, 1049, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/015-btn.svg`} style={abs(641, 1299, 38, 38)} />
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
              <DecoImage src={`${ASSET_BASE}/020-Object-Creater.svg`} style={abs(847, 1268, 214, 31)} />
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
              <DecoImage src={`${ASSET_BASE}/021-btn.svg`} style={abs(1130, 1299, 38, 38)} />

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
              <DecoImage src={`${ASSET_BASE}/025-btn.svg`} style={abs(1628, 1299, 38, 38)} />

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
              <DecoImage src={`${ASSET_BASE}/028-btn.svg`} style={abs(641, 1640, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/029-2.svg`} style={abs(730, 1393, 454, 304)} />
              <TextSwapIllustration />
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
              <DecoImage src={`${ASSET_BASE}/036-btn.svg`} style={abs(1130, 1640, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/037-2.svg`} style={abs(1227, 1393, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/038-Group-3.svg`} style={abs(1325, 1415, 244, 188)} />
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
              <DecoImage src={`${ASSET_BASE}/039-btn.svg`} style={abs(1628, 1640, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/040-2.svg`} style={abs(240, 1737, 454, 304)} />
              <DecoImage src={`${ASSET_BASE}/041-534.svg`} style={abs(255, 1752, 116, 41)} />
              <DecoImage src={`${ASSET_BASE}/042-icon_sb.png`} style={abs(384, 1761, 174, 195)} />
              <DecoImage src={`${ASSET_BASE}/043-Scene-Creater.svg`} style={abs(361, 1957, 207, 31)} />
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
              <DecoImage src={`${ASSET_BASE}/045-btn.svg`} style={abs(641, 1987, 38, 38)} />

              <DecoImage src={`${ASSET_BASE}/048-LABcord.png`} style={abs(239, 2217, 234, 35)} />
              <DecoImage src={`${ASSET_BASE}/047-asset.svg`} style={abs(1504, 2220, 103, 60)} />
              <DecoImage src={`${ASSET_BASE}/046-frame.svg`} style={abs(243, 2317, 1398, 729)} />

              {labcordPosts.map((post, index) => {
                const top = 2330 + index * 102;
                return (
                  <div key={post.id}>
                    <div
                      style={{
                        ...abs(314, top, 1000, 84),
                        fontSize: 30,
                        fontWeight: index === 0 || index === 5 || index === 6 ? 700 : 500,
                        lineHeight: '84px',
                        letterSpacing: '-0.55px',
                        color: '#000',
                      }}
                    >
                      {post.title}
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

              <DecoImage src={`${ASSET_BASE}/004-Tool-Supporter.png`} style={abs(257, 3221, 354, 43)} />

              {supporterCards.map((card) => (
                <SupporterCard key={card.label} {...card} />
              ))}

              <DecoImage src={`${ASSET_BASE}/049-asset.svg`} style={abs(-69, 3896, 2058, 323)} />

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
                label="Scene Creteor"
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
            navigate(route);
          }}
        />
      ) : null}
    </div>
  );
}

