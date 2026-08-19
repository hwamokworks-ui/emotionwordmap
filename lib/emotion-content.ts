import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Region, WordRow, Relation } from '@/app/map/types';

// emotion_regions/emotion_words/emotion_word_relations는 공개 읽기 데이터라 로그인 세션(쿠키)과
// 무관하다. 그런데도 지도 로딩과 검색(resolveWordAction)이 매번 이 434개 단어 전체를 Supabase에서
// 새로 조회하고 있었다 — 지도·검색이 느려진 원인 중 하나. 세션 쿠키가 필요 없는 별도 클라이언트로
// 한 번만 조회해 캐시하고, 여러 곳에서 재사용한다.
function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
}

export const getEmotionContent = unstable_cache(
  async (): Promise<{ regions: Region[]; words: WordRow[]; relations: Relation[] }> => {
    const supabase = publicClient();
    // emotion_words.embedding(1536차원 벡터, 지금은 안 쓰임 — 0005_drop_word_embeddings.sql 참고) 같은
    // 무거운 컬럼이 실수로 딸려 오지 않도록 select('*') 대신 실제로 쓰는 컬럼만 명시한다.
    // unstable_cache는 결과를 2MB까지만 저장하는데, select('*')로 embedding까지 캐싱하려다 8.5MB가
    // 되어 캐시 자체가 실패한 적이 있었다.
    const [regionsRes, wordsRes, relationsRes] = await Promise.all([
      supabase.from('emotion_regions').select('id, name, root_word_id, color, area_color, text_color, mood, cx, cy, rx, ry'),
      supabase
        .from('emotion_words')
        .select(
          'id, region_id, word_form, noun_form, pos, prop, intensity, definition, example_sentence, scene_description, edge_bias_region_id, display_order'
        )
        .order('display_order'),
      supabase.from('emotion_word_relations').select('word_a_id, word_b_id'),
    ]);
    // 셋 중 하나라도 실패했는데 조용히 빈 배열로 넘기면, 그 반쪽짜리 결과가 캐시에 1시간 동안 그대로
    // 박제된다(예: relations는 620개 그대로인데 words만 비어서 지도가 깨지는 식) — 반드시 던져서
    // unstable_cache가 실패한 결과를 저장하지 않게 한다.
    const error = regionsRes.error ?? wordsRes.error ?? relationsRes.error;
    if (error) throw error;
    return { regions: (regionsRes.data ?? []) as Region[], words: (wordsRes.data ?? []) as WordRow[], relations: (relationsRes.data ?? []) as Relation[] };
  },
  // v2: DB 단어 데이터를 여러 번 고쳤는데도(`rm -rf .next/cache` + 개발 서버 완전 재시작까지 해봐도)
  // 이전 값이 계속 나온 적이 있었다 — unstable_cache 항목이 `.next/cache` 삭제·프로세스 재시작을
  // 넘어 살아남는 것으로 보여, 캐시 키 자체를 바꿔 예전 항목을 무효화했다. 콘텐츠를 다시 직접
  // 손대는 일이 있으면 이 키를 한 번 더 올려야 할 수도 있다.
  ['emotion-content-v3'],
  { revalidate: 3600 } // 어휘·지역·관계선은 SQL 마이그레이션으로만 바뀌는 콘텐츠라 1시간 정도는 묵혀도 된다.
);
