import { useEffect, useRef, useState } from 'react';
import { getApiKeys, setApiKey, type ApiKeys } from '../../lib/apiKeys';

const ASSET = '/renewal/apikey';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 키 등록 후 이어서 열 서비스 라우트 */
  onRegistered?: (keys: ApiKeys) => void;
};

export default function ApiKeyModal({ open, onClose, onRegistered }: Props) {
  const [keys, setKeys] = useState<ApiKeys>(() => getApiKeys());
  const [openaiExpanded, setOpenaiExpanded] = useState(false);
  const [googleRegistered, setGoogleRegistered] = useState(() => Boolean(getApiKeys().google));
  const [openaiRegistered, setOpenaiRegistered] = useState(() => Boolean(getApiKeys().openai));
  const googleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const stored = getApiKeys();
    setKeys(stored);
    setGoogleRegistered(Boolean(stored.google));
    setOpenaiRegistered(Boolean(stored.openai));
    setOpenaiExpanded(Boolean(stored.openai));

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const timer = window.setTimeout(() => googleInputRef.current?.focus(), 80);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelHeight = openaiExpanded ? 433 : 312;

  const commitGoogle = () => {
    const value = keys.google.trim();
    setApiKey('google', value);
    setGoogleRegistered(Boolean(value));
    if (value) {
      onRegistered?.(getApiKeys());
    }
  };

  const commitOpenai = () => {
    const value = keys.openai.trim();
    setApiKey('openai', value);
    setOpenaiRegistered(Boolean(value));
    onRegistered?.(getApiKeys());
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="API Key 입력"
        className="relative w-full max-w-[818px] overflow-hidden rounded-[24px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        style={{ height: panelHeight }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-[9px] top-[9px] z-10 flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full"
        >
          <img src={`${ASSET}/007-Ellipse-2.svg`} alt="" className="absolute inset-0 h-full w-full" />
          <img src={`${ASSET}/008-icon.svg`} alt="" className="relative h-[14px] w-[14px]" />
        </button>

        {/* Google API KEY */}
        <div className="absolute left-[86px] top-[83px] w-[646px]">
          <img
            src={`${ASSET}/002-Google-API-KEY.svg`}
            alt="Google API KEY"
            className="h-[20px] w-[233px]"
            draggable={false}
          />
          <img
            src={`${ASSET}/005-Vector-11.svg`}
            alt=""
            className="mt-[18px] h-[2px] w-full"
            draggable={false}
          />
          <div className="relative mt-[8px] flex items-center gap-3">
            <input
              ref={googleInputRef}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={keys.google}
              placeholder="Google / Gemini API Key"
              onChange={(event) => {
                setGoogleRegistered(false);
                setKeys((prev) => ({ ...prev, google: event.target.value }));
              }}
              onBlur={commitGoogle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitGoogle();
                  (event.target as HTMLInputElement).blur();
                }
              }}
              className="h-[28px] w-full border-0 bg-transparent text-[18px] font-medium tracking-[-0.4px] text-black outline-none placeholder:text-black/25"
            />
            {googleRegistered && keys.google ? (
              <div className="flex shrink-0 items-center gap-2">
                <img src={`${ASSET}/011-registered.svg`} alt="등록 완료" className="h-[23px] w-[54px]" />
                <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#22c55e]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path
                      d="M3 7.2L5.8 10L11 3.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* OpenAI API KEY (collapsed / expanded) */}
        {!openaiExpanded ? (
          <button
            type="button"
            onClick={() => setOpenaiExpanded(true)}
            className="absolute left-[86px] top-[211px] flex cursor-pointer items-center gap-2"
            aria-label="OpenAI API KEY 펼치기"
          >
            <img
              src={`${ASSET}/003-OpenAI-API-KEY.svg`}
              alt="OpenAI API KEY"
              className="h-[12px] w-[128px]"
              draggable={false}
            />
            <img
              src={`${ASSET}/004-asset.svg`}
              alt="(선택사항)"
              className="h-[14px] w-[49px]"
              draggable={false}
            />
            <img
              src={`${ASSET}/006-asset.svg`}
              alt=""
              className="ml-1 h-[8px] w-[15px] -rotate-90"
              draggable={false}
            />
          </button>
        ) : (
          <div className="absolute left-[86px] top-[245px] w-[646px]">
            <button
              type="button"
              onClick={() => setOpenaiExpanded(false)}
              className="flex cursor-pointer items-center gap-2"
              aria-label="OpenAI API KEY 접기"
            >
              <img
                src={`${ASSET}/003-OpenAI-API-KEY.svg`}
                alt="OpenAI API KEY"
                className="h-[20px] w-[213px]"
                draggable={false}
              />
              <img
                src={`${ASSET}/004-asset.svg`}
                alt="(선택사항)"
                className="h-[14px] w-[49px]"
                draggable={false}
              />
            </button>
            <img
              src={`${ASSET}/005-Vector-11.svg`}
              alt=""
              className="mt-[18px] h-[2px] w-full"
              draggable={false}
            />
            <div className="relative mt-[8px] flex items-center gap-3">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keys.openai}
                placeholder="OpenAI API Key (optional)"
                onChange={(event) => {
                  setOpenaiRegistered(false);
                  setKeys((prev) => ({ ...prev, openai: event.target.value }));
                }}
                onBlur={commitOpenai}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitOpenai();
                    (event.target as HTMLInputElement).blur();
                  }
                }}
                className="h-[28px] w-full border-0 bg-transparent text-[18px] font-medium tracking-[-0.4px] text-black outline-none placeholder:text-black/25"
              />
              {openaiRegistered && keys.openai ? (
                <div className="flex shrink-0 items-center gap-2">
                  <img src={`${ASSET}/011-registered.svg`} alt="등록 완료" className="h-[23px] w-[54px]" />
                  <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#22c55e]">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path
                        d="M3 7.2L5.8 10L11 3.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <img
          src={`${ASSET}/001-AI-OpenAI-Google-API-API-Key.svg`}
          alt="* AI 서비스 이용에 따라 별도의 API 사용 요금이 지불될 수 있습니다. * 감자연구소는 사용자의 API Key를 서버에 보관하거나 저장하지 않습니다."
          className="absolute right-[28px] bottom-[22px] h-[30px] w-[331px]"
          draggable={false}
        />
      </div>
    </div>
  );
}
