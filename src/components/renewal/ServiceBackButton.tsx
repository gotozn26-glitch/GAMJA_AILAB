import { useNavigate } from 'react-router-dom';

export type ServiceBackVariant =
  | 'creator'
  | 'multiview'
  | 'upscaler'
  | 'logo'
  | 'chair'
  | 'bong'
  | 'storyboard';

const VARIANT_CLASS: Record<ServiceBackVariant, string> = {
  /** Object Creator — Experiment 색감, 정원 버튼 */
  creator:
    'h-7 w-7 bg-[#FFD600] border border-black text-black hover:bg-[#ffe34d] active:translate-y-px',
  /** Object Rotator / MultiView */
  multiview:
    'h-7 w-7 bg-[#35d0b2] border border-[#1fa88f] text-white hover:bg-[#2eb89d] active:translate-y-px shadow-sm shadow-[#35d0b2]/30',
  /** Upscaler */
  upscaler:
    'h-7 w-7 bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 active:translate-y-px shadow-sm shadow-blue-600/25',
  /** Logo Maker */
  logo:
    'h-7 w-7 bg-gray-900 border border-gray-900 text-white hover:bg-black active:translate-y-px',
  /** 의자뺏기 */
  chair:
    'h-7 w-7 bg-primary border border-primary text-white hover:brightness-110 active:translate-y-px shadow-sm shadow-primary/25',
  /** 봉준호 */
  bong:
    'h-7 w-7 bg-emerald-500 border border-emerald-600 text-white hover:bg-emerald-600 active:translate-y-px shadow-sm shadow-emerald-500/25',
  /** Scene Creator — glass */
  storyboard:
    'h-7 w-7 bg-white/10 border border-white/20 text-white hover:bg-white/20 active:translate-y-px backdrop-blur-md',
};

type Props = {
  variant: ServiceBackVariant;
  className?: string;
};

function BackChevron({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M7.75 2.25L3.5 6l4.25 3.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 서비스 헤더용 뒤로가기 — 메인(/)으로 이동 */
export default function ServiceBackButton({ variant, className = '' }: Props) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="메인으로 돌아가기"
      onClick={() => navigate('/')}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full aspect-square',
        'transition-all duration-150',
        VARIANT_CLASS[variant],
        className,
      ].join(' ')}
    >
      <BackChevron className="h-3.5 w-3.5" />
    </button>
  );
}
