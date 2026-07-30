import { useEffect, useState } from 'react';
import { SERVICES, TONE_GRADIENT, type ServiceId, type ServiceDef } from '../../lib/services';
import { useViewportScale } from '../../hooks/useViewportScale';

type Props = {
  open: boolean;
  activeId: ServiceId | null;
  onToggle: () => void;
  onSelectService: (service: ServiceDef) => void;
};

const ANIM_MS = 280;

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
  delayMs,
  shown,
}: {
  service: ServiceDef;
  active: boolean;
  onClick: () => void;
  delayMs: number;
  shown: boolean;
}) {
  const gradient =
    service.id === 'scene-creator'
      ? TONE_GRADIENT['mint-reverse']
      : TONE_GRADIENT[service.tone];
  const width = menuWidth(service.id);
  const isOutline = service.style === 'outline';

  return (
    <div
      className="relative"
      style={{
        width,
        height: 67,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateX(0)' : 'translateX(-16px)',
        transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`,
        transitionDelay: shown ? `${delayMs}ms` : '0ms',
      }}
    >
      <button
        type="button"
        aria-label={service.label}
        aria-current={active ? 'page' : undefined}
        onClick={onClick}
        tabIndex={shown ? 0 : -1}
        className="absolute inset-0 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={
          isOutline
            ? {
                borderRadius: 85,
                padding: 2,
                backgroundImage: gradient,
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                opacity: active ? 1 : 0.85,
              }
            : {
                borderRadius: 85,
                backgroundImage: gradient,
                boxShadow: active ? '0 0 0 2px rgba(0,0,0,0.12)' : undefined,
                opacity: active ? 1 : 0.9,
              }
        }
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-3">
        <img
          src={service.menuLabelSrc}
          alt=""
          draggable={false}
          className="h-[15px] max-w-[90%] object-contain"
          style={{ opacity: active ? 1 : 0.9 }}
        />
      </span>
    </div>
  );
}

/**
 * 햄버거는 서비스 화면 위에 바로 오버레이 (흰 여백 없음).
 * 열림/닫힘 페이드·슬라이드 애니메이션.
 */
export default function ServiceMenuToggle({
  open,
  activeId,
  onToggle,
  onSelectService,
}: Props) {
  const { scale, isCompact } = useViewportScale(1280);
  const uiScale = Math.max(0.55, Math.min(scale, 1));
  const [rendered, setRendered] = useState(open);
  const [shown, setShown] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setShown(true));
      });
      return () => window.cancelAnimationFrame(id);
    }

    setShown(false);
    const timer = window.setTimeout(() => setRendered(false), ANIM_MS + 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  const left = isCompact ? 16 : 20;
  const top = isCompact ? 16 : 20;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* 딤 — 흰 패널 없이 서비스 위에 바로 */}
      {rendered ? (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="pointer-events-auto absolute inset-0 cursor-pointer border-0"
          onClick={onToggle}
          style={{
            background: 'rgba(0,0,0,0.42)',
            opacity: shown ? 1 : 0,
            transition: `opacity ${ANIM_MS}ms ease`,
          }}
        />
      ) : null}

      {/* 햄버거 ↔ 닫기: 같은 자리에 크로스페이드 */}
      <button
        type="button"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        onClick={onToggle}
        className="pointer-events-auto absolute flex h-[48px] w-[48px] cursor-pointer items-center justify-center"
        style={{
          left,
          top,
          transform: `scale(${uiScale})`,
          transformOrigin: 'top left',
        }}
      >
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-[4.8px]"
          style={{
            opacity: shown ? 0 : 1,
            transform: shown ? 'rotate(90deg) scale(0.6)' : 'rotate(0deg) scale(1)',
            transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`,
            pointerEvents: shown ? 'none' : 'auto',
          }}
        >
          <span
            className="block h-[4.8px] w-[35px] rounded-[10px]"
            style={{ background: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)' }}
          />
          <span
            className="block h-[4.8px] w-[35px] rounded-[10px]"
            style={{ background: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)' }}
          />
          <span
            className="block h-[4.8px] w-[35px] rounded-[10px]"
            style={{ background: 'linear-gradient(180deg, #e5deff 0%, #c1a7fe 100%)' }}
          />
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.6)',
            transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease`,
            pointerEvents: shown ? 'auto' : 'none',
          }}
        >
          <img
            src="/renewal/menu/008-icon.svg"
            alt=""
            className="h-[28px] w-[28px]"
            draggable={false}
          />
        </span>
      </button>

      {/* 메뉴 알약 — 흰 배경 패널 없이 서비스 위에 바로 */}
      {rendered ? (
        <nav
          className="pointer-events-auto absolute flex flex-col gap-[12px]"
          aria-label="서비스 메뉴"
          style={{
            left,
            top: top + 72,
            transform: `scale(${uiScale})`,
            transformOrigin: 'top left',
          }}
        >
          {SERVICES.map((service, index) => (
            <MenuPill
              key={service.id}
              service={service}
              active={service.id === activeId}
              delayMs={index * 35}
              shown={shown}
              onClick={() => onSelectService(service)}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
