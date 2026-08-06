import { useEffect, useRef, useState } from 'react';
import {
  getApiKeys,
  setApiKey,
  validateApiKeys,
  type ApiKeys,
} from '../../lib/apiKeys';
import { useViewportScale } from '../../hooks/useViewportScale';

const ASSET = '/renewal/apikey';
const PANEL_WIDTH = 818;

/** Chrome/비밀번호 관리자가 username으로 저장하는 고정 라벨 (실제 계정 ID 아님). */
const GOOGLE_KEY_USERNAME = 'gamja-google-api-key';
const OPENAI_KEY_USERNAME = 'gamja-openai-api-key';

/** 비밀번호 관리자용 username 필드 — 화면에 보이지 않지만 DOM에는 유지 */
function PasswordManagerUsername({
  id,
  name,
  value,
  autoComplete,
}: {
  id: string;
  name: string;
  value: string;
  autoComplete: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      autoComplete={autoComplete}
      value={value}
      readOnly
      tabIndex={-1}
      aria-hidden="true"
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
    />
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  onRegistered?: (keys: ApiKeys) => void;
  /** 무효 키 등으로 재등록을 유도할 때 상단 빨간 안내 */
  errorBanner?: string | null;
};

function FieldUnderline({ active }: { active: boolean }) {
  return (
    <div
      className="h-[2px] w-full"
      style={{ background: active ? '#22c55e' : '#000' }}
    />
  );
}

export default function ApiKeyModal({
  open,
  onClose,
  onRegistered,
  errorBanner = null,
}: Props) {
  const { scale } = useViewportScale(PANEL_WIDTH + 48);
  const [keys, setKeys] = useState<ApiKeys>(() => getApiKeys());
  const [openaiExpanded, setOpenaiExpanded] = useState(false);
  const [googleRegistered, setGoogleRegistered] = useState(() => Boolean(getApiKeys().google));
  const [openaiRegistered, setOpenaiRegistered] = useState(() => Boolean(getApiKeys().openai));
  const [localError, setLocalError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const googleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const stored = getApiKeys();
    setKeys(stored);
    setLocalError(errorBanner);
    setValidating(false);
    // 무효 키로 다시 뜬 경우 등록완료 표시를 풀고 재입력을 유도
    if (errorBanner) {
      setGoogleRegistered(false);
      setOpenaiRegistered(false);
    } else {
      setGoogleRegistered(Boolean(stored.google));
      setOpenaiRegistered(Boolean(stored.openai));
    }
    setOpenaiExpanded(Boolean(stored.openai));

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !validating) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => googleInputRef.current?.focus(), 80);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose, errorBanner]);

  if (!open) return null;

  const googleDraft = keys.google.trim();
  const openaiDraft = keys.openai.trim();
  const hasPendingInput =
    (Boolean(googleDraft) && !googleRegistered) ||
    (Boolean(openaiDraft) && !openaiRegistered);
  const displayError = localError || errorBanner;
  const hasErrorBanner = Boolean(displayError);
  const contentOffset = hasErrorBanner ? 40 : 0;

  const panelHeight =
    (openaiExpanded ? 433 : 312) +
    (hasPendingInput || validating ? 64 : 0) +
    contentOffset;
  const fittedScale = Math.min(scale, 1);

  const commitAll = async () => {
    if (validating) return;
    if (!googleDraft && !openaiDraft) {
      setLocalError('검증할 API Key를 입력해 주세요.');
      return;
    }

    setValidating(true);
    setLocalError(null);

    const result = await validateApiKeys({
      google: googleDraft,
      openai: openaiDraft,
    });

    setValidating(false);

    if (!result.ok) {
      const reason =
        result.google?.message ||
        result.openai?.message ||
        result.message ||
        'API Key 검증에 실패했습니다. 다시 등록해 주세요.';
      setLocalError(reason);
      setGoogleRegistered(false);
      setOpenaiRegistered(false);
      return;
    }

    setApiKey('google', googleDraft);
    setApiKey('openai', openaiDraft);
    setGoogleRegistered(Boolean(googleDraft));
    setOpenaiRegistered(Boolean(openaiDraft));
    setLocalError(null);
    onRegistered?.(getApiKeys());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4"
      onClick={() => {
        if (!validating) onClose();
      }}
      role="presentation"
    >
      <div
        className="relative"
        style={{
          width: PANEL_WIDTH * fittedScale,
          height: panelHeight * fittedScale,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="API Key 입력"
          className="absolute left-0 top-0 overflow-hidden rounded-[24px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          style={{
            width: PANEL_WIDTH,
            height: panelHeight,
            transform: `scale(${fittedScale})`,
            transformOrigin: 'top left',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {/*
            form + 숨김 username: Chrome/비밀번호 관리자가 로그인처럼 저장·자동완성.
            키는 여전히 우리 서버에 저장하지 않고, 등록 후 sessionStorage만 사용.
          */}
          <form
            className="absolute inset-0"
            autoComplete="on"
            method="post"
            action="#"
            onSubmit={(event) => {
              event.preventDefault();
              if (hasPendingInput || validating) void commitAll();
            }}
          >
            <button
              type="button"
              aria-label="닫기"
              disabled={validating}
              onClick={onClose}
              className="absolute right-[9px] top-[9px] z-10 flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full disabled:cursor-wait disabled:opacity-50"
            >
              <img src={`${ASSET}/007-Ellipse-2.svg`} alt="" className="absolute inset-0 h-full w-full" />
              <img src={`${ASSET}/008-icon.svg`} alt="" className="relative h-[14px] w-[14px]" />
            </button>

            {hasErrorBanner ? (
              <p
                role="alert"
                className="absolute left-[86px] right-[60px] top-[46px] text-[15px] font-semibold leading-snug tracking-[-0.3px] text-[#ef4444]"
              >
                {displayError}
              </p>
            ) : null}

            {/* Google: 라벨 → 입력 → 밑줄 */}
            <div
              className="absolute left-[86px] w-[646px]"
              style={{ top: 83 + contentOffset }}
            >
              <div className="flex items-center gap-2">
                <img
                  src={`${ASSET}/002-Google-API-KEY.svg`}
                  alt="Google API KEY"
                  className="h-[20px] w-[233px]"
                  draggable={false}
                />
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Google Cloud Console 열기"
                  title="Google Cloud Console"
                  className="inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border border-black text-[11px] font-bold leading-none text-black transition-opacity hover:opacity-70"
                  onClick={(event) => event.stopPropagation()}
                >
                  !
                </a>
              </div>
              <div className="relative mt-[18px] flex items-center gap-3">
                <PasswordManagerUsername
                  id="gamja-google-api-username"
                  name="gamja-google-api-username"
                  value={GOOGLE_KEY_USERNAME}
                  autoComplete="section-gamja-google username"
                />
                <label htmlFor="gamja-google-api-password" className="sr-only">
                  Google API Key
                </label>
                <input
                  ref={googleInputRef}
                  id="gamja-google-api-password"
                  name="gamja-google-api-password"
                  type="password"
                  autoComplete="section-gamja-google current-password"
                  spellCheck={false}
                  disabled={validating}
                  value={keys.google}
                  placeholder="Google / Gemini API Key"
                  onChange={(event) => {
                    setGoogleRegistered(false);
                    setLocalError(null);
                    setKeys((prev) => ({ ...prev, google: event.target.value }));
                  }}
                  className="h-[28px] w-full border-0 bg-transparent text-[18px] font-medium tracking-[-0.4px] outline-none placeholder:text-black/25 disabled:opacity-60"
                  style={{ color: googleRegistered && keys.google ? '#22c55e' : '#000' }}
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
              <div className="mt-[8px]">
                <FieldUnderline active={googleRegistered && Boolean(keys.google)} />
              </div>
            </div>

            {/* OpenAI: 접힘 / 펼침 모두 입력 아래 밑줄 */}
            {!openaiExpanded ? (
              <button
                type="button"
                onClick={() => setOpenaiExpanded(true)}
                disabled={validating}
                className="absolute left-[86px] flex cursor-pointer items-center gap-2 disabled:opacity-60"
                style={{ top: 211 + contentOffset }}
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
              <div
                className="absolute left-[86px] w-[646px]"
                style={{ top: 211 + contentOffset }}
              >
                <button
                  type="button"
                  onClick={() => setOpenaiExpanded(false)}
                  disabled={validating}
                  className="flex cursor-pointer items-center gap-2 disabled:opacity-60"
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
                  <img
                    src={`${ASSET}/006-asset.svg`}
                    alt=""
                    className="ml-1 h-[8px] w-[15px] rotate-90"
                    draggable={false}
                  />
                </button>
                <div className="relative mt-[18px] flex items-center gap-3">
                  <PasswordManagerUsername
                    id="gamja-openai-api-username"
                    name="gamja-openai-api-username"
                    value={OPENAI_KEY_USERNAME}
                    autoComplete="section-gamja-openai username"
                  />
                  <label htmlFor="gamja-openai-api-password" className="sr-only">
                    OpenAI API Key
                  </label>
                  <input
                    id="gamja-openai-api-password"
                    name="gamja-openai-api-password"
                    type="password"
                    autoComplete="section-gamja-openai current-password"
                    spellCheck={false}
                    disabled={validating}
                    value={keys.openai}
                    placeholder="OpenAI API Key (optional)"
                    onChange={(event) => {
                      setOpenaiRegistered(false);
                      setLocalError(null);
                      setKeys((prev) => ({ ...prev, openai: event.target.value }));
                    }}
                    className="h-[28px] w-full border-0 bg-transparent text-[18px] font-medium tracking-[-0.4px] outline-none placeholder:text-black/25 disabled:opacity-60"
                    style={{ color: openaiRegistered && keys.openai ? '#22c55e' : '#000' }}
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
                <div className="mt-[8px]">
                  <FieldUnderline active={openaiRegistered && Boolean(keys.openai)} />
                </div>
              </div>
            )}

            <img
              src={`${ASSET}/001-AI-OpenAI-Google-API-API-Key.svg`}
              alt="* AI 서비스 이용에 따라 별도의 API 사용 요금이 지불될 수 있습니다. * 감자연구소는 사용자의 API Key를 서버에 보관하거나 저장하지 않습니다."
              className={`absolute right-[28px] h-[30px] w-[331px] ${
                hasPendingInput || validating ? 'bottom-[86px]' : 'bottom-[22px]'
              }`}
              draggable={false}
            />

            {hasPendingInput || validating ? (
              <div className="absolute inset-x-0 bottom-[22px] flex justify-center">
                <button
                  type="submit"
                  disabled={validating}
                  className="flex h-[44px] min-w-[140px] cursor-pointer items-center justify-center rounded-full bg-black px-10 text-[16px] font-semibold tracking-[-0.3px] text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-wait disabled:opacity-70"
                >
                  {validating ? '검증 중…' : '등록'}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
