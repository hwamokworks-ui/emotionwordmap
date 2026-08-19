-- 자유 텍스트 검색의 의미 유사도 매칭을 위한 임베딩 컬럼.
-- 실행 방법: 0001~0003과 마찬가지로 Supabase 대시보드 SQL Editor에서 실행.

create extension if not exists vector;

alter table public.emotion_words
  add column if not exists embedding vector(1536); -- OpenRouter openai/text-embedding-3-small 차원 수

-- 434개뿐이라 인덱스 없이도 순차 스캔이 충분히 빠르지만, 앞으로 단어가 늘어날 걸 감안해 만들어둔다.
create index if not exists emotion_words_embedding_idx
  on public.emotion_words using hnsw (embedding vector_cosine_ops);

-- 서버(anon 키)에서 "가장 가까운 단어 찾기"를 한 번의 요청으로 하기 위한 함수.
-- emotion_words가 이미 공개 읽기 정책이라 이 함수도 같은 데이터를 반환할 뿐이라 별도 권한 문제가 없다.
create or replace function public.match_word_embedding(
  query_embedding vector(1536),
  match_count int default 1
)
returns table (id text, similarity float)
language sql stable
as $$
  select id, 1 - (embedding <=> query_embedding) as similarity
  from public.emotion_words
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
