
import React from 'react';
import { LogoVariation } from '../types';

interface LogoCardProps {
  variation: LogoVariation;
  onRegenerate: (id: string) => void;
  onSelect: (id: string) => void;
  selected?: boolean;
  viewMode?: 'grid' | 'single';
}

const LogoCard: React.FC<LogoCardProps> = ({ variation, onRegenerate, onSelect, selected = false, viewMode = 'grid' }) => {
  const downloadImage = () => {
    if (!variation.imageUrl) return;
    const link = document.createElement('a');
    link.href = variation.imageUrl;
    link.download = `logo-variation-${variation.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasError = !variation.loading && !variation.imageUrl && variation.prompt === 'error';

  return (
    <div
      onClick={() => variation.imageUrl && onSelect(variation.id)}
      className={`group relative bg-white ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[16/7]'} rounded-[2rem] border flex items-center justify-center overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-700 ${selected ? 'border-black ring-2 ring-black/10' : 'border-gray-100'} ${variation.imageUrl ? 'cursor-pointer' : ''}`}
    >
      {/* Loading Overlay */}
      {variation.loading && (
        <div className="absolute inset-0 z-40 bg-white/95 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-[3px] border-gray-50 border-t-black rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-200 text-xl animate-pulse">
               autorenew
              </span>
            </div>
          </div>
          <div className="text-center">
             <p className="text-[11px] font-bold tracking-widest text-gray-900 uppercase">
               Ref {variation.id} 스타일 적용 중...
             </p>
          </div>
        </div>
      )}

      {hasError ? (
        <div className="flex flex-col items-center gap-4 text-center px-8 z-10">
          <span className="material-symbols-outlined text-4xl text-red-200">error</span>
          <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">
            이미지 생성 중<br/>오류가 발생했습니다
          </p>
          {variation.error && (
            <p className="text-[10px] leading-relaxed text-red-400 max-w-[85%] break-all">
              {variation.error}
            </p>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate(variation.id);
            }}
            className="mt-2 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">refresh</span> 다시 시도
          </button>
        </div>
      ) : variation.imageUrl ? (
        <>
          <img 
            src={variation.imageUrl} 
            alt={`Logo Variation ${variation.id}`}
            className={`w-full h-full object-contain ${viewMode === 'grid' ? 'p-10' : 'p-6'} transition-all duration-700 ${variation.loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100 group-hover:scale-105'}`} 
          />
          <div
            className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-md z-30"
            onClick={(e) => e.stopPropagation()}
          >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              downloadImage();
            }}
            className="bg-white text-black px-8 py-3 rounded-full font-bold text-xs flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">download</span> DOWNLOAD PNG
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate(variation.id);
            }}
            className="text-white/60 hover:text-white font-bold text-[10px] tracking-widest flex items-center gap-1 transition-colors"
          >
              <span className="material-symbols-outlined text-sm">refresh</span> REGENERATE
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-gray-100 animate-pulse">
          <span className="material-symbols-outlined text-6xl">palette</span>
        </div>
      )}
      
      <div className="absolute bottom-6 left-6 z-10">
        <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 border border-gray-50 shadow-sm flex items-center gap-2">
          <span>OUTPUT</span>
          <span className="w-0.5 h-2 bg-gray-300 rounded-full"></span>
          <span className="text-gray-900">REF STYLE {variation.id}</span>
        </span>
      </div>
    </div>
  );
};

export default LogoCard;
