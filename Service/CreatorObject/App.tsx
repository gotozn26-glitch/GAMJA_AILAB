
import React, { useState, useRef } from 'react';
import { STYLES } from './constants';
import { StyleConfig, GeneratedVariation, GenerationStatus } from './types';
import { geminiService } from './services/geminiService';
import ServiceBackButton from '../../src/components/renewal/ServiceBackButton';

const AppContent: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<StyleConfig>(STYLES[0]);
  const [keyword, setKeyword] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [results, setResults] = useState<GeneratedVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const runGeneration = async () => {
    setStatus('generating');
    setError(null);
    setResults([]);

    try {
      const newResults: GeneratedVariation[] = [];
      for (let i = 0; i < 2; i++) {
        const url = await geminiService.generateStylizedObject(
          keyword, 
          selectedStyle.promptSuffix,
          referenceImage || undefined,
          i
        );
        
        const variationData: GeneratedVariation = {
          id: Math.random().toString(36).substring(7),
          url,
          timestamp: Date.now(),
          keyword,
          styleId: selectedStyle.id
        };

        newResults.push(variationData);
        setResults([...newResults]);
      }
      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '생성에 실패했습니다.');
      setStatus('error');
    }
  };

  const generate = async () => {
    if (!keyword.trim() || status === 'generating') return;
    await runGeneration();
  };

  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamja-object-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#ECECEC]">
      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-black/10 bg-white z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ServiceBackButton variant="creator" />
          <h1 className="text-2xl font-black">GAMJA OBJECT</h1>
          <span className="text-[10px] bg-[#FFD600] border border-black text-black px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Experiment</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Controls */}
        <aside className="w-[480px] border-r border-black/10 bg-white/50 p-10 overflow-y-auto hide-scrollbar flex flex-col gap-10 flex-shrink-0">
          {/* Style Selection Section */}
          <section className="flex flex-col">
            <h2 className="text-sm font-black uppercase mb-6">Style Selection</h2>
            <div className="grid grid-cols-3 gap-4">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  disabled={!s.isActive}
                  onClick={() => setSelectedStyle(s)}
                  className={`whisk-card aspect-square flex flex-col items-center justify-center gap-3 p-4 relative transition-all ${
                    selectedStyle.id === s.id ? 'active' : ''
                  } ${!s.isActive ? 'opacity-30 grayscale cursor-default border-dashed border-black/10' : 'cursor-pointer'}`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-transparent">
                    <img src={s.image} className="w-full h-full object-cover-contain" alt={s.name} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-center leading-tight">{s.name}</span>
                  {selectedStyle.id === s.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[#FFD600] rounded-full border border-black"></div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Reference Image Section */}
          <section className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-black uppercase">Reference</h2>
              <span className="text-[10px] font-bold opacity-30 uppercase">(선택사항)</span>
            </div>
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`whisk-card aspect-[16/3.5] flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden transition-colors relative group ${referenceImage || isDragging ? 'active bg-white' : ''} ${isDragging ? 'border-[#FFD600] border-solid' : ''}`}
            >
              {referenceImage ? (
                <>
                  <img src={referenceImage} className="w-full h-full object-cover-contain animate-in fade-in zoom-in-95 duration-200" alt="Reference" />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReferenceImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 border border-black text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                      title="레퍼런스 이미지 삭제"
                    >
                      <span className="material-symbols-rounded text-lg">close</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-row items-center gap-3">
                  <span className={`material-symbols-rounded text-2xl transition-opacity ${isDragging ? 'opacity-100 text-[#FFD600]' : 'opacity-20'}`}>
                    {isDragging ? 'upload' : 'upload_file'}
                  </span>
                  <p className={`text-[10px] font-black transition-opacity uppercase tracking-widest ${isDragging ? 'opacity-100 text-[#FFD600]' : 'opacity-20'}`}>
                    {isDragging ? 'Drop to upload' : 'Upload or Drag & Drop'}
                  </p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </section>

          {/* Keywords Section */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase">Keywords</h2>
              <span className="text-[10px] font-black opacity-30">{keyword.length}/400</span>
            </div>
            <div className="whisk-card p-6 h-[180px] active relative">
              <textarea
                placeholder="어떤 오브젝트를 상상하고 있나요? 구체적으로 묘사해보세요."
                className="w-full h-full bg-transparent border-none focus:ring-0 text-base font-bold placeholder:text-black/20 resize-none outline-none p-0"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value.slice(0, 400))}
              />
            </div>
          </section>

          {/* Generate Button */}
          <div className="mt-4 pb-10">
            <button 
              onClick={generate}
              disabled={status === 'generating' || !keyword.trim()}
              className="generate-btn w-full py-5 rounded-full font-black text-lg flex items-center justify-center gap-4 disabled:opacity-20 shadow-xl"
            >
              {status === 'generating' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-rounded">auto_fix_high</span>
              )}
              <span>{status === 'generating' ? 'GENERATING...' : 'GENERATE ARTIFACT'}</span>
            </button>
          </div>
        </aside>

        {/* Right Side: Results */}
        <main className="flex-1 p-16 relative overflow-y-auto bg-[#ECECEC]">
          {error && (
            <div className="mb-10 p-8 border-2 border-red-500 bg-white rounded-[2rem] flex flex-col gap-4 shadow-xl animate-in fade-in slide-in-from-top-5">
              <div className="flex items-center gap-6">
                <span className="material-symbols-rounded text-red-500 text-4xl">error</span>
                <div className="flex-1">
                  <h3 className="font-black uppercase text-sm mb-1">Error Occurred</h3>
                  <p className="font-bold text-red-500">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="opacity-30 hover:opacity-100">
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>
          )}

          {status === 'generating' && results.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-8">
              <div className="w-20 h-20 border-[6px] border-black/5 border-t-black rounded-full animate-spin"></div>
              <p className="text-xl font-black uppercase tracking-[0.3em] animate-pulse">Rendering...</p>
            </div>
          )}

          {status === 'idle' && results.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-6 opacity-20">
              <span className="material-symbols-rounded text-8xl">auto_fix_high</span>
              <p className="text-2xl font-black uppercase tracking-[0.2em]">Ready to Create</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {results.map((res, i) => (
              <div key={res.id} className="group flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="aspect-square rounded-[2rem] overflow-hidden bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] relative">
                  <img src={res.url} className="w-full h-full object-cover-contain" alt={`Output ${i+1}`} />
                  <div className="absolute inset-0 bg-[#FFD600]/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <button 
                      onClick={() => download(res.url)}
                      className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-2xl"
                    >
                      <span className="material-symbols-rounded text-4xl">download</span>
                    </button>
                  </div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-black text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">V{i+1}</span>
                  </div>
                </div>
                <div className="px-2">
                  <p className="text-[10px] font-black uppercase opacity-20 mb-1">{STYLES.find(s => s.id === res.styleId)?.name}</p>
                  <p className="text-xs font-bold line-clamp-2">{res.keyword}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppContent />
  );
};

export default App;
