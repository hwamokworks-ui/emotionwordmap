import { createClient } from '@/lib/supabase/server';
import { getDailyWord, getTrendingWords } from '@/lib/home-widgets';
import Topbar from './Topbar';
import SearchBox from './SearchBox';
import HeroHeadline from './HeroHeadline';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [dailyWord, trending] = await Promise.all([getDailyWord(supabase), getTrendingWords(supabase)]);

  return (
    <div className="page-wrap">
      <Topbar active="find" isLoggedIn={!!user} displayName={(user?.user_metadata?.display_name as string) || null} />

      <main className="content-inner max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] gap-8 md:gap-10">
          <div>
            <header className="enter">
              <HeroHeadline />
              <p className="text-taupe mt-5 leading-relaxed max-w-[520px] text-[14.5px]">
                지금의 마음을 한 줄 적으면, 그 마음이 놓인 자리를 지도에서 찾아드려요.
                <br />
                하나의 감정에서 멈추지 말고, 이어진 길을 따라 더 정확한 단어를 발견해 보세요.
              </p>
            </header>

            <SearchBox />
            <p className="text-dim text-[12px] mt-3 enter enter-delay-2">다른 사람은 이 기록을 볼 수 없어요 — 로그인 전에는 이 브라우저에만, 로그인 후에는 내 계정에만 남아요</p>

            <section className="mt-11 enter enter-delay-2">
              <p className="text-xs text-parchment label-eyebrow mb-3" style={{ fontWeight: 600 }}>
                어떤 상황인가요?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <a href="/map?w=geuripda" className="paper-card situation-card p-4 text-[14px] leading-snug" style={{ border: '1.5px solid #3D8657', ['--accent' as string]: '#3D8657', ['--accent-rgb' as string]: '61,134,87' }}>
                  애인과 헤어졌을 때
                </a>
                <a href="/map?w=chojo" className="paper-card situation-card p-4 text-[14px] leading-snug" style={{ border: '1.5px solid #4779A8', ['--accent' as string]: '#4779A8', ['--accent-rgb' as string]: '71,121,168' }}>
                  시험 전날
                </a>
                <a href="/map?w=ginjang" className="paper-card situation-card p-4 text-[14px] leading-snug" style={{ border: '1.5px solid #E87792', ['--accent' as string]: '#E87792', ['--accent-rgb' as string]: '232,119,146' }}>
                  첫 출근
                </a>
                <a href="/map?w=seounhada" className="paper-card situation-card p-4 text-[14px] leading-snug" style={{ border: '1.5px solid #D1503A', ['--accent' as string]: '#D1503A', ['--accent-rgb' as string]: '209,80,58' }}>
                  답장이 늦을 때
                </a>
                <a href="/map?w=seolle" className="paper-card situation-card p-4 text-[14px] leading-snug" style={{ border: '1.5px solid #E87792', ['--accent' as string]: '#E87792', ['--accent-rgb' as string]: '232,119,146' }}>
                  누군가를 좋아하기 시작했을 때
                </a>
                <a href="/map?w=ppudeut" className="paper-card situation-card p-4 text-[14px] leading-snug" style={{ border: '1.5px solid #E8A93A', ['--accent' as string]: '#E8A93A', ['--accent-rgb' as string]: '232,169,58' }}>
                  오래 준비한 일이 잘 됐을 때
                </a>
              </div>
            </section>
          </div>

          <aside className="mt-8 md:mt-[220px]">
            {dailyWord && (
              <>
                <p className="text-[11.5px] text-taupe label-eyebrow mb-2 enter enter-delay-3">오늘의 한 단어</p>
                <div className="p-5 enter enter-delay-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '20px' }}>
                  <p className="font-display-serif text-[25px] text-parchment">{dailyWord.noun_form}</p>
                  <p className="text-[13px] text-taupe italic mt-2 leading-relaxed">&quot;{dailyWord.definition}&quot;</p>
                  <a href={`/map?w=${dailyWord.id}`} className="text-[12px] text-amber mt-3 inline-block hover:opacity-70 transition-opacity" style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    지도에서 발견하기 ›
                  </a>
                </div>
              </>
            )}

            {trending.length > 0 && (
              <>
                <p className="text-[11.5px] text-taupe label-eyebrow mb-2 mt-7 enter enter-delay-3">요즘 많이 찾는 감정</p>
                <div className="divide-y enter enter-delay-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '16px', overflow: 'hidden' }}>
                  {trending.map((row, i) => (
                    <a
                      key={row.id}
                      href={`/map?w=${row.id}`}
                      className="flex items-center gap-3 py-3 px-3.5 hover:bg-elevated2 transition-colors"
                      style={i === trending.length - 1 ? undefined : { borderBottom: '1px solid var(--border-hairline)' }}
                    >
                      <span className="text-[12.5px] text-dim w-4">{i + 1}</span>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="flex-1 text-[14.5px] text-parchment">{row.noun_form}</span>
                      <span className="text-[10.5px] text-taupe">{row.count != null ? `${row.count}명` : '추천'}</span>
                    </a>
                  ))}
                </div>
                <p className="text-dim text-[11px] mt-3 leading-relaxed">사용자들이 지도에서 발견한 감정을 모아 매주 집계해요. 데이터가 모일 때까지는 일부를 추천으로 채워요.</p>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
