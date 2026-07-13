import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiKeyModal from '../components/renewal/ApiKeyModal';
import { hasGoogleApiKey, installApiKeyFetchInterceptor } from '../lib/apiKeys';
import {
  SERVICES,
  TONE_GRADIENT,
  type ServiceDef,
} from '../lib/services';

const DESIGN_WIDTH = 1280;
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

function MainPill({
  service,
  layout,
  onClick,
}: {
  service: ServiceDef;
  layout: (typeof MAIN_LAYOUT)[number];
  onClick: () => void;
}) {
  const gradient =
    service.id === 'scene-creator'
      ? TONE_GRADIENT.mint
      : TONE_GRADIENT[service.tone];
  const isOutline = service.style === 'outline';

  return (
    <button
      type="button"
      aria-label={service.label}
      onClick={onClick}
      className="absolute cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.98]"
      style={
        isOutline
          ? {
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: layout.height,
              borderRadius: 121,
              padding: 4.27,
              backgroundImage: gradient,
              WebkitMask:
                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
            }
          : {
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: layout.height,
              borderRadius: 121,
              backgroundImage: gradient,
              border: '2.85px solid transparent',
            }
      }
    >
      {isOutline ? null : (
        <span className="absolute inset-0 flex items-center justify-center px-4">
          <img
            src={service.mainLabelSrc}
            alt=""
            draggable={false}
            className="max-h-[29px] max-w-[85%] object-contain"
          />
        </span>
      )}
    </button>
  );
}

function MainPillLabel({
  service,
  layout,
}: {
  service: ServiceDef;
  layout: (typeof MAIN_LAYOUT)[number];
}) {
  if (service.style !== 'outline') return null;

  return (
    <div
      className="pointer-events-none absolute flex items-center justify-center"
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
      }}
    >
      <img
        src={service.mainLabelSrc}
        alt=""
        draggable={false}
        className="max-h-[29px] max-w-[85%] object-contain"
      />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  useEffect(() => {
    return installApiKeyFetchInterceptor();
  }, []);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScale(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT, 1));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const openService = (route: string) => {
    if (!hasGoogleApiKey()) {
      setPendingRoute(route);
      setApiModalOpen(true);
      return;
    }
    navigate(route);
  };

  const serviceById = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<
    ServiceDef['id'],
    ServiceDef
  >;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* MENUM */}
        <div className="absolute left-[165px] top-[213px] h-[350px] w-[949px]">
          {MAIN_LAYOUT.map((layout) => {
            const service = serviceById[layout.id];
            return (
              <div key={layout.id}>
                <MainPill
                  service={service}
                  layout={layout}
                  onClick={() => openService(service.route)}
                />
                <MainPillLabel service={service} layout={layout} />
              </div>
            );
          })}
        </div>

        {/* Let's connect your API key */}
        <button
          type="button"
          onClick={() => {
            setPendingRoute(null);
            setApiModalOpen(true);
          }}
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
        onClose={() => {
          setApiModalOpen(false);
          setPendingRoute(null);
        }}
        onRegistered={() => {
          if (!hasGoogleApiKey()) return;
          setApiModalOpen(false);
          if (pendingRoute) {
            const route = pendingRoute;
            setPendingRoute(null);
            navigate(route);
          }
        }}
      />
    </div>
  );
}
