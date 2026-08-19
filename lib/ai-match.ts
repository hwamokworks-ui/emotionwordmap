// 서버 전용. OPENROUTER_API_KEY는 여기서만 읽고, 클라이언트로 절대 전달하지 않는다.
//
// 글자 매칭이 실패한 자유 문장을 감정 단어에 연결하는 마지막 단계.
// 임베딩 코사인 유사도 방식(구 lib/embeddings.ts)은 "소재는 비슷하지만 감정 방향은 반대"인
// 문장을 구분하지 못해 30문장 평가에서 top-1 정확도 23.3%에 그쳤다 (docs/AI_의미검색_구현기록.md 참고).
// 그래서 벡터 유사도 대신 LLM에게 문장과 후보 단어 목록을 통째로 주고 직접 고르게 하는 방식으로 교체했다.
const CLASSIFY_MODEL = 'openai/gpt-4o-mini';

// 30문장 평가에서 top-1 정확도가 30%에 그쳐(docs/AI_의미검색_구현기록.md §9), 단어 하나만 골라 보여주기엔
// 믿음직하지 않다고 판단했다. 그래서 AI가 확신하지 못하는 상황을 인정하고, 후보를 여러 개 뽑아
// 사용자가 직접 고르게 하는 방식으로 바꿨다. 3개→5개로 늘린 이유·효과는 §12 참고.

// 434개를 한 프롬프트에 다 넣으면 목록 앞쪽 지역이 과다 선택되는 위치 편향이 있다(§13).
// 편향을 없애기보다, 그 편향이 향하는 방향을 중립 → 긍정 → 부정 순으로 골라 이용하기로 했다 —
// 지역 mood는 emotion_regions.mood(frown/flat/smile)와 동일한 값이다.
const MOOD_ORDER: Record<string, number> = {
  room: 0, forest: 0, sad: 0, // flat — 중립
  garden: 1, joy: 1, calm: 1, // smile — 긍정
  fire: 2, sea: 2, shame: 2, disgust: 2, // frown — 부정
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function requestIds(apiKey: string, messages: ChatMessage[]): Promise<{ ids: string[]; raw: string | null }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLASSIFY_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  });
  if (!res.ok) return { ids: [], raw: null }; // 분류 실패는 조용히 넘어가고 글자 매칭 결과만 쓴다 — 검색 자체가 죽으면 안 되므로.

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return { ids: [], raw: null };

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ids: [], raw: content };
  }

  const ids = Array.isArray(parsed?.word_ids) ? parsed.word_ids : [];
  return { ids: ids.filter((id: unknown): id is string => typeof id === 'string'), raw: content };
}

export async function classifyWordWithLLM(
  text: string,
  words: { id: string; noun_form: string; definition: string; region_id: string }[],
  count = 7
): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  const ordered = [...words].sort((a, b) => (MOOD_ORDER[a.region_id] ?? 0) - (MOOD_ORDER[b.region_id] ?? 0));
  const candidateList = ordered.map((w) => `${w.id}: ${w.noun_form} - ${w.definition}`).join('\n');
  // "확신 없으면 개수를 채우지 마라"·"애매하면 빈 배열도 된다" 지시를 30문장 평가에서 써봤더니
  // 오히려 정답 포함 확률이 떨어졌다(66.7%→60.0%, docs/AI_의미검색_구현기록.md §4) — 억지로라도
  // 채운 후보 중에 정답이 딸려 들어오는 경우가 많았기 때문이다. 그래서 다시 "무조건 채워라" 방식으로
  // 되돌리고, 그물을 더 넓히기 위해 개수도 5개 → 7개로 늘렸다.
  const system =
    `너는 한국어 감정 단어 사전에서, 사용자가 쓴 문장이 나타내는 감정에 가까운 단어를 가장 가까운 순서로 정확히 ${count}개 고르는 분류기다. ` +
    `반드시 아래 목록에 있는 id만 고르고, 가장 가까운 순서대로 배열에 담아라. ` +
    `확신이 낮아도 상관없다 — 어떤 문장이든 그나마 가장 가까운 단어 ${count}개를 반드시 채워서 반환해라. 빈 배열이나 ${count}개 미만은 허용되지 않는다. ` +
    '설명 없이 JSON 객체 하나만 출력해라: {"word_ids": ["id1", "id2", ...]}';
  const user = `문장: "${text}"\n\n감정 단어 목록:\n${candidateList}`;
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const { ids } = await requestIds(apiKey, messages);

  // 모델이 같은 id를 두 번 이상 반환할 때가 있다(예: "환멸"이 한 응답에 3번 나온 적도 있었다) —
  // 중복을 그대로 후보 카드로 넘기면 React key가 겹쳐서 렌더링이 꼬인다.
  return [...new Set(ids)].filter((id) => words.some((w) => w.id === id)).slice(0, count);
}
