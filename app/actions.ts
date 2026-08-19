'use server';

import { createClient } from '@/lib/supabase/server';
import { classifyWordWithLLM } from '@/lib/ai-match';

// index.html의 resolveWord()를 그대로 이식 — 원형/명사형에 먼저 매칭하고, 못 찾으면
// 원형에서 기계적으로 뗀 어간으로 한 번 더 매칭한다(KEYWORDS 배열 대신 서버에서 즉석 계산).
function stemOf(wordForm: string) {
  return wordForm.replace(/(하다|되다|스럽다|답다|롭다|다)$/, '');
}

function literalMatch(t: string, words: { id: string; word_form: string; noun_form: string }[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const { id, word_form: w, noun_form: n } of words) {
    if (w && t.includes(w) && w.length * 3 > bestScore) {
      bestScore = w.length * 3;
      best = id;
    }
    if (n && t.includes(n) && n.length * 3 > bestScore) {
      bestScore = n.length * 3;
      best = id;
    }
  }
  if (best) return best;

  for (const { id, word_form: w } of words) {
    const stem = stemOf(w);
    if (stem && stem.length >= 2 && t.includes(stem) && stem.length * 2 > bestScore) {
      bestScore = stem.length * 2;
      best = id;
    }
  }
  return best;
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

  const supabase = await createClient();
  const { data: words } = await supabase.from('emotion_words').select('id, word_form, noun_form, definition, region_id');
  if (!words) return { type: 'none' };

  // 1) 글자 그대로 매칭 — 빠르고 무료. 확실한 경우라도 바로 이동하지 않고 후보(1개)로 보여준 뒤
  // 사용자가 직접 클릭해서 들어가게 한다 — AI가 확신 없이 골랐을 수도 있으니 항상 확인을 거치게 한다.
  const literal = literalMatch(t, words);
  if (literal) return { type: 'candidates', candidates: toCandidates([literal], words), confident: true };

  // 2) 글자로 못 찾으면 의미로 찾는다 — LLM이 골라준 후보를 그대로 신뢰하지 않고
  // 최대 5개를 사용자에게 보여줘 직접 고르게 한다 (30문장 평가 기준 top-1 정확도 30%대로 낮음).
  const ids = await classifyWordWithLLM(t, words);
  if (ids.length === 0) return { type: 'none' };

  return { type: 'candidates', candidates: toCandidates(ids, words), confident: false };
}
