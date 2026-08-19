import Link from 'next/link';
import regions from '@/data/emotion_regions.json';
import words from '@/data/emotion_words.json';
import ShaderBackground from './ShaderBackground';
import AccuracyChart from './AccuracyChart';

const DATA_COMPONENTS = [
  { label: 'valence · 정서가', body: '이 감정이 얼마나 긍정적인지, 부정적인지' },
  { label: 'arousal · 각성도', body: '이 감정이 얼마나 차분한지, 격렬한지' },
  { label: 'prototypicality · 전형성', body: '이 단어가 얼마나 감정 단어답게 느껴지는지' },
  { label: 'familiarity · 친숙도', body: '사람들이 이 단어를 얼마나 익숙하게 아는지' },
];

const STEPS = [
  {
    title: '한 줄 적기',
    body: '"애인과 헤어졌을 때"처럼 상황을 적거나, 지금 드는 막연한 느낌을 그대로 문장으로 남깁니다.',
  },
  {
    title: '위치 확인하기',
    body: '지도 위 어느 자리에 놓이는지 확인합니다. 감정은 하나의 정답이 아니라, 다른 감정들과의 관계 속 한 지점입니다.',
  },
  {
    title: '이어진 길 따라가기',
    body: '가까운 감정, 반대되는 감정을 눌러가며 지금 마음과 가장 가까운 단어를 찾을 때까지 계속 발견합니다.',
  },
];

const FEATURES = [
  { title: '상황·감정으로 찾기', body: '문장이 안 떠올라도 상황을 적거나 감정 단어를 검색해 탐색을 바로 시작할 수 있습니다.' },
  { title: '감정 어휘 지도', body: '434개 단어의 위치와 관계를 한눈에 탐색하는 서비스의 핵심 차별 기능입니다.' },
  { title: '유사·관련·반대 감정 탐색', body: '비슷하지만 다른 감정을 비교하며 지금 마음에 가까운 후보를 좁혀갑니다.' },
  { title: '감정 비교·제외', body: '"비슷하지만 이건 아니다"처럼 직접 비교·제외하며, 하나의 정답을 강요하지 않습니다.' },
  { title: '감정 상세 · 실제 상황', body: '단어의 뜻과 함께 그 감정이 실제로 나타나는 상황을 보여줘 내 경험과 연결합니다.' },
  { title: '기록 · 개인 기록 관리', body: '발견한 감정과 상황을 기록하되, 그 기록은 나만 볼 수 있도록 안전하게 관리합니다.' },
];

const COMPETITORS = [
  {
    name: 'How We Feel',
    note: '감정 단어 선택·기록에 강하지만, 감정 어휘 자체를 넓히고 관계를 탐색하는 경험은 없음',
  },
  {
    name: 'Daylio',
    note: '기록 진입장벽은 가장 낮지만, "내 감정이 정확히 무엇인가"를 깊게 탐색하는 데는 약함',
  },
  {
    name: 'Finch',
    note: '게임화로 반복 사용을 유도하지만, 감정 어휘 탐색 자체는 핵심 기능이 아님',
  },
];

const regionCounts = (() => {
  const counts: Record<string, number> = {};
  for (const w of words as { region_id: string }[]) counts[w.region_id] = (counts[w.region_id] ?? 0) + 1;
  return regions
    .map((r) => ({ id: r.id, name: r.name, color: r.color, count: counts[r.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);
})();
const maxRegionCount = Math.max(...regionCounts.map((r) => r.count));

export default function LandingPage() {
  return (
    <div className="page-wrap">
      {/* Hero */}
      <section className="relative text-center enter overflow-hidden" style={{ minHeight: '40vh' }}>
        <ShaderBackground />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg-base) 96%)' }} />

        <header className="relative z-10 w-full text-left" style={{ padding: '20px 28px' }}>
          <span className="font-serif-kr text-[19px] text-parchment">감정 어휘 지도</span>
        </header>

        <div className="relative max-w-[640px] mx-auto px-6 pt-6 pb-12 md:pt-10 md:pb-16">
          <span
            className="inline-flex items-center gap-1.5 landing-mono-label text-[11px] text-amber"
            style={{ padding: '5px 13px', borderRadius: 999, border: '1px solid var(--accent-amber)', background: 'var(--accent-amber-dim)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-amber)' }} />
            EMOTION WORD MAP · RESEARCH NOTE
          </span>
          <h1 className="font-display-serif text-[34px] md:text-[48px] leading-[1.22] mt-6 tracking-tight">
            아는 단어가 많아질수록
            <br />
            <span style={{ whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--accent-amber-strong)' }}>마음의 위치</span>는 정확해집니다
            </span>
          </h1>
          <p className="text-taupe text-[15px] md:text-[16.5px] mt-6 leading-relaxed max-w-[540px] mx-auto">
            "화가 난다" 한마디에는 억울함도, 서러움도, 짜증도 뭉쳐 있습니다. 감정 어휘 지도는 이런 결을
            나눠 이름 붙인 434개 단어로, 어휘를 넓힐수록 지금 마음을 더 정밀하게 짚을 수 있도록 돕습니다.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 landing-mono-label text-[11px] text-dim flex-wrap">
            <span>434개 단어</span>
            <span aria-hidden="true">·</span>
            <span>10개 영역</span>
            <span aria-hidden="true">·</span>
            <span>620개 연결</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
            <Link href="/" className="btn-primary text-[15px]">
              감정 찾기 시작하기
            </Link>
            <Link href="/map" className="landing-btn-outline-amber text-[15px]">
              지도 먼저 둘러보기
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        .landing-mono-label{
          font-family:'Pretendard', -apple-system, sans-serif;
          letter-spacing:.05em;
        }
        .landing-btn-outline-amber{
          background:var(--accent-amber-dim); color:var(--accent-amber-strong);
          border:1.5px solid var(--accent-amber); border-radius:999px;
          min-height:48px; padding:0 24px; font-weight:600;
          display:inline-flex; align-items:center; justify-content:center;
          transition:background .18s ease, border-color .18s ease, transform .18s ease;
        }
        .landing-btn-outline-amber:hover{ background:rgba(143,90,18,.22); border-color:var(--accent-amber-strong); transform:translateY(-1px); }
        .landing-btn-outline-amber:active{ transform:translateY(0); }
      `}</style>

      <main className="max-w-[900px] mx-auto px-6">
        {/* 01. Research problem */}
        <section className="mt-14 md:mt-20 enter enter-delay-1">
          <p className="label-eyebrow text-xs text-amber mb-3 text-center">01 · 문제 정의</p>
          <h2 className="font-display-serif text-[24px] md:text-[28px] text-center leading-snug">
            "일기도 결국 누군가 볼 수 있어서
            <br className="hidden md:block" /> 솔직하기 어렵다"
          </h2>
          <p className="text-center text-dim text-[12px] mt-2">— 실제 사용자 인터뷰</p>
          <p className="text-taupe text-[14.5px] leading-relaxed mt-6 max-w-[600px] mx-auto text-center">
            <b className="text-parchment">"자신의 감정을 구체적으로 인식하고
            표현할 수 있는 감정 어휘와, 이를 자신의 경험과 연결해 탐색할 기회가 부족하다."</b> 좋다·싫다·화난다처럼
            넓고 단순한 말로는 미묘한 차이를 구분하기 어렵고, 그렇다고 단어를 나열하는 것만으로는 자신의 경험과
            연결되지 않습니다.
          </p>

          <p className="label-eyebrow text-[11px] text-amber mt-10 text-center">정확한 어휘가 왜 도움이 되는가</p>
          <div className="grid md:grid-cols-2 gap-4 mt-4 max-w-[680px] mx-auto">
            <div className="paper-card p-5 text-left">
              <p className="font-serif-kr text-[14px] text-parchment">나 자신에게</p>
              <p className="text-taupe text-[13px] leading-relaxed mt-2">
                그냥 "화난다"로만 두면 원인도 흐릿하게 남습니다. "억울하다"인지 "서럽다"인지까지 짚으면 이 감정이
                어디서 왔는지 스스로 알게 되고, 무엇이 필요한지도 더 분명해집니다.
              </p>
            </div>
            <div className="paper-card p-5 text-left">
              <p className="font-serif-kr text-[14px] text-parchment">타인에게</p>
              <p className="text-taupe text-[13px] leading-relaxed mt-2">
                "화났어"라는 말은 상대가 이유를 짐작하게 만듭니다. "억울해서 화가 났어"까지 전달하면 오해 없이
                내 마음이 그대로 가닿고, 관계 속 감정 표현도 더 정확해집니다.
              </p>
            </div>
          </div>

          <p className="label-eyebrow text-[11px] text-amber mt-10 text-center">이 문제를 겪는 사람 · 최종 페르소나</p>
          <div className="paper-card p-6 mt-4 max-w-[640px] mx-auto text-left flex items-start gap-4">
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--accent-amber-dim)' }}
            >
              <span className="font-serif-kr text-[14px] text-amber">준호</span>
            </div>
            <div>
              <p className="font-serif-kr text-[14.5px] text-parchment">이준호 · 29세 · IT 기획자</p>
              <p className="text-taupe text-[13px] leading-relaxed mt-1.5">
                혼자 생각하며 자신을 돌아보는 시간을 중요하게 여기는 자기이해형 사용자입니다. "감정이 복잡하게
                섞이면 어떤 단어로 표현해야 할지 모호하다"는 페인포인트를 갖고 있고, 위 인터뷰 인용문도 이 페르소나의
                실제 답변에서 나왔습니다.
              </p>
            </div>
          </div>

          <p className="label-eyebrow text-[11px] text-amber mt-10 text-center">경쟁사 분석</p>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {COMPETITORS.map((c) => (
              <div key={c.name} className="paper-card p-5">
                <p className="font-serif-kr text-[14px] text-parchment">{c.name}</p>
                <p className="text-taupe text-[12.5px] leading-relaxed mt-2">{c.note}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-dim text-[11.5px] mt-4">
            세 서비스 모두 감정 "기록"에는 강하지만, 감정 "어휘"를 넓히고 관계를 탐색하게 하지는 않습니다.
          </p>
        </section>

        {/* 02. Why a map */}
        <section className="mt-16 md:mt-24 enter enter-delay-1 text-center">
          <p className="label-eyebrow text-xs text-amber mb-3">02 · 왜 지도인가</p>
          <h2 className="font-display-serif text-[26px] md:text-[30px] leading-snug">
            어휘가 늘수록, 위치는 정확해집니다
          </h2>
          <p className="text-taupe text-[14.5px] leading-relaxed mt-4 max-w-[560px] mx-auto">
            사전처럼 나열하면 정확한 단어를 이미 알고 있어야만 찾을 수 있습니다. 감정 어휘 지도는 비슷한
            감정은 가깝게, 반대되는 감정은 멀게 이어놓아 몰라도 가까운 자리에서 출발해 조금씩 좁혀갈 수
            있게 합니다. 그 경로를 따라가다 보면, 뒤섞인 마음이 어느 영역들을 오가고 있었는지도 드러납니다.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {regions.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px]"
                style={{ borderRadius: 999, background: `${r.area_color}2E`, border: `1px solid ${r.color}`, color: r.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                {r.name}
              </span>
            ))}
          </div>
        </section>

        {/* 03. Core features */}
        <section className="mt-16 md:mt-24 enter enter-delay-2 text-center">
          <p className="label-eyebrow text-xs text-amber mb-3">03 · 핵심 기능</p>
          <h2 className="font-display-serif text-[24px] md:text-[28px]">감정을 발견하는 여섯 가지 기능</h2>
          <p className="text-taupe text-[14px] leading-relaxed mt-4 max-w-[600px] mx-auto">
            상황이나 감정을 입력해 지도 위 자리를 찾고, 유사·반대 감정을 비교하며 좁혀가고, 발견한 감정을 나만
            볼 수 있게 기록하는 것이 지금의 핵심 경험입니다. 감정 표현 문장·이모티콘 추천·감정 도감·뱃지 같은
            기능은 이 핵심 경험이 자리 잡은 뒤 추가할 예정입니다.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="paper-card p-6 text-left">
                <span className="landing-mono-label text-[11px] text-amber">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-serif-kr text-[15px] text-parchment mt-2">{f.title}</h3>
                <p className="text-taupe text-[13px] leading-relaxed mt-2">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 04. Data-driven design */}
        <section className="mt-16 md:mt-24 enter enter-delay-2 text-center">
          <p className="label-eyebrow text-xs text-amber mb-3">04 · 검증된 데이터로 지도를 만들다</p>
          <h2 className="font-display-serif text-[24px] md:text-[28px]">434개 단어, 전부 근거가 있습니다</h2>
          <p className="text-taupe text-[14px] leading-relaxed mt-4 max-w-[600px] mx-auto text-left md:text-center">
            실험을 위해 감정 영역을 9개로 임의로 구분했습니다. 이후 HuggingFace의 공개 한국어 감정 어휘
            데이터셋(CC0)에서 434개의 단어를 확보하고, 독립된 감정 분류 체계인 KOTE(43개 카테고리)와 교차
            검증하는 리서치를 거쳤습니다. 그 결과 기존 9개 어디에도 속하지 않는 '역겨움/혐오' 뭉치가
            확인되었고, 서로 무관한 두 자료가 같은 결론을 가리켰기 때문에 10번째 영역, '혐오의 늪'을
            추가했습니다.
          </p>

          <p className="text-taupe text-[13.5px] leading-relaxed mt-6 max-w-[600px] mx-auto text-left md:text-center">
            이 데이터셋은 단어마다 다음 네 가지 값을 담고 있습니다. valence·arousal은 지도 위 좌표를 정하는 데,
            prototypicality·familiarity는 434개 중 어떤 단어를 먼저 실을지 추리는 데 각각 썼습니다.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 max-w-[680px] mx-auto">
            {DATA_COMPONENTS.map((d) => (
              <div key={d.label} className="paper-card p-4 text-left">
                <p className="landing-mono-label text-[10px] text-amber">{d.label}</p>
                <p className="text-taupe text-[12px] leading-relaxed mt-1.5">{d.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-[640px] mx-auto">
            {regionCounts.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-1.5">
                <span className="text-[11.5px] text-taupe w-[104px] text-right shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                  {r.name}
                </span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: 'rgba(38,36,32,.16)' }}>
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${(r.count / maxRegionCount) * 100}%`, background: r.color, opacity: 0.85 }}
                  />
                </div>
                <span className="landing-mono-label text-[11px] text-dim w-8 text-left" style={{ letterSpacing: 0, textTransform: 'none' }}>
                  {r.count}
                </span>
              </div>
            ))}
          </div>
          <p className="text-dim text-[11.5px] mt-4">영역별 최종 단어 수 (총 434개)</p>
        </section>

        {/* 05. Core flow */}
        <section className="mt-16 md:mt-24 enter enter-delay-2 text-center">
          <p className="label-eyebrow text-xs text-amber mb-3">05 · 핵심 플로우</p>
          <h2 className="font-display-serif text-[24px] md:text-[28px]">세 걸음이면 충분합니다</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="paper-card p-6">
                <span className="landing-mono-label text-[11px] text-amber">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-serif-kr text-[16px] text-parchment mt-2">{s.title}</h3>
                <p className="text-taupe text-[13.5px] leading-relaxed mt-2">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 06. AI search accuracy */}
        <section className="mt-16 md:mt-24 enter enter-delay-2 text-center">
          <p className="label-eyebrow text-xs text-amber mb-3">06 · AI 의미 검색 — 실측 정확도</p>
          <h2 className="font-display-serif text-[24px] md:text-[28px]">
            정확도 테스트 결과
          </h2>
          <p className="text-taupe text-[13.5px] leading-relaxed mt-4 max-w-[600px] mx-auto">
            감정 단어가 문장에 안 들어 있어도 뜻을 찾아내는 자유 문장 검색은 임베딩 유사도(
            <span className="landing-mono-label text-[12px]">text-embedding-3-small</span>) → LLM 직접 분류(현재{' '}
            <span className="landing-mono-label text-[12px]">gpt-4o-mini</span>) → 후보 여러 개 제시 → 복합 감정 지원
            순으로 12단계를 거쳤고, 매 단계 같은 30개 문장으로 다시 측정했습니다.
          </p>

          <div className="mt-8 max-w-[640px] mx-auto">
            <AccuracyChart />
          </div>

          <p className="text-taupe text-[13px] leading-relaxed mt-8 max-w-[600px] mx-auto text-left">
            1순위 정확도는 30~43%대를 오갔고, 지금 쓰는 최종 방식 기준으로는 43.3%입니다. 이 숫자를 실패율로 보지 않습니다 — 이 서비스의 목적은 정답
            하나를 맞히는 게 아니라 감정 어휘를 넓히는 것이라, 후보 중 정답이 없어도 같은 정서 방향의 인접 어휘가
            나오면 의미가 있다고 봅니다. 그래서 후보 여러 개를 보여주고 사용자가 직접 클릭해 확인하는 방식으로
            설계했습니다.
          </p>
        </section>

        {/* Privacy */}
        <section
          className="mt-16 md:mt-24 paper-card p-8 md:p-10 text-center enter enter-delay-3"
          style={{ background: 'linear-gradient(165deg, rgba(224,189,117,.18), var(--bg-elevated) 55%)' }}
        >
          <p className="label-eyebrow text-xs text-amber mb-3">PRIVATE BY DEFAULT</p>
          <h2 className="font-display-serif text-[24px] md:text-[28px]">다른 사람은 볼 수 없어요</h2>
          <p className="text-taupe text-[14px] mt-4 leading-relaxed max-w-[480px] mx-auto">
            "일기도 누군가 볼 수 있어서 솔직하기 어렵다"는 인터뷰를 그대로 설계에 반영했습니다. 로그인 없이도 바로
            시작할 수 있고, 그 기록은 이 브라우저에만 남습니다. 계정을 만들면 기록이 안전하게 이어져, 일별·월별·
            연도별로 내 감정의 흐름을 돌아볼 수 있어요.
          </p>
        </section>

        {/* Final CTA */}
        <section className="text-center mt-16 md:mt-24 mb-20 enter enter-delay-3">
          <h2 className="font-display-serif text-[26px] md:text-[32px] leading-snug">
            이제, 지도를 펼쳐볼 시간이에요
          </h2>
          <Link href="/" className="btn-primary text-[15px] mt-7 inline-flex">
            감정 찾기 시작하기
          </Link>
        </section>
      </main>

      <footer className="text-center text-dim text-[11.5px] pb-10">감정 어휘 지도 · 조용히, 나만 보는 기록</footer>
    </div>
  );
}
