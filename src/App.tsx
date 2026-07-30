import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';

const BongJoonHoPage = lazy(() => import('./pages/BongJoonHoPage'));
const ChairSwapPage = lazy(() => import('./pages/ChairSwapPage'));
const CreatorObjectPage = lazy(() => import('./pages/CreatorObjectPage'));
const MultiViewPage = lazy(() => import('./pages/MultiViewPage'));
const StoryboardDirectorPage = lazy(() => import('./pages/StoryboardDirectorPage'));
const LogoMakerPage = lazy(() => import('./pages/LogoMakerPage'));
const UpscalerPage = lazy(() => import('./pages/UpscalerPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#bfe7ff] via-[#c8efff] to-[#d4ffd2] text-[#0b0f1a] text-sm font-bold">
      로딩 중…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/main" element={<Navigate to="/" replace />} />
          <Route path="/service/bongjoonho" element={<BongJoonHoPage />} />
          <Route path="/service/chair-swap/*" element={<ChairSwapPage />} />
          <Route path="/service/multiview" element={<MultiViewPage />} />
          <Route path="/service/storyboard-director" element={<StoryboardDirectorPage />} />
          <Route path="/service/creator-object" element={<CreatorObjectPage />} />
          <Route path="/service/logo-maker" element={<LogoMakerPage />} />
          <Route path="/service/upscaler" element={<UpscalerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
