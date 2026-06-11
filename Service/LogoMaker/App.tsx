
import React, { useState, useRef, useEffect } from 'react';
import { LogoVariation, DesignConfig } from './types';
import Sidebar from './components/Sidebar';
import LogoCard from './components/LogoCard';
import { generateLogoConcept, editLogoWithMask, editLogoGlobal } from './services/openaiService';

const App: React.FC = () => {
  const [logoText, setLogoText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [promptImage, setPromptImage] = useState<string | null>(null); // 구도 참고용 이미지
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false); // 드래그 상태 관리
  const [isWideLayout, setIsWideLayout] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1450 : true);
  const [editorVariationId, setEditorVariationId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [lassoStrokes, setLassoStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [redoLassoStrokes, setRedoLassoStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [lassoBrushSize, setLassoBrushSize] = useState(0.03);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logoTextRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionContainerRef = useRef<HTMLDivElement>(null);
  const selectionImageRef = useRef<HTMLDivElement>(null);
  const isLassoDrawingRef = useRef(false);
  
  const activeRequests = useRef<Set<string>>(new Set());

  const [variations, setVariations] = useState<LogoVariation[]>([
    { id: '01', imageUrl: '', prompt: '', loading: false, error: '' },
    { id: '02', imageUrl: '', prompt: '', loading: false, error: '' },
  ]);

  const [config, setConfig] = useState<DesignConfig>({
    aspectRatio: '1:1',
    colors: { main: '#000000', sub: '#9CA3AF' }, 
    colorMode: 'auto',
    fontSketchImage: '',
    referenceImages: ['', '', '', ''],
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  useEffect(() => {
    const handleResize = () => setIsWideLayout(window.innerWidth >= 1450);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const selected = variations.find(v => v.id === editorVariationId && !!v.imageUrl);
    if (!selected?.imageUrl) return;
    const image = new Image();
    image.src = selected.imageUrl;
    image.onload = () => {
      setImageNaturalSize({
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      });
    };
  }, [variations, editorVariationId]);

  const detectPromptScript = (text: string): 'korean' | 'english' | 'mixed' => {
    const koreanCount = (text.match(/[\uAC00-\uD7A3\u3131-\u318E]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (koreanCount === 0 && latinCount === 0) return 'mixed';
    if (koreanCount > latinCount * 1.2) return 'korean';
    if (latinCount > koreanCount * 1.2) return 'english';
    return 'mixed';
  };

  const getImageRenderBounds = () => {
    if (!selectionImageRef.current || !selectionContainerRef.current) return null;
    const imageRect = selectionImageRef.current.getBoundingClientRect();
    const containerRect = selectionContainerRef.current.getBoundingClientRect();

    return {
      rect: imageRect,
      width: imageRect.width,
      height: imageRect.height,
      offsetX: imageRect.left - containerRect.left,
      offsetY: imageRect.top - containerRect.top,
    };
  };

  const processPromptFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPromptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePromptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPromptFile(file);
    }
    // Reset value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPromptFile(file);
    }
  };

  const handleGenerate = async (targetId?: string) => {
    if (targetId && activeRequests.current.has(targetId)) return;
    if (!targetId && isGenerating) return;

    const hasRef = config.referenceImages.some(img => img !== '');
    if (!logoText.trim() && !prompt.trim() && !hasRef && !promptImage) return;

    setIsGenerating(true);
    setHasGeneratedOnce(true);
    const buildDistinctColorDirectives = () => {
      const usedHues: number[] = [];
      const directives: string[] = [];
      for (let i = 0; i < 4; i++) {
        let hue = Math.floor(Math.random() * 360);
        let guard = 0;
        while (usedHues.some((h) => Math.abs(h - hue) < 60 || Math.abs(h - hue) > 300) && guard < 30) {
          hue = Math.floor(Math.random() * 360);
          guard++;
        }
        usedHues.push(hue);
        const accentHue = (hue + 30 + Math.floor(Math.random() * 80)) % 360;
        const vibe = ["high contrast", "balanced contrast", "vivid pop", "soft premium"][i % 4];
        directives.push(
          `Use a unique random palette for this variation. Primary hue around ${hue}deg, accent around ${accentHue}deg, ${vibe}, and clearly different from other variations.`
        );
      }
      return directives;
    };
    const randomColorDirectives = buildDistinctColorDirectives();

    const generateSingle = async (id: string, index: number) => {
      if (activeRequests.current.has(id)) return;
      activeRequests.current.add(id);

      setVariations(prev => prev.map(v => v.id === id ? { ...v, loading: true, imageUrl: '', error: '' } : v));
      
      // Determine Style Reference for this specific slot
      // If Ref slot is empty, fallback to the first available ref, or null
      let styleRef = config.referenceImages[index];
      if (!styleRef) {
         // Fallback strategies:
         // 1. Try to find the first non-empty ref
         styleRef = config.referenceImages.find(img => img !== '') || null;
      }
      
      // Variation Hint
      // If specific style ref exists, emphasize matching THAT style.
      // If not, use standard variation prompt.
      let variationHint = "";
      if (styleRef) {
        const refSlot = config.referenceImages[index] ? `#${index + 1}` : '(fallback)';
        variationHint = `Match the uploaded STYLE REFERENCE image ${refSlot} closely for color mood, stroke finish, decoration density, and texture. Replicate its visual style while keeping logo lettering readable. `;
      } else {
        variationHint = `Generate a clearly different random variation #${index + 1}. Decide composition, decoration, and color direction autonomously.`;
      }

      const promptScript = detectPromptScript(logoText.trim() || prompt);
      if (logoText.trim()) {
        variationHint += ` Render ONLY this exact logo text: "${logoText.trim()}". Do NOT render style instructions as visible lettering.`;
      }
      if (promptScript === 'english') {
        variationHint += ' Keep logo lettering in English exactly as specified in logo text.';
      } else if (promptScript === 'korean') {
        variationHint += ' Keep logo lettering in Korean exactly as specified in logo text.';
      }

      if (config.colorMode === 'manual') {
        variationHint += ` Use mandatory manual palette: point/accent ${config.colors.main}, base/secondary ${config.colors.sub}. Do not use other primary colors.`;
      } else {
        variationHint += ` ${targetId ? buildDistinctColorDirectives()[0] : randomColorDirectives[index]}`;
      }

      if (promptImage) {
        variationHint += " Use the First Image (Composition Ref) as the structural basis.";
      }
      if (config.fontSketchImage) {
        variationHint += " [FONT-SIMILARITY PRIORITY MODE: ALWAYS ON] Font sketch is mandatory: preserve its letter skeleton, wobble angle, bold weight, and playful wild character as highest priority. Style reference must not override letterform.";
      }
      variationHint += " Quality target: polished spacing, clean edge finishing, and premium logo-grade balance.";
      variationHint += " Readability first: do not distort core syllable shapes, and keep decorative points away from critical letter counters/strokes.";
      if (logoText.includes('돈')) {
        variationHint += " The Korean syllable '돈' must remain instantly readable as '돈'.";
      }

      try {
        const imageUrl = await generateLogoConcept(
          logoText,
          prompt,
          config, 
          variationHint, 
          styleRef, 
          promptImage,
          config.fontSketchImage || null
        );
        setVariations(prev => prev.map(v => v.id === id ? { ...v, imageUrl, prompt: `${logoText} | ${prompt}`.trim(), loading: false, error: '' } : v));
      } catch (err) {
        console.error(`Error in ${id}:`, err);
        const asAny = err as any;
        const errorDetails = [
          asAny?.status ? `HTTP ${asAny.status}` : '',
          asAny?.code ? `code=${asAny.code}` : '',
          asAny?.message ? `${asAny.message}` : 'Unknown error',
        ].filter(Boolean).join(' | ');
        setVariations(prev => prev.map(v => v.id === id ? { ...v, loading: false, prompt: 'error', error: errorDetails } : v));
      } finally {
        activeRequests.current.delete(id);
      }
    };

    if (targetId) {
      // Regenerate specific card
      const index = parseInt(targetId) - 1;
      await generateSingle(targetId, index);
      setIsGenerating(false);
    } else {
      // Generate All (cost-friendly: 2 results only)
      const ids = ['01', '02'];
      await Promise.all(ids.map((id, index) => generateSingle(id, index)));
      setIsGenerating(false);
    }
  };

  const showGrid = hasGeneratedOnce || isGenerating;
  const selectedVariation = variations.find(v => v.id === editorVariationId && !!v.imageUrl);

  const getNormalizedPoint = (clientX: number, clientY: number) => {
    const bounds = getImageRenderBounds();
    if (!bounds) return null;

    const localX = clientX - bounds.rect.left;
    const localY = clientY - bounds.rect.top;

    if (localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) {
      return null;
    }

    return {
      x: Math.max(0, Math.min(1, localX / bounds.width)),
      y: Math.max(0, Math.min(1, localY / bounds.height)),
    };
  };

  const handleSelectionStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedVariation?.imageUrl) return;
    const point = getNormalizedPoint(e.clientX, e.clientY);
    if (!point) return;
    isLassoDrawingRef.current = true;
    setRedoLassoStrokes([]);
    setLassoStrokes(prev => [...prev, [point]]);
  };

  const handleSelectionMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const point = getNormalizedPoint(e.clientX, e.clientY);
    if (!point) return;
    if (!isLassoDrawingRef.current) return;
    setLassoStrokes(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = [...next[next.length - 1], point];
      return next;
    });
  };

  const handleSelectionEnd = () => {
    isLassoDrawingRef.current = false;
  };

  const handleModalUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLassoStrokes((prev) => {
      if (prev.length === 0) return prev;
      const removed = prev[prev.length - 1];
      setRedoLassoStrokes((redo) => [...redo, removed]);
      return prev.slice(0, -1);
    });
  };

  const handleModalRedo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRedoLassoStrokes((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setLassoStrokes((strokes) => [...strokes, restored]);
      return prev.slice(0, -1);
    });
  };

  const buildMaskFromLasso = async (imageDataUrl: string) => {
    const image = new Image();
    image.src = imageDataUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create lasso mask.');

    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = Math.max(8, Math.floor(Math.min(canvas.width, canvas.height) * lassoBrushSize));

    for (const stroke of lassoStrokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * canvas.width, stroke[0].y * canvas.height);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * canvas.width, stroke[i].y * canvas.height);
      }
      ctx.stroke();
    }

    return canvas.toDataURL('image/png');
  };

  const applyRegionEdit = async () => {
    if (!selectedVariation?.imageUrl || !editPrompt.trim()) return;

    try {
      setIsEditingRegion(true);
      const hasStroke = lassoStrokes.some(s => s.length > 1);
      let editedImageUrl = '';

      if (hasStroke) {
        const maskDataUrl = await buildMaskFromLasso(selectedVariation.imageUrl);
        editedImageUrl = await editLogoWithMask(selectedVariation.imageUrl, maskDataUrl, editPrompt);
      } else {
        editedImageUrl = await editLogoGlobal(selectedVariation.imageUrl, editPrompt);
      }

      setVariations(prev =>
        prev.map(v => (v.id === selectedVariation.id ? { ...v, imageUrl: editedImageUrl, error: '', prompt: `${v.prompt}\n[Edit] ${editPrompt}` } : v))
      );
      setLassoStrokes([]);
      setRedoLassoStrokes([]);
      setEditPrompt('');
    } catch (err) {
      const asAny = err as any;
      alert(asAny?.message || '부분 수정 중 오류가 발생했습니다.');
    } finally {
      setIsEditingRegion(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white">
      <Sidebar config={config} setConfig={setConfig} />
      
      <main className="flex min-h-0 flex-1 flex-col relative bg-[#fcfcfc]">
        <div className="min-h-0 flex-1 overflow-y-auto p-12 pb-64 custom-scrollbar">
          <div className="mx-auto flex min-h-[320px] w-full flex-col">
            {showGrid ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {variations.map((v) => (
                  <LogoCard 
                    key={v.id} 
                    variation={v} 
                    onRegenerate={(id) => handleGenerate(id)} 
                    onSelect={(id) => {
                      setEditorVariationId(id);
                      setLassoStrokes([]);
                      setRedoLassoStrokes([]);
                      setEditPrompt('');
                    }}
                    selected={editorVariationId === v.id}
                    viewMode={isWideLayout ? 'grid' : 'single'}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center space-y-8">
                <div className="w-20 h-20 rounded-[2.5rem] bg-white shadow-2xl shadow-black/5 flex items-center justify-center border border-gray-100">
                  <span className="material-symbols-outlined text-3xl text-gray-300">sync_saved_locally</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 tracking-tighter">레퍼런스를 등록하고 로고 문구를 입력해주세요</h3>
                  <p className="text-sm text-gray-400 font-medium">
                    <span className="font-bold text-gray-900">TIP:</span> 하단에서 <span className="text-gray-900 underline decoration-gray-300 decoration-2">로고 문구</span>와 <span className="text-gray-900 underline decoration-gray-300 decoration-2">스타일 프롬프트</span>를 분리해서 입력하세요.<br/>
                    사이드바 레퍼런스(1~4)가 각 결과물 스타일이 됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-5xl px-8 z-50">
          {/* Prompt Image Preview (Floating above input) */}
          {promptImage && (
            <div className="absolute bottom-full left-12 mb-4 animate-float">
               <div className="relative group">
                  <img src={promptImage} alt="Composition Ref" className="h-24 w-auto rounded-xl shadow-lg border-2 border-white" />
                  <button 
                    onClick={() => setPromptImage(null)}
                    className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                  >
                    <span className="material-symbols-outlined text-sm block">close</span>
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[9px] font-bold text-white uppercase">
                    Composition Ref
                  </div>
               </div>
            </div>
          )}

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border p-3 flex flex-col gap-2 ring-1 ring-black/5 transition-all duration-300 ${
              isDragOver ? 'border-black bg-blue-50/50 scale-[1.02] shadow-xl' : 'border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0 w-16">로고 문구</span>
              <input
                ref={logoTextRef}
                type="text"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    textareaRef.current?.focus();
                  }
                }}
                className="flex-1 bg-transparent border-none focus:ring-0 text-base font-bold placeholder-gray-300 text-gray-900 py-2"
                placeholder="예: 로고작업실"
              />
            </div>

            <div className="h-px bg-gray-100 mx-3" />

            <div className="flex items-center gap-2">
            <div className="pl-5 flex items-center gap-3 shrink-0">
              <span className={`material-symbols-outlined text-xl ${isGenerating ? 'animate-spin text-gray-300' : 'text-gray-400'}`}>
                {isGenerating ? 'progress_activity' : 'palette'}
              </span>
              
              {/* Image Upload Button */}
              <div className="h-6 w-[1px] bg-gray-200"></div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handlePromptImageUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${promptImage ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                title="스케치/구도 이미지 첨부"
              >
                <span className="material-symbols-outlined text-xl">attach_file</span>
                {promptImage ? 'Added' : ''}
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerating) handleGenerate();
                }
              }}
              className={`flex-1 bg-transparent border-none focus:ring-0 text-base font-semibold placeholder-gray-300 text-gray-900 py-4 resize-none max-h-32 custom-scrollbar transition-opacity ${isDragOver ? 'opacity-50' : 'opacity-100'}`}
              placeholder={isDragOver ? "이미지를 여기에 놓으세요" : "스타일 프롬프트: 예) 두꺼운 필기체 느낌, 단색, 이어지게"}
            />

            <button 
              onClick={() => handleGenerate()}
              disabled={isGenerating || (!logoText.trim() && !prompt.trim() && !config.referenceImages.some(i => i !== '') && !promptImage)}
              className={`group flex items-center justify-center gap-2 min-w-[140px] md:min-w-[170px] px-8 py-4 rounded-[2rem] font-bold tracking-tighter transition-all active:scale-95 shrink-0 shadow-lg ${
                isGenerating || (!logoText.trim() && !prompt.trim() && !config.referenceImages.some(i => i !== '') && !promptImage)
                ? 'bg-gray-100 text-gray-300 shadow-none'
                : 'bg-black text-white hover:bg-gray-800 shadow-black/10'
              }`}
            >
              <span className="text-sm">{isGenerating ? '생성 중...' : '스타일 동기화 생성'}</span>
              {!isGenerating && <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">auto_awesome</span>}
              {isGenerating && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
            </button>
            </div>
          </div>
        </div>
      </main>

      {selectedVariation?.imageUrl && (
        <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm p-6 flex items-center justify-center">
          <div className="w-full max-w-6xl bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">세부 결과 조절</h4>
                <p className="text-[11px] text-gray-400">REF STYLE {selectedVariation.id} - 영역 선택(선택) 후 자연어로 수정</p>
              </div>
              <button
                onClick={() => setEditorVariationId(null)}
                className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="p-6 grid lg:grid-cols-[1fr_320px] gap-6">
              <div>
                <div
                  ref={selectionContainerRef}
                  onMouseDown={handleSelectionStart}
                  onMouseMove={handleSelectionMove}
                  onMouseUp={handleSelectionEnd}
                  onMouseLeave={handleSelectionEnd}
                  className="relative w-full aspect-square rounded-2xl border border-dashed border-gray-200 cursor-crosshair overflow-hidden bg-gray-50 flex items-center justify-center"
                >
                  <div
                    ref={selectionImageRef}
                    className="relative max-w-full max-h-full"
                    style={{ aspectRatio: `${imageNaturalSize.width} / ${imageNaturalSize.height}`, width: imageNaturalSize.width >= imageNaturalSize.height ? '100%' : 'auto', height: imageNaturalSize.height > imageNaturalSize.width ? '100%' : 'auto' }}
                  >
                    <img
                      key={`${selectedVariation.id}-${selectedVariation.imageUrl}`}
                      src={selectedVariation.imageUrl}
                      alt="Selected variation to edit"
                      className="w-full h-full object-contain pointer-events-none select-none block"
                      draggable={false}
                    />
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                      {lassoStrokes.map((stroke, idx) => (
                        <polyline
                          key={idx}
                          fill="none"
                          stroke="rgba(239, 68, 68, 0.8)"
                          strokeWidth={Math.max(3, lassoBrushSize * 120)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={stroke.map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">영역을 선택하지 않으면 전체 로고에 수정이 적용됩니다.</p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleModalUndo}
                    disabled={lassoStrokes.length === 0}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-[10px] font-bold text-gray-700 disabled:text-gray-300 disabled:border-gray-100 bg-white"
                  >
                    <span className="material-symbols-outlined text-base leading-none">undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleModalRedo}
                    disabled={redoLassoStrokes.length === 0}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-[10px] font-bold text-gray-700 disabled:text-gray-300 disabled:border-gray-100 bg-white"
                  >
                    <span className="material-symbols-outlined text-base leading-none">redo</span>
                  </button>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <span className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white text-black shadow-sm text-center">
                    수정 영역 선택
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>브러시 두께</span>
                    <span>{Math.round(lassoBrushSize * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.08}
                    step={0.005}
                    value={lassoBrushSize}
                    onChange={(e) => setLassoBrushSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={7}
                  placeholder="예: 니은 부분만 조금 더 둥글고 안정감 있게 수정해줘"
                  className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:ring-0 focus:border-gray-400 resize-none"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyRegionEdit}
                    disabled={
                      isEditingRegion ||
                      !editPrompt.trim()
                    }
                    className="flex-1 bg-black text-white rounded-xl py-2.5 text-xs font-bold disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {isEditingRegion ? '수정 중...' : lassoStrokes.some(s => s.length > 1) ? '선택 영역 수정' : '전체 수정'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLassoStrokes([]);
                      setRedoLassoStrokes([]);
                    }}
                    className="px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-500"
                  >
                    영역 초기화
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
