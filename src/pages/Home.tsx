import { motion } from 'motion/react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ASSET_BASE = '/page1/image';

type HomeCard = {
  key: string;
  title: string;
  desc: string;
  background: string;
  illustration?: string;
  badge?: string;
  to?: string;
  dark?: boolean;
  customIllustration?: 'text-swap';
};

const tools: HomeCard[] = [
  {
    key: 'rotation',
    title: 'Rotation',
    desc: '오브젝트를 정교하게 회전시킵니다',
    background: `${ASSET_BASE}/014-2.svg`,
    illustration: `${ASSET_BASE}/016-icon_rotaiton.png`,
    to: '/service/multiview',
  },
  {
    key: 'object-creator',
    title: 'Object Creator',
    desc: '오브젝트를 생성합니다',
    background: `${ASSET_BASE}/018-2.svg`,
    illustration: `${ASSET_BASE}/019-icon_object.png`,
    to: '/service/creator-object',
  },
  {
    key: 'upscaler',
    title: 'UpScaler',
    desc: '화질을 더 선명하게 업스케일 합니다',
    background: `${ASSET_BASE}/022-2.svg`,
    illustration: `${ASSET_BASE}/024-9.png`,
  },
  {
    key: 'logo-maker',
    title: '로고작업실',
    desc: '서비스에 맞는 로고를 제작합니다',
    background: `${ASSET_BASE}/026-2.svg`,
    illustration: `${ASSET_BASE}/027-Mask-group.svg`,
    to: '/service/logo-maker',
  },
  {
    key: 'text-swap',
    title: '의자뺏기',
    desc: '텍스트 검수 및 텍스트를 교체합니다',
    background: `${ASSET_BASE}/029-2.svg`,
    customIllustration: 'text-swap',
  },
  {
    key: 'camera-prompt',
    title: '봉준호',
    desc: '카메라 앵글에 대한 프롬프트를 알려줍니다',
    background: `${ASSET_BASE}/037-2.svg`,
    illustration: `${ASSET_BASE}/038-Group-3.svg`,
  },
  {
    key: 'scene-creteor',
    title: 'Scene Creteor',
    desc: '스토리보드로 장면을 생성합니다',
    background: `${ASSET_BASE}/040-2.svg`,
    illustration: `${ASSET_BASE}/042-icon_sb.png`,
    badge: `${ASSET_BASE}/044-beta.svg`,
    to: '/service/storyboard-director',
  },
];

const labcordPosts = [
  '‘UpScaler’ 인식 불가한 부분까지 인식하게 만들어 업스케일 구현 - 영채 연구원',
  '클링 3.0 흔들림 방지와 보정 방법 - 감쟈 연구원',
  '감쟈&영채 vs 제미나이&GPT 토론 배틀 (a.k.a. AI와 싸운 썰) - 감쟈,영채 연구원',
  '미래 도시 ‘무한’, 그곳은 어디인가? 감자 연구소 ‘무한’ 워크샵 이야기 - 감쟈 연구원',
  '나도 모르는 카메라 앵글 용어를 AI에게 학습시킨 노하우 - 영경 연구원',
  'AI가 제대로 구현하지 못하는 물리, “Rotation”은 어떻게? - 감쟈 연구원',
  '감정컨트롤 보조도구로써의 AI 활용의 건 - 영채 연구원',
];

const supporters = [
  { label: 'Figma', desc: '맞춤 용량 추출 도우미', accent: '#b58aff', chip: '#f1ddff' },
  { label: 'After Effect', desc: '맞춤 용량 추출 도우미', accent: '#00aff7', chip: '#d7f4ff' },
  { label: 'Photoshop', desc: '맞춤 용량 추출 도우미', accent: '#00d46b', chip: '#d9ffe9' },
  { label: 'Illustrator', desc: '맞춤 용량 추출 도우미', accent: '#ff5c08', chip: '#ffe3d1' },
  { label: 'Office', desc: '맞춤 용량 추출 도우미', accent: '#ff001e', chip: '#ffdfe5' },
  { label: 'Etc', desc: '맞춤 용량 추출 도우미', accent: '#ffffff', chip: '#2c2c31', dark: true },
];

function ToolIllustration({ tool }: { tool: HomeCard }) {
  if (tool.customIllustration === 'text-swap') {
    return (
      <div className="relative flex h-[124px] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[26px] border border-black/10 bg-black/4">
        <div className="absolute inset-x-5 top-3 h-[4px] rounded-full bg-black" />
        <div className="absolute inset-x-6 top-7 h-[4px] rounded-full bg-black/45" />
        <div className="absolute inset-x-6 bottom-7 h-[4px] rounded-full bg-black/45" />
        <div className="absolute inset-x-5 bottom-3 h-[4px] rounded-full bg-black" />
        <div className="absolute bottom-1 left-4 h-4 w-4 rounded-full bg-black" />
        <div className="absolute right-4 top-1 h-4 w-4 rounded-full bg-black" />
        <div className="relative bg-white/20 px-6 py-2 text-[48px] font-medium tracking-[-0.08em] text-black/90">
          TEXT
        </div>
      </div>
    );
  }

  if (!tool.illustration) {
    return null;
  }

  return (
    <img
      src={tool.illustration}
      alt={tool.title}
      className="max-h-[196px] w-auto max-w-[78%] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
      loading="lazy"
    />
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef1ef] text-[#0b0f1a]">
      <div
        className="absolute inset-x-0 top-0 h-[1180px] bg-top bg-no-repeat opacity-95"
        style={{
          backgroundImage: `url(${ASSET_BASE}/001-bg.svg)`,
          backgroundSize: 'cover',
        }}
      />

      <main className="relative mx-auto flex w-full max-w-[1520px] flex-col gap-14 px-4 pb-12 pt-4 md:px-8 md:pb-20 md:pt-8">
        <section className="relative overflow-hidden rounded-[44px] px-6 pb-8 pt-8 md:min-h-[820px] md:px-14 md:pb-16 md:pt-12">
          <img
            src={`${ASSET_BASE}/002-1.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-[4%] top-8 hidden w-[520px] max-w-[38vw] select-none md:block"
          />
          <img
            src={`${ASSET_BASE}/003-0.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-[58%] top-5 hidden w-[400px] max-w-[30vw] -translate-x-1/2 select-none md:block"
          />

          <div className="relative z-10 flex max-w-[760px] flex-col gap-6 pt-4 md:pt-10">
            <div className="inline-flex w-fit items-center rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-bold tracking-[0.22em] text-black/55 uppercase backdrop-blur-sm">
              GAMJA AI LAB
            </div>

            <div className="space-y-2">
              <img
                src={`${ASSET_BASE}/051-Gamjas.svg`}
                alt="Gamjas"
                className="h-auto w-[220px] md:w-[320px]"
              />
              <img
                src={`${ASSET_BASE}/050-AI-LAB.svg`}
                alt="AI LAB"
                className="h-auto w-full max-w-[720px]"
              />
              <img
                src={`${ASSET_BASE}/052-SINCE-2026.png`}
                alt="Since 2026"
                className="h-auto w-[120px] md:w-[176px]"
              />
            </div>

            <p className="max-w-[520px] text-sm font-medium leading-7 text-black/60 md:text-lg md:leading-8">
              감쟈 연구소의 메인 화면을 새 디자인 기준으로 구성했습니다. 아래 카드에서
              Rotation, LogoMaker, CreatorObject, StoryboardDirector로 바로 이동할 수 있습니다.
            </p>
          </div>
        </section>

        <section className="relative">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool, idx) => {
              const clickable = Boolean(tool.to);
              return (
                <motion.button
                  key={tool.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && navigate(tool.to!)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={[
                    'group relative h-[304px] overflow-hidden rounded-[34px] border border-black/8 p-0 text-left shadow-[0_20px_50px_rgba(0,0,0,0.08)]',
                    clickable ? 'cursor-pointer' : 'cursor-default',
                  ].join(' ')}
                >
                  <img
                    src={tool.background}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {tool.badge ? (
                    <img
                      src={tool.badge}
                      alt=""
                      aria-hidden="true"
                      className="absolute left-4 top-4 h-6 w-auto"
                    />
                  ) : null}

                  <div className="relative z-10 flex h-full flex-col px-5 pb-4 pt-5">
                    <div className="flex flex-1 items-center justify-center">
                      <ToolIllustration tool={tool} />
                    </div>

                    <div className="space-y-1">
                      <div className="text-[28px] font-extrabold tracking-[-0.05em] text-black">
                        {tool.title}
                      </div>
                      <div className="text-[18px] font-medium leading-snug tracking-[-0.04em] text-black/72">
                        {tool.desc}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[11px] font-black tracking-[0.24em] text-black/35 uppercase">
                        {clickable ? 'ready' : 'coming soon'}
                      </span>
                      <span
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/65 text-black transition-all',
                          clickable ? 'group-hover:bg-black group-hover:text-white' : 'opacity-60',
                        ].join(' ')}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-[44px] border border-black/8 bg-[#f5f3ea] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:px-10 md:py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <img
              src={`${ASSET_BASE}/048-LABcord.png`}
              alt="LABcord"
              className="h-auto w-[170px] md:w-[234px]"
            />
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-black/60"
            >
              더보기 <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            className="rounded-[32px] border border-black/8 bg-white/35 px-4 py-4 md:px-8 md:py-8"
            style={{
              backgroundImage: `url(${ASSET_BASE}/046-frame.svg)`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
            }}
          >
            <div className="space-y-3">
              {labcordPosts.map((post) => (
                <div
                  key={post}
                  className="flex flex-col gap-2 rounded-[22px] border-b border-black/8 py-4 last:border-b-0 md:flex-row md:items-start md:justify-between md:gap-8"
                >
                  <div className="text-base font-semibold tracking-[-0.04em] text-black/88 md:text-[26px] md:leading-[1.25]">
                    {post}
                  </div>
                  <div className="shrink-0 text-sm font-medium text-black/45 md:pt-1 md:text-2xl">
                    26.05.21
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[44px] border border-black/8 bg-[#f4f1e8] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.05)] md:px-10 md:py-10">
          <img
            src={`${ASSET_BASE}/004-Tool-Supporter.png`}
            alt="Tool Supporter"
            className="mb-7 h-auto w-[220px] md:w-[354px]"
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {supporters.map((item) => (
              <div
                key={item.label}
                className="relative min-h-[168px] overflow-hidden rounded-[26px] border border-black/8 bg-white px-6 py-5 shadow-[0_14px_35px_rgba(0,0,0,0.05)]"
              >
                <div
                  className="inline-flex items-center rounded-[20px] px-5 py-2 text-2xl font-bold tracking-[-0.04em]"
                  style={{
                    backgroundColor: item.chip,
                    color: item.dark ? '#ffffff' : item.accent,
                  }}
                >
                  {item.label}
                </div>
                <p className="mt-6 max-w-[220px] text-xl font-bold tracking-[-0.04em] text-black/85">
                  {item.desc}
                </p>
                <div
                  className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: item.dark ? '#ffffff' : item.accent,
                    color: item.dark ? '#0b0f1a' : '#ffffff',
                  }}
                >
                  <ChevronRight className="h-7 w-7" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer
          className="relative overflow-hidden rounded-[44px] px-6 py-14 text-white md:px-10 md:py-20"
          style={{
            backgroundColor: '#0a0d12',
            backgroundImage: `url(${ASSET_BASE}/049-asset.svg)`,
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        >
          <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-center">
            <img
              src={`${ASSET_BASE}/051-Gamjas.svg`}
              alt="Gamjas"
              className="h-auto w-[180px] invert md:w-[260px]"
            />
            <img
              src={`${ASSET_BASE}/050-AI-LAB.svg`}
              alt="AI LAB"
              className="h-auto w-full max-w-[620px] invert"
            />
            <img
              src={`${ASSET_BASE}/052-SINCE-2026.png`}
              alt="Since 2026"
              className="mt-2 h-auto w-[120px] opacity-80 md:w-[160px]"
            />
          </div>
        </footer>
      </main>
    </div>
  );
}

