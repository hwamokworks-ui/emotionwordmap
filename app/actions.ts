'use server';

import { getEmotionContent } from '@/lib/emotion-content';
import { classifyWordWithLLM } from '@/lib/ai-match';

// index.html의 resolveWord()를 그대로 이식 — 원형/명사형에 먼저 매칭하고, 못 찾으면
// 원형에서 기계적으로 뗀 어간으로 한 번 더 매칭한다(KEYWORDS 배열 대신 서버에서 즉석 계산).
function stemOf(wordForm: string) {
  return wordForm.replace(/(하다|되다|스럽다|답다|롭다|다)$/, '');
}

// 문장 하나에 서로 다른 감정 단어가 여러 개 그대로 들어있을 수 있다("아쉽다와 기쁘다, 근데
// 슬프다"). 예전에는 가장 점수가 높은 단어 하나만 골랐는데, 이러면 나머지 감정이 통째로 사라진다.
// 그래서 글자 그대로 일치하는 단어는 전부 모아서, 문장에 등장한 순서대로 반환한다.
function literalMatchAll(t: string, words: { id: string; word_form: string; noun_form: string }[]): string[] {
  const hits: { id: string; at: number }[] = [];
  for (const { id, word_form: w, noun_form: n } of words) {
    const atW = w ? t.indexOf(w) : -1;
    const atN = n ? t.indexOf(n) : -1;
    const at = atW >= 0 ? atW : atN;
    if (at >= 0) hits.push({ id, at });
  }
  if (hits.length > 0) return hits.sort((a, b) => a.at - b.at).map((h) => h.id).slice(0, 7);

  // 글자 그대로 일치하는 단어가 하나도 없을 때만, 노이즈가 큰 어간 매칭으로 넘어간다 — 어간은
  // 짧고 흔해서 여러 개를 그대로 다 보여주면 오히려 헷갈리니 가장 구체적인(어간이 긴) 것 하나만 쓴다.
  let best: string | null = null;
  let bestLen = 0;
  for (const { id, word_form: w } of words) {
    const stem = stemOf(w);
    if (stem && stem.length >= 2 && t.includes(stem) && stem.length > bestLen) {
      bestLen = stem.length;
      best = id;
    }
  }
  return best ? [best] : [];
}

// 글자 매칭은 원래 정답 단어 1개만 보여줬는데, 이 서비스의 목적은 "정답 하나 맞히기"가 아니라
// "감정 어휘 확장"이라(docs/AI_의미검색_구현기록.md 참고) — 글자로 확실히 찾은 경우에도 관계선
// (emotion_word_relations, 지도의 "가까운 감정"과 같은 데이터)을 타고 가까운 순서대로 6개를 더
// 붙여, LLM 경로(정확히 7개)와 후보 개수를 맞춘다.
function nearestByRelation(id: string, relations: { word_a_id: string; word_b_id: string }[], limit: number): string[] {
  const adj: Record<string, string[]> = {};
  for (const { word_a_id: a, word_b_id: b } of relations) {
    (adj[a] ??= []).push(b);
    (adj[b] ??= []).push(a);
  }
  const dist: Record<string, number> = { [id]: 0 };
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of adj[cur] ?? []) {
      if (dist[nb] === undefined) {
        dist[nb] = dist[cur] + 1;
        queue.push(nb);
      }
    }
  }
  return Object.entries(dist)
    .filter(([nid]) => nid !== id)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([nid]) => nid);
}

export type WordCandidate = { id: string; noun_form: string; definition: string };

// confident: 글자 그대로 매칭됐는지(true) — 이 경우 확실하니 "더 자세히 적어보라"는 안내가 필요 없다.
// LLM 의미 매칭(false)은 30문장 평가 기준 정확도가 40~57%대라 오답일 가능성을 사용자에게 알려줄 필요가 있다.
export type ResolveResult = { type: 'candidates'; candidates: WordCandidate[]; confident: boolean } | { type: 'none' };

function toCandidates(ids: string[], words: { id: string; noun_form: string; definition: string }[]): WordCandidate[] {
  return ids
    .map((id) => words.find((w) => w.id === id))
    .filter((w): w is (typeof words)[number] => !!w)
    .map(({ id, noun_form, definition }) => ({ id, noun_form, definition }));
}

export async function resolveWordAction(text: string): Promise<ResolveResult> {
  const t = (text || '').trim();
  if (!t) return { type: 'none' };

  // 검색할 때마다 434개 단어를 Supabase에서 새로 조회하던 게 지도·검색이 느려진 원인 중 하나였다 —
  // 콘텐츠 데이터는 자주 안 바뀌니 캐시된 조회(lib/emotion-content.ts)를 함께 쓴다.
  const { words, relations } = await getEmotionContent();
  if (words.length === 0) return { type: 'none' };

  // 1) 글자 그대로 매칭 — 빠르고 무료. 확실한 경우라도 바로 이동하지 않고 후보로 보여준 뒤
  // 사용자가 직접 클릭해서 들어가게 한다 — AI가 확신 없이 골랐을 수도 있으니 항상 확인을 거치게 한다.
  const literalIds = literalMatchAll(t, words);
  if (literalIds.length > 1) {
    // 문장에 서로 다른 감정 단어가 여럿 그대로 있으면, 하나로 뭉뚱그리지 않고 전부 후보로 보여준다.
    return { type: 'candidates', candidates: toCandidates(literalIds, words), confident: true };
  }
  if (literalIds.length === 1) {
    // 하나만 나왔다면, 관계선을 타고 가까운 단어 6개를 더 이어서 총 7개로 어휘를 넓힐 기회를 준다.
    const nearby = nearestByRelation(literalIds[0], relations, 6);
    return { type: 'candidates', candidates: toCandidates([literalIds[0], ...nearby], words), confident: true };
  }

  // 2) 글자로 못 찾으면 의미로 찾는다 — LLM이 골라준 후보를 그대로 신뢰하지 않고
  // 최대 7개를 사용자에게 보여줘 직접 고르게 한다 (30문장 평가 기준 top-1 정확도 40%대로 낮음).
  const ids = await classifyWordWithLLM(t, words);
  if (ids.length === 0) return { type: 'none' };

  return { type: 'candidates', candidates: toCandidates(ids, words), confident: false };
}
