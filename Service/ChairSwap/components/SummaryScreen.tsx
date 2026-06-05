import { useEffect, useRef, useState } from 'react';
import { summarizeText } from '../geminiService';
import { AdBanner } from './AdBanner';

const LOADING_MESSAGES = [
  '의자를 걷어차는 중...',
  '의자를 부숴보는 중...',
  '남은 의자가 있나 찾아보는 중...',
  '의자위의 고양이를 쓰다듬는 중...',
  '의자에 joy를 표하는 중...',
  '의자를 더 잘게 부숴보는 중...',
  '의자 밑의 껌을 떼는 중...',
  '의자 위의 광고주를 쫒아내는 중...',
];

export function SummaryScreen() {
  const [targetChars, setTargetChars] = useState(15);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [results, setResults] = useState<{ summary: string; explanation: string }[] | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (isSummarizing) {
      setLoadingMessageIndex(Math.floor(Math.random() * LOADING_MESSAGES.length));
      interval = window.setInterval(() => {
        setLoadingMessageIndex(Math.floor(Math.random() * LOADING_MESSAGES.length));
      }, 2000);
    }
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [isSummarizing]);

  const handleSelectionAction = (type: 'lock' | 'replace') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const span = document.createElement('span');
    const isLock = type === 'lock';
    span.className = isLock
      ? 'locked-phrase mx-0.5 inline-flex items-center gap-1 rounded-sm border-b-2 border-primary bg-primary/20 px-1 font-bold text-primary'
      : 'replaceable-phrase mx-0.5 inline-flex items-center gap-1 rounded-sm border-b-2 border-blue-500 bg-blue-500/20 px-1 font-bold text-blue-600';

    span.setAttribute('data-phrase', selectedText);
    span.setAttribute('data-type', type);

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-[12px]';
    icon.innerText = isLock ? 'lock' : 'swap_horiz';
    span.appendChild(icon);
    span.appendChild(document.createTextNode(selectedText));

    range.deleteContents();
    range.insertNode(span);
    selection.removeAllRanges();
  };

  const handleSummarize = async () => {
    const rawText = editorRef.current?.innerText || '';
    if (!rawText.trim()) {
      window.alert('텍스트를 입력해주세요.');
      return;
    }

    setIsSummarizing(true);
    setResults(null);
    setErrorStatus(null);

    try {
      const locked: string[] = [];
      const replaceable: string[] = [];

      editorRef.current?.querySelectorAll('.locked-phrase').forEach((element) => {
        locked.push(element.getAttribute('data-phrase') || '');
      });
      editorRef.current?.querySelectorAll('.replaceable-phrase').forEach((element) => {
        replaceable.push(element.getAttribute('data-phrase') || '');
      });

      const response = await summarizeText(rawText, locked, replaceable, targetChars);
      setResults(response.results);
    } catch (error: any) {
      console.error(error);
      setErrorStatus(error?.message || '요약 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col pb-20">
      <div className="mb-10 text-left">
        <h2 className="mb-2 text-4xl font-black tracking-tight text-stone-900">
          핵심만 남기고 의자를 뺏으세요
        </h2>
        <p className="text-lg font-medium text-primary/80">
          드래그하여 보존할 단어는 <span className="font-bold underline decoration-primary/30">잠금</span>,
          유의어로 바꿀 단어는{' '}
          <span className="font-bold underline decoration-blue-500/30">교체</span>를 누르세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="relative flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-border-light bg-surface-light p-1 shadow-sm">
            <div className="flex items-center justify-between border-b border-border-light bg-white/50 px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-sub">
                Original Text
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectionAction('lock')}
                  className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
                >
                  <span className="material-symbols-outlined text-xs">lock</span>
                  잠금
                </button>
                <button
                  onClick={() => handleSelectionAction('replace')}
                  className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600"
                >
                  <span className="material-symbols-outlined text-xs">swap_horiz</span>
                  교체
                </button>
              </div>
            </div>

            <div
              ref={editorRef}
              contentEditable
              className="min-h-[300px] p-6 text-lg leading-relaxed focus:outline-none"
              data-placeholder="요약할 텍스트를 입력하세요..."
            />
          </div>

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3 rounded-xl border border-border-light bg-white px-4 py-2">
              <span className="text-sm font-bold">목표 글자 수</span>
              <input
                type="number"
                value={targetChars}
                onChange={(event) => setTargetChars(parseInt(event.target.value || '0', 10))}
                className="w-16 border-none bg-transparent p-0 text-center font-bold text-primary focus:ring-0"
              />
              <span className="text-sm">자</span>
            </div>
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-2 rounded-full bg-primary px-10 py-4 font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 hover:bg-red-700"
            >
              {isSummarizing ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : null}
              의자뺏기 시작
            </button>
          </div>

        </div>

        <div className="flex min-h-[400px] flex-col rounded-2xl border border-border-light bg-white p-6">
          <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">Results</h3>

          {errorStatus ? (
            <div className="animate-fade-in-up flex flex-1 flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
              <span className="material-symbols-outlined mb-4 text-4xl text-red-500">
                warning
              </span>
              <p className="mb-4 font-bold text-red-700">{errorStatus}</p>
              <button
                onClick={handleSummarize}
                className="font-black text-primary underline underline-offset-4 hover:text-red-800"
              >
                다시 시도하기
              </button>
            </div>
          ) : results ? (
            <div className="flex-1 space-y-6 overflow-auto">
              <div className="space-y-6">
                {results.map((result, index) => (
                  <div
                    key={`${result.summary}-${index}`}
                    className="animate-fade-in-up rounded-xl border border-stone-100 bg-stone-50 p-5"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <p className="mb-3 text-xl font-black">"{result.summary}"</p>
                    <p className="text-xs leading-relaxed text-gray-500">{result.explanation}</p>
                  </div>
                ))}
              </div>
              <AdBanner type="card" className="mt-6" />
            </div>
          ) : isSummarizing ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined animate-bounce-chair mb-4 text-6xl text-primary">
                chair_alt
              </span>
              <p className="font-bold">{LOADING_MESSAGES[loadingMessageIndex]}</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-300">
              <span className="material-symbols-outlined mb-2 text-6xl opacity-20">chair_alt</span>
              <p>의자를 뺏을 준비가 되었습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
