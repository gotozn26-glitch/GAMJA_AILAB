
import React from 'react';
import ServiceBackButton from '../../../src/components/renewal/ServiceBackButton';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f8fcfb]">
      {/* Last Update Label - absolute로 변경하여 페이지 상단에 위치 고정 (스크롤 시 사라짐) */}
      <div className="absolute top-6 right-8 z-[100] text-[10px] font-black text-gray-300 select-none pointer-events-none tracking-tighter uppercase opacity-60">
        LastUpdate 26.01.14
      </div>

      <header className="relative w-full flex flex-col items-center pt-16 pb-12 gap-1 text-center">
        <div className="absolute left-6 top-8 sm:left-8 sm:top-10">
          <ServiceBackButton variant="multiview" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-5xl">🥔</span>
          <h1 className="text-gray-900 text-5xl font-black tracking-tighter">
            's Rotation <span className="text-[#35d0b2]">AI</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm font-bold tracking-tight mt-1">Creative 3D Rotation AI</p>
      </header>
      <main className="flex-grow w-full">
        {children}
      </main>
      <footer className="w-full py-12 flex flex-col items-center gap-2 opacity-20">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Spatial Vision Pipeline v3.1</p>
      </footer>
    </div>
  );
};
