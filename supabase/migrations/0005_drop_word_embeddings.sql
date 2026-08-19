-- 임베딩 코사인 유사도 기반 의미 검색을 LLM 직접 분류 방식으로 교체하면서
-- 더 이상 쓰지 않는 pgvector 인프라를 정리한다.
-- 배경: docs/AI_의미검색_구현기록.md — 30문장 평가에서 top-1 정확도 23.3%로
-- 실사용에 부족하다고 판단해 lib/ai-match.ts(LLM 분류)로 교체했다.

drop function if exists public.match_word_embedding(vector(1536), int);
drop index if exists public.emotion_words_embedding_idx;
alter table public.emotion_words drop column if exists embedding;
