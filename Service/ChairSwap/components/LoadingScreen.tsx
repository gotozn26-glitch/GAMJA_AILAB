import { useNavigate } from 'react-router-dom';
import { AdBanner } from './AdBanner';

const BASE_ROUTE = '/service/chair-swap';

export function LoadingScreen() {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light">
      <header className="z-20 flex items-center justify-between border-b border-solid border-b-[#f3e7e7] bg-background-light/80 px-6 py-3 backdrop-blur-sm lg:px-10">
        <div className="flex cursor-pointer items-center gap-4" onClick={() => navigate(BASE_ROUTE)}>
          <div className="flex size-8 items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">chair</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">의자뺏기</h2>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex select-none flex-col items-center p-8 opacity-30 blur-[2px] md:p-12 lg:p-20">
          <div className="w-full max-w-[800px] space-y-8">
            <div className="mb-8 h-12 w-3/4 rounded bg-gray-200" />
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200" />
            </div>
          </div>
        </div>

        <div className="z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
          <div className="relative mb-10">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-xl animate-pulse" />
            <div className="relative flex size-24 items-center justify-center rounded-full bg-white shadow-xl shadow-primary/10 ring-4 ring-primary/5 animate-bounce-chair">
              <span className="material-symbols-outlined text-5xl text-primary">chair_alt</span>
            </div>
          </div>
          <div className="mb-8 min-h-[5rem] space-y-2">
            <h2 className="animate-pulse text-2xl font-bold tracking-tight text-[#1b0d0d] md:text-3xl">
              음악이 흐르고 있어요...
            </h2>
            <p className="text-base font-medium text-gray-500">
              불필요한 형용사가 탈락 중입니다!
            </p>
          </div>
          <div className="mb-10 flex w-full max-w-[280px] flex-col gap-3">
            <div className="flex items-end justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                의자 빼는 중...
              </span>
              <span className="text-xs font-medium text-gray-500">전송 완료</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="relative h-full w-[65%] overflow-hidden rounded-full bg-primary shadow-[0_0_10px_rgba(236,19,19,0.5)]">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          <AdBanner type="loading" className="w-full" />

          <button
            onClick={() => navigate(BASE_ROUTE)}
            className="mt-12 border-b border-transparent text-sm font-medium text-gray-400 transition-colors hover:border-primary hover:text-primary"
          >
            작업 취소하기
          </button>
        </div>
      </main>
    </div>
  );
}
