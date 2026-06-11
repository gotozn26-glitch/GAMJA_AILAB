
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AspectRatio, DesignConfig } from '../types';

interface SidebarProps {
  config: DesignConfig;
  setConfig: React.Dispatch<React.SetStateAction<DesignConfig>>;
}

// --- Color Utility Functions (HSV <-> Hex) ---
const hexToHsv = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h: number, s: number, v: number) => {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s / 100);
  const q = v * (1 - f * s / 100);
  const t = v * (1 - (1 - f) * s / 100);
  const vDiv = v / 100; 
  const pDiv = p / 100;
  const qDiv = q / 100;
  const tDiv = t / 100;

  switch (i % 6) {
    case 0: r = vDiv; g = tDiv; b = pDiv; break;
    case 1: r = qDiv; g = vDiv; b = pDiv; break;
    case 2: r = pDiv; g = vDiv; b = tDiv; break;
    case 3: r = pDiv; g = qDiv; b = vDiv; break;
    case 4: r = tDiv; g = pDiv; b = vDiv; break;
    case 5: r = vDiv; g = pDiv; b = qDiv; break;
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// --- Custom Color Picker Modal ---
interface ColorPickerModalProps {
  initialColor: string;
  label: string;
  onConfirm: (color: string) => void;
  onClose: () => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ initialColor, label, onConfirm, onClose }) => {
  const [hsv, setHsv] = useState(hexToHsv(initialColor));
  const [hex, setHex] = useState(initialColor);
  const satValRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    setHex(hsvToHex(hsv.h, hsv.s, hsv.v));
  }, [hsv]);

  const handleSatValMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateSatVal(e);
    window.addEventListener('mousemove', updateSatValWindow);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    window.removeEventListener('mousemove', updateSatValWindow);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const updateSatValWindow = (e: MouseEvent) => updateSatVal(e);

  const updateSatVal = (e: MouseEvent | React.MouseEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    const s = (x / rect.width) * 100;
    const v = 100 - (y / rect.height) * 100;
    
    setHsv(prev => ({ ...prev, s, v }));
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHsv(prev => ({ ...prev, h: Number(e.target.value) }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[320px] overflow-hidden ring-1 ring-black/5 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Color Editor</span>
            <span className="text-sm font-bold text-gray-900">{label}</span>
          </div>
          <div className="w-8 h-8 rounded-full shadow-inner border border-gray-200" style={{ backgroundColor: hex }}></div>
        </div>

        {/* Saturation/Value Box */}
        <div 
          className="relative w-full aspect-[4/3] cursor-crosshair touch-none"
          ref={satValRef}
          onMouseDown={handleSatValMouseDown}
          style={{
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            backgroundImage: `
              linear-gradient(to top, #000, transparent),
              linear-gradient(to right, #fff, transparent)
            `
          }}
        >
          <div 
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform active:scale-125"
            style={{ 
              left: `${hsv.s}%`, 
              top: `${100 - hsv.v}%`,
              backgroundColor: hex 
            }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* Hue Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Hue</span>
              <span>{Math.round(hsv.h)}°</span>
            </div>
            <div className="h-4 rounded-full relative overflow-hidden ring-1 ring-black/5">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}></div>
              <input 
                type="range" 
                min="0" 
                max="360" 
                value={hsv.h}
                onChange={handleHueChange}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" 
              />
              <div 
                className="absolute top-0 bottom-0 w-2 bg-white ring-1 ring-black/20 shadow-sm pointer-events-none -translate-x-1/2"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 border border-gray-200 focus-within:border-black/30 transition-colors">
              <span className="text-gray-400 text-xs font-bold">#</span>
              <input 
                type="text" 
                value={hex.replace('#', '').toUpperCase()} 
                readOnly
                className="bg-transparent border-none p-0 w-full text-sm font-mono font-bold text-gray-900 focus:ring-0" 
              />
            </div>
            <button 
              onClick={onClose}
              className="px-4 py-3 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button 
              onClick={() => onConfirm(hex)}
              className="pl-3 pr-4 py-3 bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">check</span>
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Sidebar Component ---

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig }) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isFontDragOver, setIsFontDragOver] = useState(false);
  const [activePicker, setActivePicker] = useState<{ type: 'main' | 'sub', color: string } | null>(null);

  const processFile = (file: File, index: number) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...config.referenceImages];
        newImages[index] = reader.result as string;
        setConfig(prev => ({ ...prev, referenceImages: newImages }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const removeImage = (index: number) => {
    const newImages = [...config.referenceImages];
    newImages[index] = '';
    setConfig(prev => ({ ...prev, referenceImages: newImages }));
  };

  const processFontSketchFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, fontSketchImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const ColorInput = ({ 
    label, 
    value, 
    type
  }: { 
    label: string, 
    value: string, 
    type: 'main' | 'sub'
  }) => {
    const isMain = type === 'main';

    return (
      <div className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all group ${
        config.colorMode === 'auto' 
        ? 'bg-gray-50 border-gray-100 opacity-60 pointer-events-none' 
        : 'bg-white border-gray-100 hover:border-gray-200 cursor-pointer'
      }`}
      onClick={() => {
        if (config.colorMode === 'manual') {
          setActivePicker({ type, color: value });
        }
      }}
      >
        <div className="flex items-center justify-between pointer-events-none">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          {config.colorMode === 'auto' ? (
             <span className="text-[9px] font-mono text-gray-300">AI AUTO</span>
           ) : (
             <span className="text-[10px] font-mono font-bold text-gray-800 uppercase">{value}</span>
           )}
        </div>

        {/* Color Preview Box (Click trigger) */}
        <div className={`relative h-12 w-full rounded-lg overflow-hidden shadow-sm border border-black/5 flex items-center justify-center transition-transform group-hover:scale-[1.02] ${isMain ? 'ring-2 ring-offset-2 ring-gray-100' : ''}`}>
           {config.colorMode === 'auto' ? (
             <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 animate-pulse"></div>
           ) : (
             <div className="absolute inset-0" style={{ backgroundColor: value }}></div>
           )}
           {!config.colorMode || config.colorMode === 'manual' && (
             <span className="material-symbols-outlined text-white mix-blend-difference opacity-0 group-hover:opacity-100 transition-opacity">
               tune
             </span>
           )}
        </div>
      </div>
    );
  };

  const handleColorConfirm = (newColor: string) => {
    if (activePicker) {
      setConfig(prev => ({
        ...prev,
        colors: {
          ...prev.colors,
          [activePicker.type]: newColor
        }
      }));
    }
    setActivePicker(null);
  };

  return (
    <>
      <aside className="z-20 flex h-full min-h-0 w-80 shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="p-10 pb-6">
          <h1 className="text-xl font-bold tracking-tighter text-gray-900">로고작업실</h1>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-10">
          {/* 브랜드 컬러 섹션 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">컬러 팔레트</h3>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 scale-90 origin-right">
                <button 
                  onClick={() => setConfig(prev => ({ ...prev, colorMode: 'auto' }))}
                  className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${config.colorMode === 'auto' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                >
                  AI Auto (Default)
                </button>
                <button 
                  onClick={() => setConfig(prev => ({ ...prev, colorMode: 'manual' }))}
                  className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${config.colorMode === 'manual' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                >
                  Manual Pick
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <ColorInput 
                label="Point Color (Main)" 
                value={config.colors.main} 
                type="main"
              />
              <ColorInput 
                label="Base Color (Sub)" 
                value={config.colors.sub} 
                type="sub"
              />
            </div>
          </section>

          {/* 폰트 스케치 섹션 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">폰트 스케치 (선택)</h3>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              원하는 글자 형태가 있으면 업로드하세요. 스타일 레퍼런스와 분리되어 글자 형태 중심으로 반영됩니다.
            </p>
            <div
              className={`aspect-[3/2] relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
                isFontDragOver
                  ? 'border-black bg-gray-50 scale-[0.99]'
                  : config.fontSketchImage
                    ? 'border-transparent shadow-sm'
                    : 'border-gray-100 hover:border-gray-200'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsFontDragOver(true);
              }}
              onDragLeave={() => setIsFontDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsFontDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFontSketchFile(file);
              }}
            >
              <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-white/90 backdrop-blur rounded-md border border-gray-100 shadow-sm pointer-events-none">
                <span className="text-[9px] font-bold text-gray-900 tracking-widest">FONT SKETCH</span>
              </div>

              {config.fontSketchImage ? (
                <div className="w-full h-full group">
                  <img src={config.fontSketchImage} alt="Font sketch" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, fontSketchImage: '' }))}
                      className="bg-white text-black p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFontSketchFile(file);
                    }}
                  />
                  <span className={`material-symbols-outlined text-2xl transition-colors ${isFontDragOver ? 'text-black' : 'text-gray-200'}`}>
                    {isFontDragOver ? 'download' : 'draw'}
                  </span>
                  <span className="text-[9px] font-bold text-gray-300 mt-2 uppercase tracking-widest">
                    {isFontDragOver ? 'Drop Here' : 'Upload Sketch'}
                  </span>
                </label>
              )}
            </div>
          </section>

          {/* 스타일 레퍼런스 섹션 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">스타일 레퍼런스</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`aspect-square relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
                    dragOverIdx === idx 
                      ? 'border-black bg-gray-50 scale-[0.98]' 
                      : config.referenceImages[idx] 
                        ? 'border-transparent shadow-sm' 
                        : 'border-gray-100 hover:border-gray-200'
                  }`}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                >
                  {/* Reference Number Badge */}
                  <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-white/90 backdrop-blur rounded-md border border-gray-100 shadow-sm pointer-events-none">
                    <span className="text-[9px] font-bold text-gray-900 tracking-widest">REF 0{idx + 1}</span>
                  </div>

                  {config.referenceImages[idx] ? (
                    <div className="w-full h-full group">
                      <img src={config.referenceImages[idx]} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="bg-white text-black p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer pt-4">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, idx)} />
                      <span className={`material-symbols-outlined text-2xl transition-colors ${dragOverIdx === idx ? 'text-black' : 'text-gray-200'}`}>
                        {dragOverIdx === idx ? 'download' : 'add'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 mt-2 uppercase tracking-widest">
                        {dragOverIdx === idx ? 'Drop Here' : 'Upload'}
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 프레임 설정 섹션 */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">프레임 설정</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['1:1', '4:3', '16:9'] as AspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))}
                  className={`text-[10px] py-2.5 rounded-xl border transition-all font-bold tracking-widest ${
                    config.aspectRatio === ratio 
                      ? 'border-black bg-black text-white shadow-lg shadow-black/10' 
                      : 'border-gray-50 text-gray-300 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${config.colorMode === 'auto' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {config.colorMode === 'auto' ? 'AI Color Sync Active' : 'Manual Palette Ready'}
            </span>
          </div>
        </div>
      </aside>

      {/* Custom Color Picker Modal Overlay */}
      {activePicker && (
        <ColorPickerModal 
          initialColor={activePicker.color}
          label={activePicker.type === 'main' ? 'Point Color (Main)' : 'Base Color (Sub)'}
          onConfirm={handleColorConfirm}
          onClose={() => setActivePicker(null)}
        />
      )}
    </>
  );
};

export default Sidebar;
