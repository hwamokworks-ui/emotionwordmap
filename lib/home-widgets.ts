import type { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function getSeoulParts(): { dateKey: string; month: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const year = get('year');
  const month = Number(get('month'));
  const day = get('day');
  const hour = Number(get('hour')) % 24; // 자정을 '24'로 주는 구현이 있어 방어적으로 처리
  return { dateKey: `${year}-${String(month).padStart(2, '0')}-${day}`, month, hour };
}

type Season = 'spring' | 'summer' | 'fall' | 'winter';
type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour < 5) return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

// 계절 x 시간대에 어울리는 지역을 골라둔 표 — "오늘의 한 단어"가 항상 같은 단어만 보여주지 않고
// 지금 계절·시간의 정서에 맞는 영역에서 뽑히도록 한다.
const SEASON_TIME_REGION: Record<Season, Record<TimeOfDay, string>> = {
  spring: { dawn: 'forest', morning: 'garden', afternoon: 'joy', evening: 'garden', night: 'forest' },
  summer: { dawn: 'calm', morning: 'joy', afternoon: 'joy', evening: 'calm', night: 'sea' },
  fall: { dawn: 'sad', morning: 'calm', afternoon: 'room', evening: 'forest', night: 'sad' },
  winter: { dawn: 'sad', morning: 'calm', afternoon: 'room', evening: 'forest', night: 'calm' },
};

export type DailyWord = { id: string; noun_form: string; definition: string };

// 날짜(계절)와 시간대를 반영한 결정적 추천 — 같은 계절·시간대 안에서는 새로고침해도 같은 단어가 나오고,
// 시간대나 날짜가 바뀌면 다른 단어로 바뀐다. 실사용 데이터가 전혀 없어도 항상 결과가 있다.
export async function getDailyWord(supabase: SupabaseClient): Promise<DailyWord | null> {
  const { dateKey, month, hour } = getSeoulParts();
  const season = getSeason(month);
  const timeOfDay = getTimeOfDay(hour);
  const regionId = SEASON_TIME_REGION[season][timeOfDay];

  const { data: words } = await supabase.from('emotion_words').select('id, noun_form, definition').eq('region_id', regionId);
  if (!words || words.length === 0) return null;

  const seed = hashString(`${dateKey}-${timeOfDay}`);
  return words[seed % words.length];
}

// 실사용 데이터가 5개를 못 채울 때만 채워 넣는 고정 추천 목록 — 서로 다른 5개 지역에 걸쳐 있어
// "요즘 많이 찾는 감정" 자리가 특정 지역에 쏠려 보이지 않게 골랐다.
const RECOMMENDED_FALLBACK_IDS = ['seulpeu', 'muryeokgam', 'buran', 'huryeon', 'geuripda'];

export type TrendingWord = { id: string; noun_form: string; region_id: string; color: string; count: number | null };

// count: null이면 실사용 데이터가 아니라 추천으로 채운 자리라는 뜻 — 화면에서 가짜 인원수를 보여주지 않기 위해서다.
export async function getTrendingWords(supabase: SupabaseClient, limit = 5): Promise<TrendingWord[]> {
  const { data: counts } = await supabase.rpc('trending_word_counts', { days_back: 7, max_count: limit });
  const rows: { word_id: string; discover_count: number }[] = counts ?? [];
  const realIds = rows.map((r) => r.word_id);

  const fillerIds = RECOMMENDED_FALLBACK_IDS.filter((id) => !realIds.includes(id)).slice(0, Math.max(0, limit - realIds.length));
  const allIds = [...realIds, ...fillerIds];
  if (allIds.length === 0) return [];

  // emotion_words -> emotion_regions로 가는 FK가 3개(region_id/edge_bias_region_id/root_word 역참조)라
  // PostgREST가 관계를 못 골라서 제약조건 이름으로 명시해야 한다.
  const { data: words } = await supabase
    .from('emotion_words')
    .select('id, noun_form, region_id, emotion_regions!emotion_words_region_id_fkey(color)')
    .in('id', allIds);
  if (!words) return [];

  const countById = new Map(rows.map((r) => [r.word_id, r.discover_count]));

  return allIds
    .map((id) => {
      const w = words.find((w) => w.id === id);
      if (!w) return null;
      const regionRel = w.emotion_regions as unknown as { color: string } | { color: string }[] | null;
      const color = Array.isArray(regionRel) ? regionRel[0]?.color : regionRel?.color;
      return { id: w.id, noun_form: w.noun_form, region_id: w.region_id, color: color ?? '#A79A85', count: countById.get(id) ?? null };
    })
    .filter((r): r is TrendingWord => !!r);
}
