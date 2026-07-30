import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Wand2, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { upscaleImageByProvider } from './lib/upscaler';
import ServiceBackButton from '../../src/components/renewal/ServiceBackButton';
import {
  DEFAULT_UPSCALE_MODE,
  GEMINI_MODE_MODEL_LABEL,
  loadingStatusLine,
  modeDescription,
  modePublicLabel,
  modeToProvider,
  resolvePayloadModelForMode,
  type UpscaleMode,
} from './lib/upscale-mode';
import {
  MAX_OUTPUT_LONGER_SIDE,
  buildOutputSizeOverLimitHint,
  planOutputSize,
  isOutputSizeRejected,
  validateOutputSize,
  resolveGenerationLongerSide,
} from './lib/target-output';
import { ErrorBoundary } from './components/ErrorBoundary';
import { parseUpscaleRunError, type UpscaleRunErrorInfo } from './lib/upscale-run-error';
import { clearOpenAiBillingBlocked, isOpenAiBillingBlocked } from './lib/openai-api-error';
import { BUILD_ID } from './build-info';
import { MAX_USER_GUIDANCE_CHARS } from './lib/prompt';
import { createUpscaleSessionIds, downloadPureResultBlob, measureDataUrlImage } from './lib/upscale-session';
import { PixelCatInPlace } from './components/PixelCatInPlace';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<{ width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalMaxDim, setOriginalMaxDim] = useState<number>(1024);
  const [originalSize, setOriginalSize] = useState<{width: number, height: number} | null>(null);
  
  // Options
  const [scale, setScale] = useState<number>(4);
  const [upscaleMode, setUpscaleMode] = useState<UpscaleMode>(DEFAULT_UPSCALE_MODE);
  const [processingMode, setProcessingMode] = useState<UpscaleMode | null>(null);
  const [resultMode, setResultMode] = useState<UpscaleMode | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  // Custom longer-side override. If set (> 0), this trumps the scale picker — the final output's longer
  // side becomes exactly this value (preserving source aspect ratio for the shorter side).
  const [customLongerSide, setCustomLongerSide] = useState<string>("");
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [userGuidance, setUserGuidance] = useState('');
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);
  const [runError, setRunError] = useState<UpscaleRunErrorInfo | null>(null);
  const [openAiBillingBlocked, setOpenAiBillingBlocked] = useState(() => isOpenAiBillingBlocked());
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const pureResultDataUrlRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const inputImageIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const upscaleInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const previewAspectRatio = originalSize ? `${originalSize.width} / ${originalSize.height}` : undefined;

  const srcLongerSideForHint = Math.max(originalSize?.width || 0, originalSize?.height || 0);
  const customSizePx = Math.max(0, Math.round(Number(customLongerSide) || 0));
  const plannedOutput = originalSize
    ? planOutputSize(
        originalSize.width,
        originalSize.height,
        scale,
        showCustomSize && customSizePx > 0 ? customSizePx : undefined
      )
    : null;
  const outputSizeValidation = originalSize
    ? validateOutputSize(
        originalSize.width,
        originalSize.height,
        scale,
        showCustomSize && customSizePx > 0 ? customSizePx : undefined
      )
    : null;
  const outputSizeBlocked = isOutputSizeRejected(outputSizeValidation);
  const controlsLocked = isProcessing || !!resultUrl;
  const activeMode: UpscaleMode = processingMode ?? resultMode ?? upscaleMode;
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isProcessing) {
      if (mountedRef.current) setElapsedSec(0);
      return;
    }
    if (mountedRef.current) {
      setLoadingPhraseIdx(0);
      setElapsedSec(0);
    }
    const started = Date.now();
    const phraseId = window.setInterval(() => {
      if (!mountedRef.current) return;
      setLoadingPhraseIdx((i) => i + 1);
    }, 4000);
    const elapsedId = window.setInterval(() => {
      if (!mountedRef.current) return;
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => {
      window.clearInterval(phraseId);
      window.clearInterval(elapsedId);
    };
  }, [isProcessing]);

  // 모드 변경 시에만 stale debug/error 정리 — isProcessing 종료 시에는 에러 유지
  useEffect(() => {
    if (isProcessing || resultUrl) return;
    setError(null);
    setRunError(null);
    pureResultDataUrlRef.current = null;
  }, [upscaleMode]);

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const logRenderedRatio = (label: 'before' | 'after') => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const renderedRatio = img.clientWidth / img.clientHeight;
    const ratioDiff = Math.abs(renderedRatio - naturalRatio) / naturalRatio;
    console.log(`[preview-ratio:${label}] natural=${img.naturalWidth}x${img.naturalHeight} rendered=${img.clientWidth}x${img.clientHeight} diff=${ratioDiff.toFixed(4)}`);
  };

  const handleFileSelection = async (selectedFile: File) => {
    revokePreviewUrl();
    activeRequestIdRef.current = null;
    pureResultDataUrlRef.current = null;

    const { inputImageId } = createUpscaleSessionIds();
    inputImageIdRef.current = inputImageId;

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setResultUrl(null);
    setResultSize(null);
    setError(null);
    setRunError(null);
    setResultMode(null);

    const img = new Image();
    img.onload = () => {
      setOriginalSize({ width: img.width, height: img.height });
      setOriginalMaxDim(Math.max(img.width, img.height));
    };
    img.src = objectUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileSelection(e.target.files[0]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCancel = () => {
    const requestId = activeRequestIdRef.current;
    abortControllerRef.current?.abort();
    upscaleInFlightRef.current = false;
    setIsProcessing(false);
    setProcessingMode(null);
    activeRequestIdRef.current = null;
    abortControllerRef.current = null;
    const errInfo: UpscaleRunErrorInfo = {
      type: 'AbortError',
      title: '요청 취소',
      message: '업스케일 요청이 취소되었습니다.',
      hint: null,
      category: 'aborted',
      provider: upscaleMode === 'highQuality' ? 'openai' : 'gemini',
      model: resolvePayloadModelForMode(upscaleMode),
      durationMs: 0,
      retryCount: 0,
      timedOut: false,
      aborted: true,
      isBillingWarning: false,
    };
    setRunError(errInfo);
    setError(errInfo.message);
    console.info('[highQuality:cancel]', { requestId, build: BUILD_ID });
  };

  const handleUpscale = async () => {
    if (!file || !originalSize || upscaleInFlightRef.current) return;

    const validation = validateOutputSize(
      originalSize.width,
      originalSize.height,
      scale,
      showCustomSize && customSizePx > 0 ? customSizePx : undefined
    );
    if (isOutputSizeRejected(validation)) {
      return;
    }

    const mode = upscaleMode;
    const provider = modeToProvider(mode);
    const model = resolvePayloadModelForMode(mode);

    const { requestId, inputImageId } = createUpscaleSessionIds();
    inputImageIdRef.current = inputImageId;
    activeRequestIdRef.current = requestId;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    upscaleInFlightRef.current = true;

    // 결과/에러만 초기화 — input, preview, mode, scale 유지
    setResultUrl(null);
    setResultSize(null);
    setIsProcessing(true);
    setProcessingMode(mode);
    setResultMode(null);
    setError(null);
    setRunError(null);
    pureResultDataUrlRef.current = null;

    const startedAt = Date.now();
    if (mode === 'highQuality') {
      console.info('[highQuality:start]', {
        requestId,
        provider,
        model,
        selectedMode: mode,
        build: BUILD_ID,
      });
    }

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type;
      const generationLongerSide = resolveGenerationLongerSide(
        validation.longerSide,
        Math.max(originalSize.width, originalSize.height)
      );
      const generationScale = generationLongerSide / Math.max(originalSize.width, originalSize.height);

      const aiResult = await upscaleImageByProvider(
        provider,
        base64,
        mimeType,
        generationScale,
        originalSize.width,
        originalSize.height,
        originalMaxDim,
        true,
        userGuidance.trim() || undefined,
        {
          targetW: validation.targetW,
          targetH: validation.targetH,
          generationLongerSide,
          requestId,
          upscaleMode: mode,
          abortSignal: abortController.signal,
          userGuidance: userGuidance.trim() || undefined,
        }
      );

      if (activeRequestIdRef.current !== requestId) return;

      pureResultDataUrlRef.current = aiResult.dataUrl;
      setResultUrl(aiResult.dataUrl);
      setResultMode(mode);
      setError(null);
      setRunError(null);
      clearOpenAiBillingBlocked();
      setOpenAiBillingBlocked(false);

      const measured = await measureDataUrlImage(aiResult.dataUrl).catch(() => null);
      if (measured) setResultSize(measured);

      if (mode === 'highQuality') {
        console.info('[highQuality:done]', {
          requestId,
          durationMs: Date.now() - startedAt,
          provider: aiResult.provider,
          durationMsApi: aiResult.durationMs,
        });
      }
    } catch (err: unknown) {
      if (activeRequestIdRef.current !== requestId) return;

      const durationMs = Date.now() - startedAt;
      const errInfo = parseUpscaleRunError(err, mode, durationMs);
      if (mode === 'highQuality') {
        console.error('[highQuality:error]', {
          requestId,
          durationMs,
          errInfo,
          raw: err,
        });
      } else {
        console.error('[upscale:error]', { requestId, durationMs, raw: err });
      }

      setRunError(errInfo);
      setError(errInfo.message);
      if (errInfo.isBillingWarning) {
        setOpenAiBillingBlocked(true);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsProcessing(false);
        setProcessingMode(null);
        upscaleInFlightRef.current = false;
        abortControllerRef.current = null;
      }
    }
  };

  const handleDownload = async () => {
    const dataUrl = pureResultDataUrlRef.current ?? resultUrl;
    if (!dataUrl || !file) return;

    setIsDownloading(true);
    try {
      const filename = `upscaled-${Date.now()}.png`;
      await downloadPureResultBlob(dataUrl, filename);
    } catch (downloadErr) {
      console.error('[download:error]', downloadErr);
      setError('PNG 다운로드에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    revokePreviewUrl();
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setResultSize(null);
    setResultMode(null);
    setError(null);
    setRunError(null);
    setCustomLongerSide('');
    setShowCustomSize(false);
    setUserGuidance('');
    setProcessingMode(null);
    pureResultDataUrlRef.current = null;
    activeRequestIdRef.current = null;
    inputImageIdRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#0e141b] font-sans selection:bg-blue-100">
      <main 
        className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center gap-10 px-4 py-8 md:px-8"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Hero */}
        <div className="mb-6 flex flex-col items-center gap-0 pb-1 pt-1 text-center relative w-full">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <ServiceBackButton variant="upscaler" />
          </div>
          <h2 className="hero-wild-font text-3xl font-black leading-none tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
            AI 이미지 업스케일러
          </h2>
        </div>

        {/* Main Interface */}
        <div className="w-full space-y-8">
          
          {/* Upload Area */}
          {!previewUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e7edf3] bg-white p-16 transition-all hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer shadow-sm"
              >
                <div className="mb-6 w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-[#0e141b]">이미지를 드래그해서 놓거나 클릭해 선택하세요</h3>
                <p className="mb-8 text-slate-400 font-medium">JPG, PNG, WebP 지원 (최대 10MB)</p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                  파일 선택
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </motion.div>
          )}

          {/* Controls & Preview */}
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-0"
            >
              <section className="rounded-3xl border border-[#e7edf3] bg-white p-5 shadow-sm md:p-8">

              {/* Controls Bar */}
              <div className="flex flex-col gap-6 rounded-2xl border border-[#e7edf3] bg-[#fbfcff] p-5">
                <div className="flex flex-wrap items-start justify-center gap-6">
                  
                  {/* Scale Selector — fixed scales + an inline "사용자 지정" chip that swaps to a number input. */}
                  <div className="flex min-w-fit shrink-0 flex-col gap-2">
                    <span className="pl-1 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">확대 배율 <span className="text-[10px] font-normal">(긴 변 최대 {MAX_OUTPUT_LONGER_SIDE})</span></span>
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#f6f7f8] p-1">
                      {[
                        { value: 2, label: '2배' },
                        { value: 4, label: '4배' },
                        { value: 6, label: '6배' },
                        { value: 8, label: '8배' }
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            setScale(s.value);
                            setShowCustomSize(false);
                            setCustomLongerSide("");
                          }}
                          disabled={controlsLocked}
                          className={`shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-center text-sm font-bold leading-normal transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                            scale === s.value && !showCustomSize
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}

                      {/* Inline custom-size chip — same width pill as the other scale buttons; swaps to an
                          input when active so the layout doesn't shift. */}
                      {!showCustomSize ? (
                        <button
                          onClick={() => setShowCustomSize(true)}
                          disabled={controlsLocked}
                          className="shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-center text-sm font-bold leading-normal text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          title="결과 이미지의 긴 변 픽셀 크기를 직접 지정합니다. 입력하면 위 배율 옵션은 무시됩니다."
                        >
                          사용자 지정
                        </button>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 shadow-sm">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customLongerSide}
                            onChange={(e) =>
                              setCustomLongerSide(e.target.value.replace(/[^0-9]/g, ""))
                            }
                            placeholder={`1–${MAX_OUTPUT_LONGER_SIDE}`}
                            autoFocus
                            className="w-20 bg-transparent px-1 py-1 text-center text-sm font-bold leading-normal text-blue-600 outline-none placeholder:text-slate-300"
                          />
                          <span className="text-[10px] font-bold uppercase text-slate-400">px</span>
                          <button
                            onClick={() => {
                              setShowCustomSize(false);
                              setCustomLongerSide("");
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="사용자 지정 닫기"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Model */}
                  <div className="flex min-w-fit shrink-0 flex-col items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">모델</span>
                    <div className="inline-flex w-fit flex-nowrap items-center gap-1 rounded-lg bg-[#f6f7f8] p-1">
                      <button
                        type="button"
                        onClick={() => setUpscaleMode('basic')}
                        disabled={controlsLocked}
                        title={modeDescription('basic')}
                        className={`shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-center text-xs font-bold leading-normal transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          upscaleMode === 'basic'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Gemini
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpscaleMode('highQuality')}
                        disabled={controlsLocked}
                        title={modeDescription('highQuality')}
                        className={`shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-center text-xs font-bold leading-normal transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          upscaleMode === 'highQuality'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        OpenAI
                      </button>
                    </div>
                    <p className="max-w-[14rem] text-center text-[10px] font-medium leading-snug text-slate-500">
                      {modeDescription(upscaleMode)}
                    </p>
                  </div>
                </div>

                <div className="w-full">
                  <label htmlFor="user-guidance" className="mb-2 block pl-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    텍스트·로고 안내 <span className="text-[10px] font-normal normal-case">(선택 입력)</span>
                  </label>
                  <textarea
                    id="user-guidance"
                    value={userGuidance}
                    onChange={(e) => setUserGuidance(e.target.value.slice(0, MAX_USER_GUIDANCE_CHARS))}
                    disabled={controlsLocked}
                    rows={2}
                    placeholder="흐린 글자·로고 원문 (선택)"
                    className="w-full resize-y rounded-xl border border-[#e7edf3] bg-white px-4 py-3 text-sm leading-relaxed text-[#0e141b] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="mt-1.5 pl-1 text-[10px] font-medium leading-snug text-slate-500">
                    비워 두셔도 됩니다. 작은 글자가 틀릴 때는 위치와 함께 적어 주세요. (예: 박스 옆면: "스타배송")
                    {userGuidance.length > 0 && (
                      <span className="ml-1 text-slate-400">
                        {userGuidance.length}/{MAX_USER_GUIDANCE_CHARS}
                      </span>
                    )}
                  </p>
                </div>

                {(openAiBillingBlocked || runError?.isBillingWarning) && upscaleMode === 'highQuality' && (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <AlertCircle size={22} className="mt-0.5 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-sm font-bold">
                            {runError?.title ?? 'OpenAI 사용 한도 부족'}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed">
                            {runError?.message ??
                              'OpenAI API 한도·크레딧이 부족합니다. 충전과 별개로 Billing → Limits의 Hard limit도 확인해 주세요.'}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-amber-900/85">
                            {runError?.hint ??
                              'platform.openai.com → Billing → Limits에서 한도를 올리거나, 아래 버튼으로 Gemini를 사용해 주세요.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUpscaleMode('basic');
                          setError(null);
                          setRunError(null);
                        }}
                        className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        Gemini로 전환
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <motion.div className="mt-4 flex flex-col items-center gap-3">
                {plannedOutput && !outputSizeBlocked && (
                  <p className="text-center text-xs font-semibold text-slate-500">
                    {`예상 결과: ${plannedOutput.targetW} × ${plannedOutput.targetH} (긴 변 ${Math.round(plannedOutput.longerSide)}px)`}
                  </p>
                )}

                {plannedOutput && outputSizeBlocked && (
                  <p
                    role="alert"
                    className="w-full max-w-md text-center text-sm font-bold leading-relaxed text-red-600"
                  >
                    {buildOutputSizeOverLimitHint(plannedOutput.longerSide)}
                  </p>
                )}

                <button 
                  onClick={() => void handleUpscale()}
                  disabled={isProcessing || outputSizeBlocked}
                  aria-busy={isProcessing}
                  className="flex w-full max-w-md items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-90 md:min-w-[min(100%,22rem)]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Wand2 size={20} />
                      업스케일 시작
                    </>
                  )}
                </button>

                {isProcessing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm font-semibold text-slate-500 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    취소
                  </button>
                )}
              </motion.div>


              {/* Error Message */}
              {(error || runError) && (
                <div
                  className={`mt-5 rounded-xl border p-4 ${
                    runError?.isBillingWarning
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-red-100 bg-red-50 text-red-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className={`mt-0.5 shrink-0 ${runError?.isBillingWarning ? 'text-amber-600' : ''}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {runError?.title ?? (runError?.isBillingWarning ? 'OpenAI 사용량 부족' : '처리 실패')}
                      </p>
                      <p className="mt-1 font-medium">{runError?.message ?? error}</p>
                      {runError?.hint && (
                        <p className="mt-2 text-xs leading-relaxed opacity-90">{runError.hint}</p>
                      )}
                      {runError?.isBillingWarning && (
                        <button
                          type="button"
                          onClick={() => setUpscaleMode('basic')}
                          className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          Gemini로 전환
                        </button>
                      )}
                      {runError && !runError.isBillingWarning && (
                        <dl className="mt-3 grid gap-1 font-mono text-[10px] opacity-80 sm:grid-cols-2">
                          <dt className="font-bold">error type</dt><dd>{runError.type}</dd>
                          <dt className="font-bold">provider</dt><dd>{runError.provider ?? 'n/a'}</dd>
                          <dt className="font-bold">model</dt><dd>{runError.model ?? 'n/a'}</dd>
                          <dt className="font-bold">duration</dt><dd>{runError.durationMs} ms</dd>
                        </dl>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <ErrorBoundary label="비교 미리보기">
              {/* Comparison View */}
              <div className="mt-7 grid gap-6 md:grid-cols-2">
                {/* Before */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-bold text-slate-500">원본 (Before)</span>
                    <span className="text-xs text-slate-500 bg-[#e7edf3] px-2 py-1 rounded font-mono">
                      {originalSize ? `${originalSize.width} x ${originalSize.height}` : 'Original'}
                    </span>
                  </div>
                  <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-[#e7edf3] bg-[#e7edf3] shadow-sm group" style={previewAspectRatio ? { aspectRatio: previewAspectRatio } : undefined}>
                    <img 
                      src={previewUrl} 
                      alt="Original" 
                      className="w-full h-full object-contain"
                      style={originalMaxDim <= 128 ? { imageRendering: 'pixelated' } : undefined}
                      referrerPolicy="no-referrer"
                      onLoad={logRenderedRatio('before')}
                    />
                  </div>
                </div>

                {/* After */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-bold text-blue-600">결과 (After)</span>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono">
                      {resultUrl && resultSize
                        ? `${resultSize.width} x ${resultSize.height}${resultMode ? ` · ${modePublicLabel(resultMode)}` : ''}`
                        : resultUrl
                        ? 'Enhanced'
                        : isProcessing
                        ? `처리 중 (${modePublicLabel(activeMode)})…`
                        : runError
                        ? '처리 실패'
                        : 'Waiting...'}
                    </span>
                  </div>
                  <div
                    className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-blue-100 shadow-md"
                    style={{
                      backgroundColor: '#ffffff',
                      ...(previewAspectRatio ? { aspectRatio: previewAspectRatio } : {}),
                    }}
                  >
                    {resultUrl ? (
                      <>
                        <img
                          src={resultUrl}
                          alt="Result"
                          className="h-full w-full object-contain"
                          style={{ imageRendering: 'auto' }}
                          referrerPolicy="no-referrer"
                          onLoad={logRenderedRatio('after')}
                        />
                      </>
                    ) : isProcessing ? (
                      <div
                        className="flex w-full max-w-xs flex-col items-center gap-3 px-4 py-8"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <PixelCatInPlace />
                        <p className="text-center text-sm font-bold leading-relaxed text-slate-600">
                          {loadingStatusLine(activeMode, elapsedSec, loadingPhraseIdx)}
                        </p>
                      </div>
                    ) : runError ? (
                      <div
                        className={`flex flex-col items-center justify-center gap-3 px-4 py-8 ${
                          runError.isBillingWarning ? 'text-amber-800' : 'text-red-600'
                        }`}
                      >
                        <AlertCircle size={40} className="opacity-80" />
                        <p className="text-sm font-bold">{runError.title}</p>
                        <p className="max-w-xs text-center text-sm font-medium leading-relaxed">
                          {runError.message}
                        </p>
                        {runError.hint && (
                          <p className="max-w-xs text-center text-[10px] leading-relaxed opacity-85">
                            {runError.hint}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={48} className="opacity-60" />
                        <span className="text-sm font-medium text-slate-400">
                          업스케일 시작 버튼을 눌러주세요
                        </span>
                      </>
                    )}
                    
                    {resultUrl && (
                      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        Enhanced{resultMode ? ` · ${modePublicLabel(resultMode)}` : ''}
                      </div>
                    )}
                  </div>
                  {resultUrl && resultSize && (
                    <p className="px-1 text-[10px] leading-relaxed text-slate-500">
                      미리보기는 CSS로 화면에 맞게 축소·확대됩니다 (실제 파일: {resultSize.width}×
                      {resultSize.height}px PNG).
                    </p>
                  )}
                </div>
              </div>
              </ErrorBoundary>
              </section>

              {/* Action Buttons */}
              {resultUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-6 pb-12 pt-7"
                >
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex h-14 w-full max-w-md items-center justify-center gap-3 rounded-xl bg-[#0e141b] text-lg font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl disabled:opacity-70"
                  >
                    <Download size={24} />
                    {isDownloading ? '다운로드 준비 중...' : 'PNG 이미지 다운로드'}
                  </button>

                  <div className="flex gap-6 text-sm font-medium text-slate-500">
                    <button 
                      onClick={() => {
                        setResultUrl(null);
                        setResultSize(null);
                        setResultMode(null);
                        setRunError(null);
                        setError(null);
                        pureResultDataUrlRef.current = null;
                      }}
                      className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={16} />
                      다른 배율로 다시 보기
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      onClick={handleReset}
                      className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <Upload size={16} />
                      새 이미지 업로드
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
