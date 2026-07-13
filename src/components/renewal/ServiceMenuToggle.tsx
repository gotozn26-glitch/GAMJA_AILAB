import {
  SERVICES,
  TONE_GRADIENT,
  type ServiceId,
  type ServiceDef,
} from '../../lib/services';

type Props = {
  open: boolean;
  activeId: ServiceId | null;
  onToggle: () => void;
  onSelectService: (service: ServiceDef) => void;
};

function menuWidth(id: ServiceId): number {
  if (id === 'object-creator') return 234;
  if (id === 'object-rotator') return 222;
  if (id === 'scene-creator') return 211;
  return 178;
}

function MenuPill({
  service,
  active,
  onClick,
}: {
  service: ServiceDef;
  active: boolean;
  onClick: () => void;
}) {
  const gradient =
    service.id === 'scene-creator'
      ? TONE_GRADIENT['mint-reverse']
      : TONE_GRADIENT[service.tone];
  const width = menuWidth(service.id);
  const isOutline = service.style === 'outline';

  return (
    <button
      type="button"
      aria-label={service.label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className="relative shrink-0 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={
        isOutline
          ? {
              width,
              height: 67,
              borderRadius: 85,
              padding: 3,
              backgroundImage: gradient,
              WebkitMask:
                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              opacity: active ? 1 : 0.85,
            }
          : {
              width,
              height: 67,
              borderRadius: 85,
              backgroundImage: gradient,
              border: '2px solid transparent',
              boxShadow: active ? '0 0 0 2px rgba(0,0,0,0.12)' : undefined,
              opacity: active ? 1 : 0.9,
            }
      }
    >
      {isOutline ? null : (
        <span className="absolute inset-0 flex items-center justify-center px-3">
          <img
            src={service.menuLabelSrc}
            alt=""
            draggable={false}
            className="max-h-[20px] max-w-[90%] object-contain"
          />
        </span>
      )}
    </button>
  );
}

function MenuPillLabel({
  service,
  active,
}: {
  service: ServiceDef;
  active: boolean;
}) {
  if (service.style !== 'outline') return null;
  const width = menuWidth(service.id);

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-3"
      style={{ width, height: 67, opacity: active ? 1 : 0.85 }}
    >
      <img
        src={service.menuLabelSrc}
        alt=""
        draggable={false}
        className="max-h-[20px] max-w-[90%] object-contain"
      />
    </div>
  );
}

export default function ServiceMenuToggle({
  open,
  activeId,
  onToggle,
  onSelectService,
}: Props) {
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[70]">
      {open ? (
        <div className="pointer-events-auto absolute left-[54px] top-[80px]">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={onToggle}
            className="mb-[79px] flex h-[54px] w-[54px] cursor-pointer items-center justify-center"
          >
            <img
              src="/renewal/menu/008-icon.svg"
              alt=""
              className="h-[32px] w-[32px]"
              draggable={false}
            />
          </button>

          <nav className="flex flex-col gap-[12px]" aria-label="서비스 메뉴">
            {SERVICES.map((service) => (
              <div key={service.id} className="relative" style={{ width: menuWidth(service.id), height: 67 }}>
                <MenuPill
                  service={service}
                  active={service.id === activeId}
                  onClick={() => onSelectService(service)}
                />
                <MenuPillLabel service={service} active={service.id === activeId} />
              </div>
            ))}
          </nav>
        </div>
      ) : (
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={onToggle}
          className="pointer-events-auto absolute left-[63px] top-[95px] flex h-[24px] w-[35px] cursor-pointer flex-col justify-between"
        >
          <span
            className="block h-[4.8px] w-full rounded-[10px]"
            style={{
              background: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)',
            }}
          />
          <span
            className="block h-[4.8px] w-full rounded-[10px]"
            style={{
              background: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)',
            }}
          />
          <span
            className="block h-[4.8px] w-full rounded-[10px]"
            style={{
              background: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)',
            }}
          />
        </button>
      )}
    </div>
  );
}
