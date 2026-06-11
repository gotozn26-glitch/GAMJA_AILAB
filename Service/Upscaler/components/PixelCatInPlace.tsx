import { useEffect, useState } from 'react';
import { LOADING_CAT_FRAMES } from '../lib/loading-cat-frames';

const FRAME_MS = 180;

/** 로딩 중 걷는 고양이 — 고양이/1~3.png, base64 인라인 (네트워크·경로 무관) */
export const PixelCatInPlace = () => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % LOADING_CAT_FRAMES.length);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="pixel-cat-root shrink-0"
      aria-hidden
      title="로딩 중"
      role="presentation"
    >
      <div
        className="pixel-cat-sprite h-7 w-8 bg-contain bg-center bg-no-repeat md:h-8 md:w-9"
        style={{
          backgroundImage: `url("${LOADING_CAT_FRAMES[frameIndex]}")`,
        }}
      />
    </div>
  );
};
