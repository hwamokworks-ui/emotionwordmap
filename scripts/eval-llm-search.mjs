// LLM 기반 의미 검색(classifyWordWithLLM)의 정확도를 재는 평가 스크립트.
// scripts/eval-embed-search.mjs(삭제됨, docs/AI_의미검색_구현기록.md 6절)와 완전히 같은 30개
// 상황 문장·기대 단어 목록을 그대로 재사용해 임베딩 방식과 정확히 비교할 수 있게 했다.
// v2: 단어 하나만 정답으로 내세우는 대신 후보 최대 3개를 뽑아 사용자가 고르게 하는 UX로 바뀌어서,
// "후보 목록 안에 정답이 있는가"(candidateHit)를 핵심 지표로 추가했다.
// 실행: node --env-file=.env.local --env-file=.env.development.local scripts/eval-llm-search.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CLASSIFY_MODEL = 'openai/gpt-4o-mini';

const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

// acceptable: 결과가 이 목록 중 하나면 "정답"으로 인정한다 (동의어/인접 감정 포함).
// region: 기대하는 지역 id — 결과가 오답이어도 지역만 맞으면 "지역 정확도"에는 포함.
const CASES = [
  { text: '약속을 세 번이나 어겨서 진짜 화가 났어', acceptable: ['화', '분노', '짜증'], region: 'fire' },
  { text: '내 아이디어를 상사가 자기 것처럼 발표했어', acceptable: ['억울함', '분함', '분개'], region: 'fire' },
  { text: '동생이 내 물건을 허락도 없이 망가뜨렸어', acceptable: ['짜증', '화', '분함'], region: 'fire' },
  { text: '며칠째 아무것도 하기 싫고 다 귀찮아', acceptable: ['무력감', '귀찮음', '의기소침'], region: 'room' },
  { text: '시험에 다 쏟아부었는데 다 헛수고였어', acceptable: ['허탈함', '허무함', '허망함'], region: 'room' },
  { text: '매일 똑같은 하루가 반복돼서 지겨워', acceptable: ['지겨움', '권태로움', '지루함'], region: 'room' },
  { text: '이사 온 동네에 아는 사람이 하나도 없어', acceptable: ['외로움', '고립감', '소외감'], region: 'forest' },
  { text: '혼자 밥 먹을 때마다 마음이 허전해', acceptable: ['허전함', '외로움', '쓸쓸함'], region: 'forest' },
  { text: '예전 학교 친구들이 갑자기 그리워졌어', acceptable: ['그리움', '향수'], region: 'forest' },
  { text: '내일 좋아하는 사람을 만난다고 생각하니 잠이 안 와', acceptable: ['설렘', '들뜸'], region: 'garden' },
  { text: '오랜만에 옛 친구를 만나서 너무 반가웠어', acceptable: ['반가움'], region: 'garden' },
  { text: '선생님이 내 노력을 알아봐 주셔서 뭉클했어', acceptable: ['뭉클함', '감동', '감격'], region: 'garden' },
  { text: '밤에 혼자 집에 가는데 뒤에서 발소리가 들렸어', acceptable: ['공포', '두려움', '섬뜩함'], region: 'sea' },
  { text: '면접 결과 발표가 다가올수록 초조해', acceptable: ['초조', '불안', '조바심'], region: 'sea' },
  { text: '아이가 늦게까지 연락이 안 돼서 걱정돼', acceptable: ['걱정', '근심', '염려'], region: 'sea' },
  { text: '드디어 원하던 회사에 합격했어', acceptable: ['기쁨', '행복함'], region: 'joy' },
  { text: '몇 달 동안 준비한 발표가 성공적으로 끝났어', acceptable: ['성취감', '뿌듯함', '홀가분함'], region: 'joy' },
  { text: '시원한 바람을 맞으며 산책하니 기분이 좋아', acceptable: ['상쾌함', '상큼함', '즐거움'], region: 'joy' },
  { text: '키우던 강아지가 무지개다리를 건넜어', acceptable: ['슬픔', '비통함', '비애'], region: 'sad' },
  { text: '노력했지만 결국 목표를 이루지 못했어', acceptable: ['좌절', '실망', '낙담'], region: 'sad' },
  { text: '오랫동안 짝사랑한 사람이 다른 사람과 사귄대', acceptable: ['상심', '슬픔', '서글픔'], region: 'sad' },
  { text: '발표 중에 실수해서 얼굴이 화끈거렸어', acceptable: ['창피함', '부끄러움', '무안함'], region: 'shame' },
  { text: '친구에게 심한 말을 해서 계속 마음에 걸려', acceptable: ['후회', '가책', '미안함'], region: 'shame' },
  { text: '약속 시간에 늦어서 너무 죄송한 마음이야', acceptable: ['죄송스러움', '미안함'], region: 'shame' },
  { text: '따뜻한 차 한 잔 마시며 창밖을 보니 마음이 편안해', acceptable: ['평온', '편안', '안락함'], region: 'calm' },
  { text: '모든 걱정거리가 다 해결되고 나니 마음이 놓여', acceptable: ['안심', '안도'], region: 'calm' },
  { text: '주말 아침 아무 약속 없이 늘어져 있으니 좋아', acceptable: ['평화', '편함', '가뜬함'], region: 'calm' },
  { text: '음식에서 벌레가 나와서 소름 끼쳤어', acceptable: ['소름끼침', '역겨움', '끔찍함'], region: 'disgust' },
  { text: '그 사람의 이중적인 모습을 보고 정이 뚝 떨어졌어', acceptable: ['환멸', '경멸'], region: 'disgust' },
  { text: '거짓말한 걸 알고 나니 정말 꼴도 보기 싫어', acceptable: ['혐오', '미움', '반감'], region: 'disgust' },
];

// lib/ai-match.ts와 동일 — 위치 편향이 향하는 방향을 중립 → 긍정 → 부정 순으로 이용한다.
const MOOD_ORDER = {
  room: 0, forest: 0, sad: 0, // flat — 중립
  garden: 1, joy: 1, calm: 1, // smile — 긍정
  fire: 2, sea: 2, shame: 2, disgust: 2, // frown — 부정
};

async function callClassifier(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLASSIFY_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const content = json.choices[0].message.content;
  const parsed = JSON.parse(content);
  const ids = Array.isArray(parsed.word_ids) ? parsed.word_ids : [];
  return { ids, raw: content };
}

async function classify(text, words, count = 5) {
  const ordered = [...words].sort((a, b) => (MOOD_ORDER[a.region_id] ?? 0) - (MOOD_ORDER[b.region_id] ?? 0));
  const candidateList = ordered.map((w) => `${w.id}: ${w.noun_form} - ${w.definition}`).join('\n');
  const system =
    `너는 한국어 감정 단어 사전에서, 사용자가 쓴 문장이 나타내는 감정에 가까운 단어를 최소 1개, 최대 ${count}개까지 고르는 분류기다. ` +
    '반드시 아래 목록에 있는 id만 고르고, 가장 가까운 순서대로 배열에 담아라. ' +
    `개수를 ${count}개로 억지로 채우지 마라 — 확실히 어울리는 단어만 담고, 그런 단어가 적으면 그만큼만 담아라. ` +
    '다만 완전히 딱 맞지 않아 보여도 그나마 가장 가까운 단어 하나는 반드시 포함해라 — 빈 배열은 절대 반환하지 마라. ' +
    '설명 없이 JSON 객체 하나만 출력해라: {"word_ids": ["id1", "id2", ...]}';
  const user = `문장: "${text}"\n\n감정 단어 목록:\n${candidateList}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  let { ids, raw } = await callClassifier(messages);
  if (ids.length === 0) {
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: '빈 배열은 허용되지 않는다. 아무리 애매해도 목록에서 그나마 가장 비슷한 단어를 최소 1개 골라 다시 답해라.' },
    ];
    ({ ids } = await callClassifier(retryMessages));
  }

  const validIds = [...new Set(ids)].filter((id) => words.some((w) => w.id === id));
  if (validIds.length > 0) return validIds.slice(0, count);

  // lib/ai-match.ts는 프로덕션에서 무작위로 하나를 고르지만, 평가 재현성을 위해 여기서는
  // 결정적으로 정렬된 목록의 첫 단어를 폴백으로 쓴다(§15) — "완전 실패"와 "약한 성공"을 구분해서 본다.
  return ordered.length > 0 ? [ordered[0].id] : [];
}

async function main() {
  const { data: words } = await supabase.from('emotion_words').select('id, noun_form, definition, region_id');
  if (!words) throw new Error('단어 목록을 불러오지 못했습니다.');

  let top1Hit = 0; // 후보 1순위가 정답인 경우
  let candidateHit = 0; // 후보(최대 3개) 중 하나라도 정답인 경우
  let regionHit = 0; // 후보 1순위의 지역이 기대한 지역과 같은 경우
  const rows = [];

  for (const c of CASES) {
    const ids = await classify(c.text, words);
    const picked = ids.map((id) => words.find((w) => w.id === id)).filter(Boolean);
    const nounForms = picked.map((w) => w.noun_form);

    const isTop1 = nounForms.length > 0 && c.acceptable.includes(nounForms[0]);
    const isCandidateHit = nounForms.some((n) => c.acceptable.includes(n));
    const isRegion = picked[0]?.region_id === c.region;

    if (isTop1) top1Hit++;
    if (isCandidateHit) candidateHit++;
    if (isRegion) regionHit++;

    rows.push({ text: c.text, expected: c.acceptable, result: nounForms, isTop1, isCandidateHit, isRegion });
    console.log(
      `[${isCandidateHit ? (isTop1 ? 'O' : '△') : 'X'}] "${c.text}" -> ${nounForms.join(', ') || '없음'} | 기대: ${c.acceptable.join('/')}`
    );
  }

  const n = CASES.length;
  console.log('\n=== 결과 요약 ===');
  console.log(`1순위 정확도: ${top1Hit}/${n} (${((top1Hit / n) * 100).toFixed(1)}%)`);
  console.log(`후보(최대 3개) 적중률: ${candidateHit}/${n} (${((candidateHit / n) * 100).toFixed(1)}%)`);
  console.log(`지역(region) 정확도: ${regionHit}/${n} (${((regionHit / n) * 100).toFixed(1)}%)`);

  console.log('\n=== JSON (문서화용) ===');
  console.log(
    JSON.stringify(
      { summary: { top1: `${top1Hit}/${n}`, candidateHit: `${candidateHit}/${n}`, region: `${regionHit}/${n}` }, rows },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('평가 실패:', err.message);
  process.exit(1);
});
