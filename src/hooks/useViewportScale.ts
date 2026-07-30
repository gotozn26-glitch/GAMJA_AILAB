import { useEffect, useState } from 'react';

/** 피그마 기준 폭. 이보다 좁으면 UI를 비율 축소합니다. */
export const DESIGN_BASE_WIDTH = 1280;

export type ViewportScale = {
  /** 0~1 스케일 (데스크탑은 1) */
  scale: number;
  width: number;
  height: number;
  /** 좁은 화면: 스케일 대신 스택 레이아웃 권장 */
  isCompact: boolean;
};

/**
 * 뷰포트 기준 반응형 스케일.
 * - 넓은 화면: 1
 * - 좁은 화면: width / baseWidth (최대 1)
 */
export function useViewportScale(baseWidth = DESIGN_BASE_WIDTH): ViewportScale {
  const [state, setState] = useState<ViewportScale>(() => {
    if (typeof window === 'undefined') {
      return { scale: 1, width: baseWidth, height: 800, isCompact: false };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      scale: Math.min(width / baseWidth, 1),
      width,
      height,
      isCompact: width < 768,
    };
  });

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setState({
        scale: Math.min(width / baseWidth, 1),
        width,
        height,
        isCompact: width < 768,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [baseWidth]);

  return state;
}
