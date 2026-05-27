import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { generateImageMatchCopy } from '../geminiService';
import { AdBanner } from './AdBanner';

const TONES = [
  { id: 'Witty', label: '위트' },
  { id: 'Emotional', label: '감성' },
  { id: 'Impact', label: '강렬함' },
  { id: 'Dry', label: '건조함' },
  { id: 'Toss', label: '토스 감성' },
  { id: 'Baemin', label: '배민 감성' },
  { id: 'Musinsa', label: '무신사 감성' },
  { id: 'Japanese', label: '일본감성' },
];

interface GeneratedCopy {
  text: string;
  subtext: string;
}

export function ImageMatchScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);
  const [tone, setTone] = useState('Witty');
  const [maxLength, setMaxLength] = useState<number | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedCopy[]>([]);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [editableResults, setEditableResults] = useState<string[]>([]);

  useEffect(() => {
    setEditableResults(results.map((result) => result.text));
  }, [results]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.endsWith(',')) {
      const newTag = value.slice(0, -1).trim();
      if (newTag && !tagList.includes(newTag)) {
        setTagList([...tagList, newTag]);
      }
      setKeywordInput('');
      return;
    }
    setKeywordInput(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const newTag = keywordInput.trim();
      if (newTag && !tagList.includes(newTag)) {
        setTagList([...tagList, newTag]);
      }
      setKeywordInput('');
      return;
    }

    if (event.key === 'Backspace' && !keywordInput && tagList.length > 0) {
      setTagList(tagList.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTagList(tagList.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerate = async () => {
    if (!image) return;

    setIsGenerating(true);
    setResults([]);
    setErrorStatus(null);

    try {
      const keywordsString = [...tagList, keywordInput.trim()].filter(Boolean).join(', ');
      const response = await generateImageMatchCopy(
        image,
        keywordsString,
        tone,
        maxLength === '' ? null : Number(maxLength),
      );
      setResults(response.copies);
    } catch (error: any) {
      console.error(error);
      setErrorStatus(error?.message || '카피 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResultChange = (index: number, newText: string) => {
    const updated = [...editableResults];
    updated[index] = newText;
    setEditableResults(updated);
  };

  const copyAndLog = async (index: number) => {
    const finalContent = editableResults[index];
    if (!finalContent) {
      window.alert('복사할 내용이 없습니다!');
      return;
    }

    try {
      await navigator.clipboard.writeText(finalContent);
      window.alert('복사되었습니다! \n(여러분의 수정 내역이 더 똑똑한 AI를 만듭니다)');
      console.log('=== [사용자 피드백 데이터] ===');
      console.log('사용자가 최종 선택/수정한 문구:', finalContent);
      console.log('선택된 톤앤매너:', tone);
      console.log('=============================');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-10 text-left">
        <h2 className="mb-2 text-4xl font-black tracking-tight text-stone-900 dark:text-white">
          이미지 매칭
        </h2>
        <p className="text-lg font-medium text-primary/80">
          이미지의 분위기를 분석하여 자유롭고 창의적인 카피를 제안합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-6">
          <div className="relative flex min-h-[500px] flex-1 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border-light bg-white shadow-inner transition-all hover:bg-primary/5 dark:border-border-dark dark:bg-surface-dark">
            {image ? (
              <>
                <img src={image} className="h-full w-full object-cover" alt="Preview" />
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setImage(null);
                  }}
                  className="absolute right-6 top-6 z-20 rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm hover:bg-black/80"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                <div className="flex flex-col items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                  </div>
                  <div className="text-center">
                    <p className="mb-1 text-xl font-bold text-stone-900 dark:text-white">이미지 업로드</p>
                    <p className="text-sm text-stone-400">클릭하거나 파일을 드래그하세요</p>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-8 lg:col-span-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-lg font-black text-stone-900 dark:text-white">필수 키워드</span>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-light bg-white p-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-border-dark dark:bg-surface-dark">
                {tagList.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="animate-fade-in-up flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary"
                  >
                    {tag}
                    <button onClick={() => removeTag(index)} className="hover:text-red-700">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                ))}
                <input
                  className="min-w-[120px] flex-1 border-none bg-transparent p-1 text-base outline-none focus:ring-0"
                  placeholder={tagList.length === 0 ? '예: 홈플러스, 치질방지방석 (쉼표/엔터)' : ''}
                  value={keywordInput}
                  onChange={handleKeywordChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-lg font-black text-stone-900 dark:text-white">톤앤매너</span>
              <div className="grid grid-cols-4 gap-2">
                {TONES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTone(item.id)}
                    className={`rounded-xl border p-3 text-sm font-bold transition-all ${
                      tone === item.id
                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                        : 'border-border-light bg-white hover:border-primary/50 dark:border-border-dark dark:bg-surface-dark'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-stone-900 dark:text-white">
                  글자 수 제한 (엄격 준수)
                </span>
                {maxLength !== '' ? (
                  <span className="animate-pulse rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                    STRICT MODE
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={maxLength}
                  onChange={(event) =>
                    setMaxLength(event.target.value === '' ? '' : Number(event.target.value))
                  }
                  className={`w-full rounded-xl border p-4 pr-12 text-base outline-none transition-all ${
                    maxLength !== ''
                      ? 'border-primary bg-white ring-2 ring-primary/10 shadow-lg shadow-primary/5 dark:bg-surface-dark'
                      : 'border-border-light bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-surface-dark'
                  }`}
                  placeholder="비워두면 무제한으로 생성됩니다"
                />
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold ${
                    maxLength !== '' ? 'text-primary' : 'text-stone-400'
                  }`}
                >
                  자
                </span>
              </div>
              <p className="px-1 text-[10px] text-stone-400">
                공백을 포함하여 AI가 해당 글자 수 이하로 강력하게 축약합니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !image}
              className="w-full rounded-2xl bg-primary py-6 text-2xl font-black text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 hover:bg-red-700"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>의자 박살내고 재조립 중..</span>
                </div>
              ) : (
                '이미지 분석 및 카피생성'
              )}
            </button>

            <AdBanner />

            {errorStatus ? (
              <div className="animate-fade-in-up rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/20 dark:bg-red-900/10">
                <p className="mb-2 text-sm font-bold text-red-700 dark:text-red-400">
                  {errorStatus}
                </p>
                <button
                  onClick={handleGenerate}
                  className="text-xs font-black text-primary underline underline-offset-4"
                >
                  다시 시도하기
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {results.length > 0 && !errorStatus ? (
        <div className="animate-fade-in-up mt-16 border-t border-border-light pt-12 dark:border-border-dark">
          <h3 className="mb-10 flex items-center gap-3 text-3xl font-black">
            <span className="material-symbols-outlined text-4xl text-primary">auto_awesome</span>
            의자뺏기 이미지 매칭 결과
          </h3>
          <div className="grid grid-cols-1 gap-12">
            {results.map((result, index) => (
              <div
                key={`${result.text}-${index}`}
                className="flex min-h-[350px] flex-col overflow-hidden rounded-3xl border border-border-light bg-white shadow-2xl dark:border-border-dark dark:bg-surface-dark md:flex-row"
              >
                <div className="h-64 w-full overflow-hidden bg-stone-100 md:h-auto md:w-1/3">
                  <img src={image!} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" alt="Result visual" />
                </div>
                <div className="relative flex flex-1 flex-col justify-center gap-8 overflow-hidden p-10">
                  <span className="pointer-events-none absolute right-10 top-10 select-none text-primary/5">
                    <span className="material-symbols-outlined text-9xl font-black">format_quote</span>
                  </span>

                  <div className="z-10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                          Final Copy Option {index + 1}
                        </span>
                      </div>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                          editableResults[index]?.length > (maxLength || Infinity)
                            ? 'border-red-200 bg-red-50 text-red-500'
                            : 'border-stone-100 bg-stone-50 text-stone-400'
                        }`}
                      >
                        {editableResults[index]?.length} / {maxLength || '∞'}자
                      </span>
                    </div>

                    <div className="group relative">
                      <span className="absolute -left-6 top-0 text-3xl font-black text-stone-300 opacity-50">
                        "
                      </span>
                      <textarea
                        id={`resultBox-${index}`}
                        value={editableResults[index] || ''}
                        onChange={(event) => handleResultChange(index, event.target.value)}
                        className="w-full resize-none border-none bg-transparent p-0 text-4xl font-black leading-tight text-stone-900 focus:ring-0 dark:text-white"
                        rows={2}
                        spellCheck={false}
                      />
                      <span className="absolute -right-6 bottom-2 text-3xl font-black text-stone-300 opacity-50">
                        "
                      </span>
                    </div>

                    <div className="flex gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6 transition-all hover:border-primary/20 dark:border-white/5 dark:bg-white/5">
                      <span className="material-symbols-outlined mt-0.5 text-primary/40">lightbulb</span>
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap text-base leading-relaxed text-stone-500 dark:text-stone-400">
                          {result.subtext || '분석된 카피 의도가 여기에 표시됩니다.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => copyAndLog(index)}
                        className="flex items-center gap-2 rounded-full bg-stone-900 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-stone-900/10 transition-all active:scale-95 hover:scale-105 dark:bg-white dark:text-stone-900"
                      >
                        <span className="material-symbols-outlined text-lg">content_copy</span>
                        최종 카피 복사 및 피드백
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <AdBanner type="card" className="mx-auto max-w-md" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
