import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiKeyModal from '../components/renewal/ApiKeyModal';
import { installApiKeyFetchInterceptor } from '../lib/apiKeys';
import {
  SERVICES,
  TONE_GRADIENT,
  type ServiceDef,
} from '../lib/services';
import { DESIGN_BASE_WIDTH, useViewportScale } from '../hooks/useViewportScale';

const DESIGN_WIDTH = DESIGN_BASE_WIDTH;
const DESIGN_HEIGHT = 1071;

/** 메인 화면 pill 레이아웃 (피그마 좌표) */
const MAIN_LAYOUT: Array<{
  id: ServiceDef['id'];
  left: number;
  top: number;
  width: number;
  height: number;
}> = [
  { id: 'object-creator', left: 0, top: 0, width: 333, height: 95.35 },
  { id: 'object-rotator', left: 356, top: 0, width: 315.92, height: 95.35 },
  { id: 'upscaler', left: 696, top: 0, width: 253.31, height: 95.35 },
  { id: 'logo-maker', left: 5, top: 127, width: 253.31, height: 95.35 },
  { id: 'chair-swap', left: 281, top: 128, width: 253.31, height: 95.35 },
  { id: 'bongjoonho', left: 557, top: 127, width: 253.31, height: 95.35 },
  { id: 'scene-creator', left: 5, top: 255, width: 300.27, height: 95.35 },
];

function pillStyle(service: ServiceDef, isOutline: boolean, opts?: { stroke?: number; horizontal?: boolean }) {
  const stroke = opts?.stroke ?? 2.85;
  const base =
    service.id === 'scene-creator'
      ? TONE_GRADIENT.mint
      : TONE_GRADIENT[service.tone];
  const gradient = opts?.horizontal
    ? base.replace('180deg', '90deg')
    : base;

  if (isOutline) {
    // 얇은 그라데이션 테두리 — mask padding 대신 border-box 클리핑
    return {
      backgroundImage: `linear-gradient(#000, #000), ${gradient}`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
      border: `${stroke}px solid transparent`,
    };
  }

  return {
    backgroundImage: gradient,
  };
}

function MainPill({
  service,
  layout,
  onClick,
}: {
  service: ServiceDef;
  layout: (typeof MAIN_LAYOUT)[number];
  onClick: () => void;
}) {
  const isOutline = service.style === 'outline';

  return (
    <button
      type="button"
      aria-label={service.label}
      onClick={onClick}
      className="absolute cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.98]"
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        borderRadius: 121,
        ...pillStyle(service, isOutline, { stroke: isOutline ? 3 : 2.85 }),
      }}
    >
      <span className="absolute inset-0 flex items-center justify-center px-4">
        <img
          src={service.mainLabelSrc}
          alt=""
          draggable={false}
          className="h-[21px] w-auto max-w-[85%] object-contain"
        />
      </span>
    </button>
  );
}

function CompactMain({
  onOpenService,
  onOpenApiKey,
}: {
  onOpenService: (route: string) => void;
  onOpenApiKey: () => void;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-black px-5 py-10">
      <div className="flex w-full max-w-[340px] flex-col gap-[14px]">
        {SERVICES.map((service) => {
          const isOutline = service.style === 'outline';
          const isKorean = service.id === 'chair-swap' || service.id === 'bongjoonho';
          return (
            <button
              key={service.id}
              type="button"
              aria-label={service.label}
              onClick={() => onOpenService(service.route)}
              className="relative flex h-[72px] w-full cursor-pointer items-center justify-center rounded-full transition-transform active:scale-[0.98]"
              style={pillStyle(service, isOutline, { stroke: 2, horizontal: true })}
            >
              <img
                src={service.mainLabelSrc}
                alt=""
                draggable={false}
                className="w-auto object-contain"
                style={{
                  height: isKorean ? 26 : 22,
                  maxWidth: '78%',
                }}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenApiKey}
        className="mt-10 flex w-full max-w-[340px] cursor-pointer flex-col items-center gap-3"
        aria-label="API Key 연결하기"
      >
        <img
          src="/renewal/main/009-Let-s-connect-your-API-key.svg"
          alt="Let's connect your API key"
          className="h-[14px] w-auto max-w-[280px] object-contain"
          draggable={false}
        />
        <img
          src="/renewal/main/008-Arrow-3.svg"
          alt=""
          className="h-[40px] w-[46px] object-contain"
          draggable={false}
        />
      </button>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { scale, isCompact, width, height } = useViewportScale(DESIGN_WIDTH);
  const [apiModalOpen, setApiModalOpen] = useState(false);

  useEffect(() => {
    return installApiKeyFetchInterceptor();
  }, []);

  const fittedScale = Math.min(scale, height / DESIGN_HEIGHT, 1);
  const serviceById = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<
    ServiceDef['id'],
    ServiceDef
  >;

  if (isCompact || width < 900) {
    return (
      <>
        <CompactMain
          onOpenService={(route) => navigate(route)}
          onOpenApiKey={() => setApiModalOpen(true)}
        />
        <ApiKeyModal
          open={apiModalOpen}
          onClose={() => setApiModalOpen(false)}
          onRegistered={() => setApiModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-black">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(-50%, -50%) scale(${fittedScale})`,
          transformOrigin: 'center center',
        }}
      >
        <div className="absolute left-[165px] top-[213px] h-[350px] w-[949px]">
          {MAIN_LAYOUT.map((layout) => {
            const service = serviceById[layout.id];
            return (
              <div key={layout.id}>
                <MainPill
                  service={service}
                  layout={layout}
                  onClick={() => navigate(service.route)}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setApiModalOpen(true)}
          className="absolute inset-0 cursor-pointer bg-transparent"
          style={{ left: 578, top: 476, width: 530, height: 81 }}
          aria-label="API Key 연결하기"
        >
          <img
            src="/renewal/main/009-Let-s-connect-your-API-key.svg"
            alt="Let's connect your API key"
            className="absolute left-0 top-[30px] h-[20px] w-[420px]"
            draggable={false}
          />
          <img
            src="/renewal/main/008-Arrow-3.svg"
            alt=""
            className="absolute left-[437px] top-0 h-[81px] w-[93px]"
            draggable={false}
          />
        </button>
      </div>

      <ApiKeyModal
        open={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        onRegistered={() => setApiModalOpen(false)}
      />
    </div>
  );
}
