'use client';

import { useEffect, useMemo, useState } from 'react';
import { resetAllAction } from './actions';
import type { Region, WordRow, Relation } from '../map/types';
import type { DiscLogEntry, SaveLogEntry, NoteEntry } from './page';

const STORE_KEY = 'ewm_store_v1';

type GuestStore = {
  discovered: string[];
  saved: string[];
  notes: { id: string; at: number; text: string }[];
  disclog: DiscLogEntry[];
  savelog: SaveLogEntry[];
};

function loadGuestStore(): GuestStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.discovered)) {
        return {
          discovered: s.discovered ?? [],
          saved: s.saved ?? [],
          notes: s.notes ?? [],
          disclog: s.disclog ?? [],
          savelog: s.savelog ?? [],
        };
      }
    }
  } catch {
    // 무시하고 기본값
  }
  return { discovered: [], saved: [], notes: [], disclog: [], savelog: [] };
}

function bucketKey(ts: number, mode: 'day' | 'month' | 'year') {
  const d = new Date(ts);
  if (mode === 'day') return d.toISOString().slice(0, 10);
  if (mode === 'month') return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return String(d.getFullYear());
}
function bucketLabel(key: string, mode: 'day' | 'month' | 'year') {
  if (mode === 'day') {
    const [, m, dd] = key.split('-');
    return `${+m}/${+dd}`;
  }
  if (mode === 'month') {
    const [y, m] = key.split('.');
    return `${y.slice(2)}년 ${+m}월`;
  }
  return `${key}년`;
}
function recentBuckets(mode: 'day' | 'month' | 'year') {
  const now = new Date();
  const keys: string[] = [];
  if (mode === 'day') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      keys.push(bucketKey(d.getTime(), 'day'));
    }
  } else if (mode === 'month') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(bucketKey(d.getTime(), 'month'));
    }
  } else {
    for (let i = 2; i >= 0; i--) keys.push(String(now.getFullYear() - i));
  }
  return keys;
}

type Props = {
  regions: Region[];
  words: WordRow[];
  relations: Relation[];
  isLoggedIn: boolean;
  initialDisclog: DiscLogEntry[];
  initialSavelog: SaveLogEntry[];
  initialNotes: NoteEntry[];
};

const EMPTY_GUEST_STORE: GuestStore = { discovered: [], saved: [], notes: [], disclog: [], savelog: [] };

export default function ArchiveClient({ regions, words, relations, isLoggedIn, initialDisclog, initialSavelog, initialNotes }: Props) {
  // 서버 렌더 시점엔 localStorage가 없으므로 빈 상태로 시작하고(0개 표시), 마운트 후 useEffect가 실제 값으로 교체한다.
  // guest를 null로 시작해 전체를 렌더 안 하면 하이드레이션 전까지 페이지가 통째로 비어 보인다.
  const [guest, setGuest] = useState<GuestStore>(EMPTY_GUEST_STORE);
  const [statTab, setStatTab] = useState<'disc' | 'saved' | 'notes'>('disc');
  const [chartMode, setChartMode] = useState<'day' | 'month' | 'year'>('day');
  const [chartPick, setChartPick] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) setGuest(loadGuestStore());
  }, [isLoggedIn]);

  const WORDS = useMemo(() => Object.fromEntries(words.map((w) => [w.id, w])), [words]);
  const REGION_BY_ID = useMemo(() => Object.fromEntries(regions.map((r) => [r.id, r])), [regions]);
  const boundaryWords = useMemo(() => words.filter((w) => w.edge_bias_region_id).map((w) => w.id), [words]);

  const disclog = isLoggedIn ? initialDisclog : guest.disclog;
  const savelog = isLoggedIn ? initialSavelog : guest.savelog;
  const notes = isLoggedIn ? initialNotes : guest.notes.map((n) => ({ id: n.id, wordId: n.id, at: n.at, text: n.text }));
  const discovered = isLoggedIn ? Array.from(new Set(disclog.map((d) => d.id))) : guest.discovered;
  const saved = isLoggedIn ? Array.from(new Set(savelog.map((s) => s.id))) : guest.saved;

  async function handleReset() {
    if (!confirm('지금까지의 발견·저장·기록을 모두 초기화할까요?')) return;
    if (isLoggedIn) {
      await resetAllAction();
      window.location.reload();
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(EMPTY_GUEST_STORE));
      setGuest(EMPTY_GUEST_STORE);
    }
  }

  const tabs = [
    { id: 'disc' as const, label: '발견한 감정', value: discovered.length, suffix: '개' },
    { id: 'saved' as const, label: '저장한 단어', value: saved.length, suffix: '개' },
    { id: 'notes' as const, label: '마음 기록', value: notes.length, suffix: '개' },
  ];

  return (
    <main className="content-inner max-w-[1100px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-5 pb-5 enter" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
        <div>
          <p className="font-mono-coord text-[10px] text-amber">MY STACKS</p>
          <h1 className="font-serif-kr text-[34px] leading-tight mt-2">나의 감정 서고</h1>
          <p className="text-taupe text-[13.5px] mt-2">
            {isLoggedIn ? '지금까지 발견하고 저장한 감정들이 이곳에 모입니다.' : '지금 이 브라우저에서 발견한 감정들이에요. 로그인하면 날짜를 넘겨서도 남고, 일별·월별·연도별 리포트도 볼 수 있어요.'}
          </p>
        </div>
        <a href="/map" className="btn-secondary text-[13px] shrink-0 w-full sm:w-auto">
          지도에서 계속 탐험하기
        </a>
      </div>

      {!isLoggedIn && (
        <div className="mt-5 p-4 rounded-md text-[13px] leading-relaxed flex items-center justify-between gap-4" style={{ background: 'var(--bg-elevated2)', border: '1px dashed var(--border-hairline-strong)' }}>
          <span>로그인하면 오늘 하루를 넘어 일별·월별·연도별 기록을 볼 수 있어요.</span>
          <a href="/login" className="btn-secondary text-[12.5px] shrink-0">
            로그인
          </a>
        </div>
      )}

      <div className="flex gap-3 mt-7 enter enter-delay-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setStatTab(t.id);
              setChartPick(null);
            }}
            className={`stat-tab ${statTab === t.id ? 'active' : ''}`}
          >
            <span className="block mb-1 text-[10.5px] label-eyebrow text-taupe">{t.label}</span>
            <span className="font-serif-kr text-[26px]">
              {t.value}
              <span className="text-[13px] text-dim">{t.suffix}</span>
            </span>
          </button>
        ))}
      </div>

      <section className="mt-7 enter enter-delay-1">
        <p className="text-xs text-taupe label-eyebrow mb-3">저장한 단어</p>
        <div className="flex flex-wrap gap-2">
          {saved.length === 0 ? (
            <p className="text-dim text-[13px]">아직 저장한 단어가 없습니다. 지도에서 마음에 닿는 단어를 저장해 보세요.</p>
          ) : (
            saved.map((id) => {
              const w = WORDS[id];
              if (!w) return null;
              const r = REGION_BY_ID[w.region_id];
              return (
                <a key={id} href={`/map?w=${id}`} className="chip text-[14px]" style={{ background: `${r.color}18`, border: `1px solid ${r.color}55`, color: r.color }}>
                  {w.noun_form}
                </a>
              );
            })
          )}
        </div>
      </section>

      {statTab === 'notes' ? (
        <section className="mt-8 enter enter-delay-2">
          <p className="text-xs text-taupe label-eyebrow mb-3">마음 기록</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.length === 0 ? (
              <p className="text-dim text-[13px]">아직 남긴 기록이 없습니다. 지도의 감정 상세 패널에서 그 순간을 적어보세요.</p>
            ) : (
              notes
                .slice()
                .reverse()
                .map((n, i) => {
                  const w = WORDS[n.wordId];
                  const r = w ? REGION_BY_ID[w.region_id] : null;
                  return (
                    <div key={n.id + i} className="index-card p-4" style={{ borderLeft: `3px solid ${r ? r.color : 'var(--border-hairline-strong)'}` }}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <a href={`/map?w=${n.wordId}`} className="font-serif-kr text-[15px]" style={{ color: r ? r.color : 'inherit' }}>
                          {w ? w.noun_form : n.wordId}
                        </a>
                        <span className="text-[11px] text-dim">{new Date(n.at).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <p className="text-[13px] text-parchment/90 leading-relaxed">{n.text}</p>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      ) : isLoggedIn ? (
        <FullChart
          statTab={statTab}
          chartMode={chartMode}
          setChartMode={(m) => {
            setChartMode(m);
            setChartPick(null);
          }}
          chartPick={chartPick}
          setChartPick={setChartPick}
          log={statTab === 'saved' ? savelog : disclog}
          WORDS={WORDS}
          REGION_BY_ID={REGION_BY_ID}
        />
      ) : (
        <TodayOnlyCard statTab={statTab} log={statTab === 'saved' ? savelog : disclog} WORDS={WORDS} REGION_BY_ID={REGION_BY_ID} />
      )}

      <section className="mt-10 enter enter-delay-2">
        <p className="text-xs text-taupe label-eyebrow mb-3">지역 완성도</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {regions.map((r) => {
            const regionWords = words.filter((w) => w.region_id === r.id);
            const found = regionWords.filter((w) => discovered.includes(w.id));
            const pct = regionWords.length ? Math.round((found.length / regionWords.length) * 100) : 0;
            return (
              <div key={r.id} className="paper-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-kr text-[16px]">{r.name}</span>
                  <span className="text-[11.5px] text-dim">
                    {found.length}/{regionWords.length}
                  </span>
                </div>
                <div className="region-progress">
                  <div style={{ width: `${pct}%`, background: r.color }} />
                </div>
                <p className="text-[11.5px] text-taupe mt-2 leading-relaxed">{found.length ? found.map((w) => w.noun_form).join(', ') : '아직 발견한 단어가 없어요'}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 enter enter-delay-3">
        <p className="text-xs text-taupe label-eyebrow mb-3">감정 뱃지</p>
        <BadgesGrid discovered={discovered} saved={saved} notes={notes} relations={relations} boundaryWords={boundaryWords} totalWords={words.length} />
      </section>

      <button onClick={handleReset} className="btn-secondary mt-10 mb-4 text-[13px]" style={{ borderStyle: 'dashed' }}>
        탐험 기록 초기화
      </button>
    </main>
  );
}

function FullChart({
  statTab,
  chartMode,
  setChartMode,
  chartPick,
  setChartPick,
  log,
  WORDS,
  REGION_BY_ID,
}: {
  statTab: 'disc' | 'saved';
  chartMode: 'day' | 'month' | 'year';
  setChartMode: (m: 'day' | 'month' | 'year') => void;
  chartPick: string | null;
  setChartPick: (k: string | null) => void;
  log: { id: string; at: number }[];
  WORDS: Record<string, WordRow>;
  REGION_BY_ID: Record<string, Region>;
}) {
  const keys = recentBuckets(chartMode);
  const counts = keys.map((k) => log.filter((e) => bucketKey(e.at, chartMode) === k).length);
  const max = Math.max(1, ...counts);
  const total = log.length;

  const nonEmpty = keys.map((k, i) => ({ k, count: counts[i] })).filter((b) => b.count > 0).reverse();
  const shown = chartPick ? nonEmpty.filter((b) => b.k === chartPick) : nonEmpty;

  return (
    <section className="mt-8 enter enter-delay-2">
      <div className="flex items-center justify-between gap-4 mb-3">
        <p className="text-xs text-taupe label-eyebrow">
          {statTab === 'saved' ? '저장 추이' : '발견 추이'} · 누적 {total}개
        </p>
        <div className="flex gap-1.5">
          {(['day', 'month', 'year'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setChartMode(m)}
              className="px-3 py-1.5 rounded-full text-[11.5px]"
              style={{
                border: '1px solid var(--border-hairline-strong)',
                background: chartMode === m ? 'var(--accent-amber-dim)' : 'transparent',
                color: chartMode === m ? 'var(--accent-amber-strong)' : 'var(--text-secondary)',
              }}
            >
              {m === 'day' ? '일별' : m === 'month' ? '월별' : '연도별'}
            </button>
          ))}
        </div>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-end gap-2" style={{ height: 150 }}>
          {keys.map((k, i) => (
            <button
              key={k + i}
              onClick={() => setChartPick(chartPick === k ? null : k)}
              className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
              style={{ cursor: counts[i] ? 'pointer' : 'default' }}
            >
              <span className="text-[10px] text-taupe">{counts[i] || ''}</span>
              <div
                className="w-full rounded-sm"
                style={{ maxWidth: 34, height: `${Math.max(3, (counts[i] / max) * 100)}%`, background: chartPick === k ? 'var(--accent-amber)' : 'var(--border-hairline-strong)' }}
              />
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          {keys.map((k) => (
            <div key={k} className="flex-1 text-center text-[10px] text-dim">
              {bucketLabel(k, chartMode)}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          {shown.length === 0 ? (
            <p className="text-dim text-[13px]">이 기간에 발견한 단어가 없습니다.</p>
          ) : (
            shown.map((b) => {
              const ids = log
                .filter((e) => bucketKey(e.at, chartMode) === b.k)
                .map((e) => e.id)
                .reverse();
              return (
                <div key={b.k} className="grid gap-3 items-baseline" style={{ gridTemplateColumns: '120px minmax(0,1fr)' }}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[12.5px]">{bucketLabel(b.k, chartMode)}</span>
                    <span className="text-[11px] text-dim">{b.count}개</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ids.map((id, i) => {
                      const w = WORDS[id];
                      if (!w) return null;
                      const r = REGION_BY_ID[w.region_id];
                      return (
                        <a key={id + i} href={`/map?w=${id}`} className="chip text-[13px]" style={{ border: `1px solid ${r.color}66`, color: r.color }}>
                          {w.noun_form}
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          {chartPick && (
            <button
              onClick={() => setChartPick(null)}
              className="self-start mt-1 text-[11.5px] text-taupe"
              style={{ padding: '5px 11px', border: '1px dashed var(--border-hairline-strong)', borderRadius: 999 }}
            >
              전체 기간 보기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function TodayOnlyCard({
  statTab,
  log,
  WORDS,
  REGION_BY_ID,
}: {
  statTab: 'disc' | 'saved';
  log: { id: string; at: number }[];
  WORDS: Record<string, WordRow>;
  REGION_BY_ID: Record<string, Region>;
}) {
  const todayKey = bucketKey(Date.now(), 'day');
  const todays = log.filter((e) => bucketKey(e.at, 'day') === todayKey);

  return (
    <section className="mt-8 enter enter-delay-2">
      <p className="text-xs text-taupe label-eyebrow mb-3">오늘 {statTab === 'saved' ? '저장한' : '발견한'} 감정 · {todays.length}개</p>
      <div className="paper-card p-5">
        {todays.length === 0 ? (
          <p className="text-dim text-[13px]">오늘은 아직 없습니다. 지도에서 감정을 {statTab === 'saved' ? '저장' : '발견'}해 보세요.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {todays
              .map((e) => e.id)
              .reverse()
              .map((id, i) => {
                const w = WORDS[id];
                if (!w) return null;
                const r = REGION_BY_ID[w.region_id];
                return (
                  <a key={id + i} href={`/map?w=${id}`} className="chip text-[13px]" style={{ border: `1px solid ${r.color}66`, color: r.color }}>
                    {w.noun_form}
                  </a>
                );
              })}
          </div>
        )}
        <p className="text-[11.5px] text-dim mt-4 pt-3" style={{ borderTop: '1px dashed var(--border-hairline-strong)' }}>
          로그인하면 오늘 이전 기록도 일별·월별·연도별로 볼 수 있어요.
        </p>
      </div>
    </section>
  );
}

function BadgesGrid({
  discovered,
  saved,
  notes,
  relations,
  boundaryWords,
  totalWords,
}: {
  discovered: string[];
  saved: string[];
  notes: unknown[];
  relations: Relation[];
  boundaryWords: string[];
  totalWords: number;
}) {
  const d = discovered.length;
  const s = saved.length;
  const n = notes.length;
  const p = relations.filter(({ word_a_id, word_b_id }) => discovered.includes(word_a_id) && discovered.includes(word_b_id)).length;
  const boundaryFound = boundaryWords.filter((id) => discovered.includes(id)).length;

  const BADGES = [
    { name: '첫 발견', glyph: '一', desc: '첫 번째 감정 발견', ok: d >= 1 },
    { name: '감정 탐험가', glyph: '地', desc: '감정 단어 12개 발견', ok: d >= 12 },
    { name: '감정 탐정', glyph: '尋', desc: '이웃 감정 8쌍 탐색', ok: p >= 8 },
    { name: '어휘 수집가', glyph: '集', desc: '감정 단어 10개 저장', ok: s >= 10 },
    { name: '마음의 기록자', glyph: '記', desc: '감정 기록 3회', ok: n >= 3 },
    { name: '경계의 발견자', glyph: '際', desc: `영역 경계에 걸친 감정 ${boundaryWords.length}개 모두 발견`, ok: boundaryFound >= boundaryWords.length },
    { name: '감정 도서관 사서', glyph: '書', desc: '모든 감정 단어 발견', ok: d >= totalWords },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {BADGES.map((b) => (
        <div key={b.name} className="paper-card p-4 flex items-center gap-3" style={{ opacity: b.ok ? 1 : 0.45 }}>
          <div className="badge-seal">
            <svg width="42" height="42" viewBox="0 0 42 42" style={{ position: 'absolute', inset: 0 }}>
              <circle cx="21" cy="21" r="19" fill="none" stroke={b.ok ? 'var(--accent-amber)' : 'var(--text-tertiary)'} strokeWidth="1" strokeDasharray="3 4" />
              <circle cx="21" cy="21" r="14.5" fill={b.ok ? 'var(--accent-amber-dim)' : 'var(--bg-elevated2)'} stroke={b.ok ? 'var(--accent-amber)' : 'var(--text-tertiary)'} strokeWidth="1.2" />
            </svg>
            <span className="relative font-serif-kr text-[15px]" style={{ color: b.ok ? 'var(--accent-amber-strong)' : 'var(--text-tertiary)' }}>
              {b.glyph}
            </span>
          </div>
          <div>
            <p className="font-serif-kr text-[14.5px]">{b.name}</p>
            <p className="text-[11px] text-taupe leading-snug mt-0.5">{b.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
