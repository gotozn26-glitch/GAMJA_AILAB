interface AdBannerProps {
  type?: 'horizontal' | 'card' | 'loading';
  className?: string;
}

export function AdBanner({ type = 'horizontal', className = '' }: AdBannerProps) {
  if (type === 'loading') {
    return (
      <div
        className={`animate-fade-in-up flex items-center gap-4 rounded-2xl border border-primary/10 bg-white p-4 text-left shadow-sm ${className}`}
      >
        <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/5">
          <span className="material-symbols-outlined text-primary">campaign</span>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-black text-white">
              AD
            </span>
            <span className="text-sm font-bold text-stone-900">
              카피가 고민될 땐? '의자뺏기 Pro'
            </span>
          </div>
          <p className="text-xs leading-tight text-stone-500">
            더 강력한 모델과 무제한 글자수 제한을 경험하세요.
          </p>
        </div>
        <span className="material-symbols-outlined text-stone-300">chevron_right</span>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div
        className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center ${className}`}
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
          Sponsored
        </span>
        <div className="mb-1 flex size-16 items-center justify-center rounded-full bg-white shadow-sm">
          <span className="material-symbols-outlined text-3xl text-primary">auto_fix_high</span>
        </div>
        <h4 className="font-bold text-stone-900">당신의 브랜딩을 완성하세요</h4>
        <p className="max-w-[200px] text-xs text-stone-500">
          의자뺏기 API를 당신의 서비스에 도입해보세요.
        </p>
        <button className="mt-2 text-xs font-black text-primary underline underline-offset-4">
          자세히 보기
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex w-full items-center justify-between rounded-2xl border border-border-light bg-white p-5 transition-all hover:border-primary/30 ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-stone-100 text-stone-400 transition-colors group-hover:text-primary">
          <span className="material-symbols-outlined">ads_click</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-stone-300 px-1 text-[9px] font-black text-stone-400">
              AD
            </span>
            <span className="text-sm font-bold">
              마케터를 위한 필독 뉴스레터 '뺏기레터' 구독하기
            </span>
          </div>
          <p className="text-xs text-stone-400">
            매주 화요일, 가장 핫한 카피라이팅 트렌드를 전달합니다.
          </p>
        </div>
      </div>
      <button className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-bold text-white transition-colors group-hover:bg-primary">
        구독하기
      </button>
    </div>
  );
}
