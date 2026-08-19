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
  count = 5
): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  const ordered = [...words].sort((a, b) => (MOOD_ORDER[a.region_id] ?? 0) - (MOOD_ORDER[b.region_id] ?? 0));
  const candidateList = ordered.map((w) => `${w.id}: ${w.noun_form} - ${w.definition}`).join('\n');
  const system =
    `너는 한국어 감정 단어 사전에서, 사용자가 쓴 문장이 나타내는 감정에 가까운 단어를 최소 1개, 최대 ${count}개까지 고르는 분류기다. ` +
    '반드시 아래 목록에 있는 id만 고르고, 가장 가까운 순서대로 배열에 담아라. ' +
    `개수를 ${count}개로 억지로 채우지 마라 — 확실히 어울리는 단어만 담고, 그런 단어가 적으면 그만큼만 담아라. ` +
    '다만 완전히 딱 맞지 않아 보여도 그나마 가장 가까운 단어 하나는 반드시 포함해라 — 빈 배열은 절대 반환하지 마라. ' +
    '설명 없이 JSON 객체 하나만 출력해라: {"word_ids": ["id1", "id2", ...]}';
  const user = `문장: "${text}"\n\n감정 단어 목록:\n${candidateList}`;
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  let { ids, raw } = await requestIds(apiKey, messages);
  // 프롬프트에서 "빈 배열 금지"를 지시해도 모델이 종종 무시한다(30문장 평가에서 확인, docs/AI_의미검색_구현기록.md §15).
  // 완전히 새 요청 대신 같은 대화에서 한 번 더 강하게 요구해 재고를 유도한다.
  if (ids.length === 0 && raw) {
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: '빈 배열은 허용되지 않는다. 아무리 애매해도 목록에서 그나마 가장 비슷한 단어를 최소 1개 골라 다시 답해라.',
      },
    ];
    ({ ids } = await requestIds(apiKey, retryMessages));
  }

  const validIds = ids.filter((id) => words.some((w) => w.id === id));
  if (validIds.length > 0) return validIds.slice(0, count);

  // 재요청까지 해도 모델이 빈 배열을 고집하는 경우가 실제로 있다(30문장 평가 기준 30% 안팎, §15).
  // "예시 단어가 없어도 한 단어라도 보여주고 클릭하게 해달라"는 요구를 프롬프트만으로는 보장할 수 없어,
  // 최후 수단으로 무작위 단어 하나를 반환한다 — 품질 보장은 없지만(매번 같은 단어만 나오는 것보다는 낫다),
  // 최소한 사용자가 클릭해 지도로 들어가거나 표현을 고쳐 다시 시도할 실마리는 남는다.
  if (ordered.length === 0) return [];
  return [ordered[Math.floor(Math.random() * ordered.length)].id];
}
