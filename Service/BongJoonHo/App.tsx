import { useCallback, useEffect, useRef, useState } from 'react';
import type { CinematicAnalysis, ViewState } from './types';
import { SYSTEM_VERSION } from './constants';
import { analyzeCurrentView } from './services/geminiService';
import Visualizer from './components/Visualizer';
import ServiceBackButton from '../../src/components/renewal/ServiceBackButton';

const INITIAL_VIEW_STATE: ViewState = {
  rotateX: 10,
  rotateY: 0,
  zoom: 1,
};

const INITIAL_ANALYSIS: CinematicAnalysis = {
  angle: '데이터 수신 중',
  shotType: '중립적 상태',
  meaning: '봉준호를 드래그하여 시각적 구도를 변경해보세요.',
  symbolism: '움직임을 멈추면 기술적 분석이 시작됩니다.',
  status: 'IDLE',
};

export default function BongJoonHoApp() {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [analysis, setAnalysis] = useState<CinematicAnalysis>(INITIAL_ANALYSIS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef<number | null>(null);

  const runAnalysis = useCallback(async (state: ViewState) => {
    setIsAnalyzing(true);
    setAnalysis((prev) => ({ ...prev, status: 'ANALYZING' }));

    const result = await analyzeCurrentView(state);
    setAnalysis(result);
    setIsAnalyzing(false);
  }, []);

  const handleInteractionStart = () => {
    if (analysisTimeoutRef.current) {
      window.clearTimeout(analysisTimeoutRef.current);
    }
  };

  const handleInteractionEnd = (state: ViewState) => {
    if (analysisTimeoutRef.current) {
      window.clearTimeout(analysisTimeoutRef.current);
    }
    analysisTimeoutRef.current = window.setTimeout(() => {
      void runAnalysis(state);
    }, 1000);
  };

  useEffect(() => {
    void runAnalysis(INITIAL_VIEW_STATE);

    return () => {
      if (analysisTimeoutRef.current) {
        window.clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [runAnalysis]);

  return (
    <div className="relative flex h-screen w-full bg-white text-slate-900">
      <div className="absolute left-6 top-6 z-30">
        <ServiceBackButton variant="bong" />
      </div>

      <div className="relative h-full w-3/5 border-r border-slate-200">
        <Visualizer
          viewState={viewState}
          isAnalyzing={isAnalyzing}
          onInteractionStart={handleInteractionStart}
          onInteractionEnd={handleInteractionEnd}
          onUpdateState={setViewState}
        />
      </div>

      <div className="flex h-full w-2/5 flex-col overflow-y-auto bg-white">
        <div className="flex items-start justify-between p-10 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              봉준호 <span className="text-primary italic">Engine</span>
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400">{SYSTEM_VERSION}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                Subject Status
              </p>
              <p className="text-xs font-bold text-primary">In Frame</p>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 px-10">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Pitch (X)</p>
            <p className="text-sm font-black text-slate-900">{viewState.rotateX.toFixed(0)}deg</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Yaw (Y)</p>
            <p className="text-sm font-black text-slate-900">{viewState.rotateY.toFixed(0)}deg</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase text-slate-400">Zoom (Z)</p>
            <p className="text-sm font-black text-slate-900">{viewState.zoom.toFixed(1)}x</p>
          </div>
        </div>

        <div className="flex-grow px-10 py-4">
          <div className="group relative min-h-[500px] overflow-hidden rounded-3xl border border-primary/10 bg-[#f0fdf4] p-8 shadow-inner">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 bg-primary/10 blur-[60px] transition-all duration-700" />

            <div className="mb-10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Visual Analysis
              </span>
              <span
                className={`rounded-full border-2 px-4 py-1.5 text-[10px] font-black transition-colors duration-500 ${
                  analysis.status === 'ACTIVE'
                    ? 'border-primary bg-primary text-slate-900'
                    : 'animate-pulse border-slate-200 bg-transparent text-slate-400'
                }`}
              >
                {isAnalyzing ? 'PROMPT' : analysis.status}
              </span>
            </div>

            <div className="space-y-10">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Technical Angle / 각도
                </label>
                <h2 className="text-4xl font-black leading-tight text-slate-900">
                  {isAnalyzing ? '계산 중...' : analysis.angle}
                </h2>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Framing Type / 프레이밍
                </label>
                <h2 className="text-4xl font-black leading-tight text-slate-900">
                  {isAnalyzing ? '...' : analysis.shotType}
                </h2>
              </div>

              <div className="space-y-4 border-t border-slate-200/50 pt-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                    Composition Meaning
                  </label>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{analysis.meaning}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                    Visual Impression
                  </label>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {analysis.symbolism}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
