'use server';

import { getEmotionContent } from '@/lib/emotion-content';
import { classifyWordWithLLM } from '@/lib/ai-match';

// index.html의 resolveWord()를 그대로 이식 — 원형/명사형에 먼저 매칭하고, 못 찾으면
// 원형에서 기계적으로 뗀 어간으로 한 번 더 매칭한다(KEYWORDS 배열 대신 서버에서 즉석 계산).
function stemOf(wordForm: string) {
  return wordForm.replace(/(하다|되다|스럽다|답다|롭다|다)$/, '');
}

// 문장 하나에 서로 다른 감정 단어가 여러 개 있을 수 있는데, 활용형이 섞여 있을 때가 많다
// ("아쉽지만 보람차다"에서 "보람차다"는 원형 그대로지만 "아쉽다"는 "아쉽지만"으로 활용됨).
// 예전에는 글자 그대로 일치하는 단어가 하나라도 있으면 어간 매칭을 아예 시도하지 않아서,
// 활용된 감정은 통째로 사라졌다(이 예시에서 "보람차다"만 잡히고 "아쉽다"는 사라짐). 이제는
// 정확히 일치하는 단어를 전부 모으고, 그와 별개로 아직 못 찾은 단어들에 대해 어간(원형에서
// 어미를 뗀 형태) 매칭도 항상 같이 시도해서 합친다 — 문장에 등장한 순서대로 반환한다.
function literalMatchAll(t: string, words: { id: string; word_form: string; noun_form: string }[]): string[] {
  const hits: { id: string; at: number }[] = [];
  const found = new Set<string>();
  for (const { id, word_form: w, noun_form: n } of words) {
    const atW = w ? t.indexOf(w) : -1;
    const atN = n ? t.indexOf(n) : -1;
    const at = atW >= 0 ? atW : atN;
    if (at >= 0) {
      hits.push({ id, at });
      found.add(id);
    }
  }
  for (const { id, word_form: w } of words) {
    if (found.has(id)) continue;
    const stem = stemOf(w);
    if (stem && stem.length >= 2) {
      const at = t.indexOf(stem);
      if (at >= 0) hits.push({ id, at });
    }
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.id).slice(0, 7);
}

// 글자 매칭은 원래 정답 단어 1개만 보여줬는데, 이 서비스의 목적은 "정답 하나 맞히기"가 아니라
// "감정 어휘 확장"이라(docs/AI_의미검색_구현기록.md 참고) — 글자로 확실히 찾은 경우에도 관계선
// (emotion_word_relations, 지도의 "가까운 감정"과 같은 데이터)을 타고 가까운 순서대로 채워, LLM
// 경로(정확히 7개)와 후보 개수를 맞춘다.
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

// 글자 매칭으로 몇 개를 찾았든("아쉽다" 1개든, "아쉽다 보람차다" 2개든) 항상 정확히 count개를
// 채워서 보여준다 — LLM 경로와 개수를 맞추기 위해서다. 부족한 자리는 찾은 단어들 각각의 관계선
// 이웃을 한 명씩 돌아가며(라운드 로빈) 채운다 — 첫 단어 주변만 몰아 채우면 나중에 언급된 감정
// 쪽 어휘가 안 보이게 된다.
function fillToCount(
  literalIds: string[],
  relations: { word_a_id: string; word_b_id: string }[],
  count: number
): string[] {
  const result = [...literalIds];
  if (result.length >= count) return result.slice(0, count);

  const seen = new Set(result);
  const neighborQueues = literalIds.map((id) => nearestByRelation(id, relations, count).filter((nid) => !seen.has(nid)));

  let progressed = true;
  while (result.length < count && progressed) {
    progressed = false;
    for (const queue of neighborQueues) {
      if (result.length >= count) break;
      while (queue.length) {
        const candidate = queue.shift()!;
        if (!seen.has(candidate)) {
          result.push(candidate);
          seen.add(candidate);
          progressed = true;
          break;
        }
      }
    }
  }
  return result;
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
  // 문장에서 몇 개를 찾았든(1개든 여러 개든) 관계선으로 채워서 항상 7개를 보여준다 — LLM 경로와
  // 개수를 맞추고, 찾은 단어들 주변 어휘도 함께 넓혀 보여주기 위해서다.
  const literalIds = literalMatchAll(t, words);
  if (literalIds.length > 0) {
    const finalIds = fillToCount(literalIds, relations, 7);
    return { type: 'candidates', candidates: toCandidates(finalIds, words), confident: true };
  }

  // 2) 글자로 못 찾으면 의미로 찾는다 — LLM이 골라준 후보를 그대로 신뢰하지 않고
  // 최대 7개를 사용자에게 보여줘 직접 고르게 한다 (30문장 평가 기준 top-1 정확도 40%대로 낮음).
  const ids = await classifyWordWithLLM(t, words);
  if (ids.length === 0) return { type: 'none' };

  return { type: 'candidates', candidates: toCandidates(ids, words), confident: false };
}
