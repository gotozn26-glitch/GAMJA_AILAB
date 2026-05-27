import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SummaryScreen } from './components/SummaryScreen';
import { ImageMatchScreen } from './components/ImageMatchScreen';
import { LoadingScreen } from './components/LoadingScreen';

const BASE_ROUTE = '/service/chair-swap';

function NavHeader() {
  const navigate = useNavigate();

  return (
    <header className="w-full bg-background-light pt-8 pb-4">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-6 md:px-10">
        <div className="group mb-6 flex cursor-pointer items-center gap-3" onClick={() => navigate('/')}>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-2xl font-bold">chair</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-text-main">의자뺏기</h1>
        </div>
      </div>
    </header>
  );
}

function TabNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { path: BASE_ROUTE, label: '카피교체' },
    { path: `${BASE_ROUTE}/image-match`, label: '이미지 매칭' },
  ];

  return (
    <nav className="mb-12 flex w-full justify-center">
      <div className="flex rounded-2xl border border-border-light bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`rounded-xl px-6 py-3 text-sm font-bold transition-all md:px-10 md:text-base ${
                isActive
                  ? 'scale-105 bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-text-sub hover:bg-primary/5 hover:text-primary'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function ChairSwapApp() {
  const location = useLocation();
  const isImageMatch = location.pathname === `${BASE_ROUTE}/image-match`;
  const isLoading = location.pathname === `${BASE_ROUTE}/loading`;

  return (
    <div className="min-h-screen bg-background-light text-text-main">
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <>
          <NavHeader />
          <main className="mx-auto flex w-full max-w-[1280px] flex-col px-4 md:px-6">
            <TabNavigation />
            <div className="flex-1">{isImageMatch ? <ImageMatchScreen /> : <SummaryScreen />}</div>
          </main>
          <footer className="mt-12 py-12 text-center">
            <div className="mx-auto max-w-7xl px-6 text-xs font-medium text-gray-400">
              <p className="mb-2">© 2026 의자뺏기. 모든 의자를 뺏습니다. pplee.</p>
              <p className="opacity-50 uppercase tracking-widest">Copywriting Tool</p>
            </div>
          </footer>
        </>
      )}
      <div
        className="pointer-events-none fixed inset-0 z-[-1] opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(#ec1313 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}
