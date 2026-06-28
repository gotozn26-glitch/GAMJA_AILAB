
import { useState, useRef, forwardRef } from 'react';
import { toPng } from 'html-to-image';
import { Rotation, GeneratedImage } from '../types';
import { generateSingleView, editImage, analyzeIsFrontView, generateFrontView } from '../services/geminiService';

const CubePreview = forwardRef<HTMLDivElement, { rotation: Rotation, isForScreenshot: boolean, frontImage?: string | null }>(({ rotation, isForScreenshot, frontImage }, ref) => {
  const faceSize = isForScreenshot ? 800 : 140; 
  const translateValue = faceSize / 2;

  // 카메라가 양수 Yaw(오른쪽)로 갈 때 물체의 '왼쪽'면을 보게 되는 물리적 회전 구현
  const Face = ({ color, transform, label, isFront }: { color: string, transform: string, label: string, isFront?: boolean }) => (
    <div 
      className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden`} 
      style={{ 
        background: isForScreenshot ? (isFront ? '#ffffff' : color) : `linear-gradient(135deg, ${color}ee, ${color}aa)`,
        transform: `${transform} translateZ(${translateValue}px)`,
        border: isForScreenshot ? (isFront ? '120px solid #ff0000' : '20px solid rgba(255,255,255,0.4)') : '1px solid rgba(255,255,255,0.3)',
      }}
    >
      {isFront ? (
        <div className="relative w-full h-full bg-white flex items-center justify-center">
           {frontImage ? (
             <img src={frontImage} className="w-full h-full object-contain p-8 relative z-10" />
           ) : (
             <span className="material-symbols-outlined text-red-600 text-8xl">image</span>
           )}
           {isForScreenshot && (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-600 text-[180px] font-black opacity-20 uppercase tracking-tighter -rotate-12">FRONT</div>
             </div>
           )}
        </div>
      ) : isForScreenshot ? (
        <div className="z-10 flex flex-col items-center justify-center w-full h-full">
            <span className="text-[120px] font-black text-white uppercase tracking-tight leading-none drop-shadow-2xl">
              {label}
            </span>
            <div className="w-1/2 h-4 bg-white/30 rounded-full mt-10"></div>
        </div>
      ) : (
        <div className="z-10 flex flex-col items-center gap-2 text-center text-white">
            <span className="font-black uppercase tracking-[0.2em] bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-white/10 text-[10px]">{label}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={`relative w-full ${isForScreenshot ? 'h-[1600px] bg-white' : 'h-72 bg-[#fcfdfe]'} flex items-center justify-center overflow-hidden rounded-[2.5rem] shadow-inner border border-gray-100`}>
      {!isForScreenshot && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'radial-gradient(#35d0b2 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
      )}
      
      <div 
        ref={ref}
        className="perspective-container relative z-10 w-full h-full flex items-center justify-center" 
        style={{ perspective: isForScreenshot ? '15000px' : '1000px' }} 
      >
        <div 
          className="cube-wrapper transition-transform duration-700 cubic-bezier(0.2, 0, 0.2, 1)"
          style={{ 
            transformStyle: 'preserve-3d',
            // rotation.y가 양수이면 카메라가 오른쪽으로 가고, 큐브는 왼쪽으로 회전하여 '왼쪽 면'을 보여줌
            transform: `rotateX(${-rotation.x}deg) rotateY(${-rotation.y}deg)`,
            width: `${faceSize}px`,
            height: `${faceSize}px`,
            position: 'relative'
          }}
        >
          <Face label="BACK" color="#000000" transform="rotateY(180deg)" />
          <Face label="RIGHT" color="#1a1a1a" transform="rotateY(90deg)" />
          <Face label="LEFT" color="#10b981" transform="rotateY(-90deg)" />
          <Face label="TOP" color="#3b82f6" transform="rotateX(90deg)" />
          <Face label="BOTTOM" color="#1d4ed8" transform="rotateX(-90deg)" />
          <Face label="FRONT" color="#ef4444" transform="rotateY(0deg)" isFront={true} />
        </div>
      </div>
    </div>
  );
});

export const GeneratorPage: React.FC = () => {
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0, z: 0 }); 
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [objectName, setObjectName] = useState('');
  const [isInferringFront, setIsInferringFront] = useState(false);
  const [frontInferenceStatus, setFrontInferenceStatus] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retouchPrompt, setRetouchPrompt] = useState('');
  const [isRetouching, setIsRetouching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenCubeRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setSourceImage(b64);
      setFrontImage(b64);
      setResults([]);
      setRotation({ x: 0, y: 0, z: 0 });
      setObjectName('');
      setFrontInferenceStatus(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleInferFront = async () => {
    if (!sourceImage) return;

    setIsInferringFront(true);
    setFrontInferenceStatus("AI가 오브젝트의 특징과 시점을 정밀 분석 중입니다...");
    
    try {
      const nameToUse = objectName.trim() || "오브젝트";
      const analysis = await analyzeIsFrontView(sourceImage, nameToUse);
      
      if (analysis.isFront) {
        setFrontImage(sourceImage);
        setFrontInferenceStatus("✨ AI 판독 완료: 이미 정면 뷰인 것으로 판정되었습니다. 원본 이미지를 그대로 정면(Front)으로 고정했습니다.");
      } else {
        setFrontInferenceStatus("🔍 측면/다각도 뷰 감지: 정면 뷰를 정밀하게 추론하여 생성하고 있습니다...");
        const inferredBase64 = await generateFrontView(sourceImage, nameToUse);
        setFrontImage(inferredBase64);
        setFrontInferenceStatus("🎨 정면 복원 완료: 측면 이미지를 기반으로 정면(Front) 뷰를 새로 생성하여 고정했습니다.");
      }
    } catch (e: any) {
      console.error("Front view inference failed", e);
      const msg = typeof e?.message === "string" && e.message.trim() ? e.message : "정면 추론 중 오류가 발생했습니다.";
      alert(msg);
      setFrontImage(sourceImage);
      setFrontInferenceStatus("⚠️ 정면 추론에 실패하여 업로드된 원본 이미지를 정면으로 기본 고정했습니다.");
    } finally {
      setIsInferringFront(false);
    }
  };

  const handleRotationChange = (axis: keyof Rotation, value: string) => {
    const numValue = parseInt(value) || 0;
    setRotation(prev => ({ ...prev, [axis]: numValue }));
  };

  const getViewpointText = () => {
    const { x, y } = rotation;
    if (x === 0 && y === 0) return "완전 정면";
    
    let txt = "";
    if (x > 5) txt += "하이 앵글 ";
    else if (x < -5) txt += "로우 앵글 ";
    else txt += "정면 높이 ";
    
    if (Math.abs(y) < 15) txt += "정면";
    else if (Math.abs(y) > 75 && Math.abs(y) < 105) txt += "완전 측면";
    else txt += "반측면";
    
    return txt;
  };

  const startProcessing = async () => {
    if (!sourceImage || !hiddenCubeRef.current) return;

    setIsProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const cubeBase64 = await toPng(hiddenCubeRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        backgroundColor: '#ffffff',
      });

      const singleUrl = await generateSingleView(frontImage || sourceImage, cubeBase64, rotation, sourceImage);
      setResults([{ url: singleUrl, title: 'Spatial Sync Result', view: `${getViewpointText()} (${rotation.x}°, ${rotation.y}°)` }]);
    } catch (e: any) {
      const msg = typeof e?.message === "string" && e.message.trim() ? e.message : "렌더링 엔진 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetouch = async () => {
    if (!retouchPrompt.trim() || results.length === 0) return;
    
    setIsRetouching(true);
    try {
      const editedUrl = await editImage(results[0].url, retouchPrompt);
      if (editedUrl) {
        setResults([{ ...results[0], url: editedUrl, title: `AI 리터칭: ${retouchPrompt}` }]);
        setRetouchPrompt('');
      }
    } catch (e) {
      console.error("Retouch failed", e);
      alert("이미지 변환에 실패했습니다.");
    } finally {
      setIsRetouching(false);
    }
  };

  const resetAll = () => {
    setSourceImage(null);
    setFrontImage(null);
    setObjectName('');
    setFrontInferenceStatus(null);
    setResults([]);
    setRotation({ x: 0, y: 0, z: 0 });
    setRetouchPrompt('');
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-6">
      <div className="fixed -left-[60000px] top-0 pointer-events-none opacity-0">
         <div className="w-[1600px] h-[1600px] bg-white flex items-center justify-center">
            <CubePreview ref={hiddenCubeRef} rotation={rotation} isForScreenshot={true} frontImage={frontImage || sourceImage} />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          {/* Top Upload Card */}
          <div className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-xl relative overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl font-bold">image</span>
                <h3 className="text-xl font-black text-gray-900 tracking-tighter">오브젝트 이미지 업로드</h3>
              </div>
              <button onClick={resetAll} className="size-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">refresh</span>
              </button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`w-full aspect-[4/2.5] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl cursor-pointer transition-all group overflow-hidden relative ${
                isDragging
                  ? 'border-primary bg-primary/5 border-solid'
                  : 'border-gray-200 hover:bg-gray-50 hover:border-primary/50'
              }`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              {sourceImage ? (
                <>
                  <img src={sourceImage} className="w-full h-full object-contain p-4 drop-shadow-lg" />
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                      <p className="text-primary font-black text-sm uppercase tracking-widest">새 이미지로 교체</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center px-6">
                  <div className={`size-12 rounded-xl flex items-center justify-center transition-transform ${
                    isDragging ? 'bg-primary/20 text-primary scale-110' : 'bg-primary/10 text-primary group-hover:scale-110'
                  }`}>
                    <span className="material-symbols-outlined text-2xl font-bold">{isDragging ? 'download' : 'upload_file'}</span>
                  </div>
                  <p className={`font-black text-xs uppercase tracking-widest ${isDragging ? 'text-primary' : 'text-gray-400'}`}>
                    {isDragging ? '여기에 놓으세요' : '클릭하거나 드래그해서 업로드'}
                  </p>
                </div>
              )}
            </div>

            {sourceImage && (
              <div className="mt-5 space-y-4 border-t border-gray-100 pt-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[13px] font-black text-gray-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-primary">label</span>
                    이 오브젝트는 무엇인가요? (선택사항)
                  </label>
                  <input 
                    type="text" 
                    value={objectName}
                    onChange={(e) => setObjectName(e.target.value)}
                    placeholder="예: 고양이 피규어, 머그컵, 운동화 등"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm placeholder:text-gray-300 transition-all"
                    disabled={isInferringFront}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInferFront}
                  disabled={isInferringFront || !objectName.trim()}
                  className="w-full h-12 bg-gray-900 hover:bg-black text-white disabled:bg-gray-100 disabled:text-gray-300 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md cursor-pointer"
                >
                  {isInferringFront ? (
                    <>
                      <div className="size-4 border-2 border-white/20 border-t-white animate-spin rounded-full"></div>
                      <span>정면 뷰 추론 및 분석 중...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                      <span>정면 뷰 추론 및 프레임 고정</span>
                    </>
                  )}
                </button>

                {frontInferenceStatus && (
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-[13px] font-medium text-gray-700 flex items-start gap-2.5 shadow-sm animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5 animate-pulse">info</span>
                    <p className="leading-relaxed whitespace-pre-line text-left">{frontInferenceStatus}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Settings Card */}
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl flex flex-col flex-1">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm shadow-primary/20">
                  <span className="material-symbols-outlined text-2xl font-bold">view_in_ar</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tighter">투영 좌표 설정</h3>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">{getViewpointText()}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-8">
              <CubePreview rotation={rotation} isForScreenshot={false} frontImage={frontImage || sourceImage} />

              <div className="space-y-8 pt-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[13px] font-bold text-gray-600">수평 회전 (Y-Spin)</span>
                    <span className="text-primary bg-primary/5 px-4 py-1 rounded-full text-[13px] font-black">{rotation.y}°</span>
                  </div>
                  <input type="range" min="-180" max="180" value={rotation.y} onChange={(e) => handleRotationChange('y', e.target.value)} />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[13px] font-bold text-gray-600">수직 기울기 (X-Tilt)</span>
                    <span className="text-primary bg-primary/5 px-4 py-1 rounded-full text-[13px] font-black">{rotation.x}°</span>
                  </div>
                  <input type="range" min="-90" max="90" value={rotation.x} onChange={(e) => handleRotationChange('x', e.target.value)} />
                </div>
              </div>
            </div>

            <button 
              onClick={startProcessing} 
              disabled={isProcessing || isRetouching || !sourceImage} 
              className="w-full h-20 bg-primary hover:bg-primary-hover text-white rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_40px_rgba(53,208,178,0.25)] active:scale-95 disabled:bg-gray-100 disabled:shadow-none disabled:text-gray-300 mt-8"
            >
              {isProcessing ? "공간 벡터 연산 중..." : "오브젝트 생성"}
            </button>
          </div>
        </div>

        {/* Right Result Panel */}
        <div className="lg:col-span-8 flex flex-col h-full">
           <div className="bg-white rounded-[3.5rem] flex flex-col p-14 shadow-2xl border border-gray-100 relative overflow-hidden flex-1 min-h-[850px]">
             <div className="flex items-center justify-between mb-12 relative z-10">
                <h3 className="text-gray-900 text-3xl font-black tracking-tighter">AI 생성 결과</h3>
                <span className="bg-[#e9fbf7] text-primary px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border border-primary/20">Vector Sync v9.1</span>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center relative z-10">
               {isProcessing || isRetouching ? (
                 <div className="flex flex-col items-center gap-10">
                    <div className="relative">
                      <div className="size-64 rounded-full border-[15px] border-gray-50 border-t-primary animate-spin shadow-xl"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[80px] text-primary animate-pulse">{isRetouching ? 'auto_fix_high' : 'view_in_ar'}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-gray-900 tracking-tight italic">
                        {isRetouching ? "이미지 리터칭 수행 중" : "3D 공간 벡터 동기화 중"}
                      </p>
                      <p className="text-gray-400 mt-2 font-medium">강아지의 시선을 정면 프레임에 고정하고 물리적 측면을 계산하고 있습니다.</p>
                    </div>
                 </div>
               ) : results.length > 0 ? (
                 <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-700">
                    <div className="relative w-full max-w-[580px] aspect-square bg-[#fcfcfc] rounded-[4rem] border border-gray-50 shadow-inner flex items-center justify-center p-12 group mb-8">
                       <img src={results[0].url} className="max-w-full max-h-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.15)] transition-transform group-hover:scale-[1.03] duration-500" />
                       <div className="absolute top-8 right-8">
                          <span className="bg-black/80 backdrop-blur-md shadow-lg px-5 py-2.5 rounded-2xl text-[11px] font-black text-white flex items-center gap-2">
                             <span className="material-symbols-outlined text-lg text-primary">layers</span>
                             {results[0].view}
                          </span>
                       </div>
                    </div>
                    
                    <div className="w-full max-w-[600px] flex flex-col gap-6">
                      <button onClick={() => {
                          const link = document.createElement('a');
                          link.href = results[0].url;
                          link.download = `rotation_ai_result.png`;
                          link.click();
                        }} className="w-full flex items-center justify-center gap-4 bg-gray-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95">
                        <span className="material-symbols-outlined text-2xl">download</span>
                        고해상도 이미지 저장
                      </button>

                      {/* Retouching Input Area */}
                      <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-2">
                          <span className="material-symbols-outlined text-primary text-xl">auto_fix_high</span>
                          <span className="text-[13px] font-black text-gray-700 uppercase tracking-tight">AI 리터칭 및 추가 변환</span>
                        </div>
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={retouchPrompt}
                            onChange={(e) => setRetouchPrompt(e.target.value)}
                            placeholder="예: '재질을 금속으로 변경', '네온 효과 추가'"
                            className="flex-1 bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm placeholder:text-gray-300"
                            onKeyDown={(e) => e.key === 'Enter' && handleRetouch()}
                          />
                          <button 
                            onClick={handleRetouch}
                            disabled={!retouchPrompt.trim() || isRetouching}
                            className="bg-primary text-white px-8 rounded-2xl font-black text-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
                          >
                            적용
                          </button>
                        </div>
                      </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-10 text-center">
                    <div className="relative flex items-center justify-center">
                      <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary animate-pulse">
                        <path d="M50 10C50 32.0914 67.9086 50 90 50C67.9086 50 50 67.9086 50 90C50 67.9086 32.0914 50 10 50C32.0914 50 50 32.0914 50 10Z" fill="currentColor" />
                        <path d="M15 15C15 21.6274 20.3726 27 27 27C20.3726 27 15 32.3726 15 39C15 32.3726 9.62742 27 3 27C9.62742 27 15 21.6274 15 15Z" fill="currentColor" className="opacity-60" />
                        <path d="M80 75C80 79.4183 83.5817 83 88 83C83.5817 83 80 86.5817 80 91C80 86.5817 76.4183 83 72 83C76.4183 83 80 79.4183 80 75Z" fill="currentColor" className="opacity-40" />
                      </svg>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[26px] font-black text-gray-400 tracking-tighter">이미지를 업로드하고 생성을 시작해 보세요</h4>
                      <p className="text-gray-300 font-bold text-lg">AI가 당신의 이미지를 완벽한 3D 시점으로 변환합니다</p>
                    </div>
                 </div>
               )}
             </div>

             <div className="absolute -bottom-20 -right-20 size-[600px] bg-primary/5 rounded-full blur-[100px] -z-0"></div>
           </div>
        </div>
      </div>
    </div>
  );
};
