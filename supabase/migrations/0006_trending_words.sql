-- 홈 화면 "요즘 많이 찾는 감정"이 실제 사용자 발견 데이터를 보여줄 수 있게 하는 집계 함수.
-- 실행 방법: 0001~0005와 마찬가지로 Supabase 대시보드 SQL Editor에서 실행.
--
-- user_word_discoveries는 "own discoveries"(auth.uid() = user_id) 정책으로 보호돼 있어,
-- 일반 anon 키로는 본인 것 외 다른 사용자의 발견 기록을 읽을 수 없다(의도된 동작).
-- "이번 주 몇 명이 이 단어를 발견했는지" 같은 합산 숫자는 개인 식별 정보가 아니므로,
-- security definer로 RLS를 우회하되 원본 행이 아닌 집계 결과(단어 id·횟수)만 반환하는
-- 함수를 따로 둔다 — 누가 언제 발견했는지는 이 함수를 통해서도 알 수 없다.
create or replace function public.trending_word_counts(days_back int default 7, max_count int default 5)
returns table (word_id text, discover_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select word_id, count(*) as discover_count
  from public.user_word_discoveries
  where discovered_at > now() - (days_back || ' days')::interval
  group by word_id
  order by discover_count desc
  limit max_count;
$$;
