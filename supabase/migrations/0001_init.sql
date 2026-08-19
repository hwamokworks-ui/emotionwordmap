-- 감정 어휘 지도 — 초기 스키마
-- PRD.md ⑥ 데이터 구조 기준. 콘텐츠 마스터 테이블(관리자가 채움)과
-- 유저 행동 테이블(서비스 이용 중 쌓임)을 분리했다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run.
-- (테이블 생성은 anon/service_role API 키로는 할 수 없고, 대시보드 SQL Editor나
--  Supabase CLI의 DB 연결을 통해서만 가능하다.)

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- 자연어 검색 키워드 부분일치 인덱스

-- ============================================================
-- 콘텐츠 마스터 (관리자가 채움, 모두에게 읽기 공개)
-- ============================================================

create table public.emotion_regions (
  id text primary key,                        -- 'fire' 등, map.html REGIONS[].id와 동일
  name text not null,                         -- '분노의 영역'
  root_word_id text,                          -- FK는 emotion_words 생성 후 추가(순환 참조)
  color text not null,
  area_color text not null,
  text_color text,
  mood text not null check (mood in ('frown','flat','smile')),
  cx numeric not null,
  cy numeric not null,
  rx numeric not null,
  ry numeric not null,
  created_at timestamptz not null default now()
);

create table public.emotion_words (
  id text primary key,                        -- 'hwanada' 등 로마자 slug
  region_id text not null references public.emotion_regions(id) on delete restrict,
  word_form text not null,                    -- 원형, '화나다'
  noun_form text not null,                    -- 명사형(화면 표시용), '분노'
  pos text not null check (pos in ('형용사','동사','명사','관용구')),
  prop text not null check (prop in ('book','letter','map','flower','none')),
  intensity smallint not null check (intensity between 1 and 5),
  definition text not null,
  example_sentence text not null,
  scene_description text not null,
  edge_bias_region_id text references public.emotion_regions(id),  -- 경계 단어만 값 있음
  display_order integer not null,             -- 골든 앵글 스파이럴 배치 순서(영역 내 i값)
  created_at timestamptz not null default now()
);

alter table public.emotion_regions
  add constraint emotion_regions_root_word_fk
  foreign key (root_word_id) references public.emotion_words(id)
  deferrable initially deferred;

create index emotion_words_region_id_idx on public.emotion_words(region_id);

create table public.emotion_word_relations (
  word_a_id text not null references public.emotion_words(id) on delete cascade,
  word_b_id text not null references public.emotion_words(id) on delete cascade,
  primary key (word_a_id, word_b_id),
  check (word_a_id < word_b_id)                -- 정렬된 쌍만 허용해 역방향 중복 방지
);

create table public.intensity_labels (
  intensity smallint primary key check (intensity between 1 and 5),
  label text not null                          -- '매우 약함' ~ '매우 강함'
);

create table public.hero_greetings (
  id serial primary key,
  from_hour smallint not null check (from_hour between 0 and 23),
  to_hour smallint not null check (to_hour between 0 and 24),
  text text not null
);

create table public.situation_prompts (
  id serial primary key,
  label text not null,
  linked_word_id text not null references public.emotion_words(id)
);

create table public.search_keywords (
  id serial primary key,
  keyword text not null,
  word_id text not null references public.emotion_words(id) on delete cascade
);

create index search_keywords_keyword_trgm_idx
  on public.search_keywords using gin (keyword gin_trgm_ops);

create table public.badges (
  id text primary key,                         -- 'boundary-finder' 등
  name text not null,
  glyph text,
  description text not null,
  condition_type text not null,                -- 'discover_all' | 'discover_count' | 'save_count' 등
  threshold integer,
  created_at timestamptz not null default now()
);

create table public.daily_words (
  date date primary key,
  word_id text not null references public.emotion_words(id)
);

create table public.weekly_trending_words (
  week_start date not null,
  rank smallint not null,
  word_id text not null references public.emotion_words(id),
  discoverer_count integer not null default 0,
  primary key (week_start, rank)
);

-- ============================================================
-- 유저 행동 (auth.users 기준으로 쌓임)
-- profiles는 auth.users를 대체하지 않고 1:1로 확장하는 Supabase 표준 패턴이다.
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_initial text,
  status text,
  created_at timestamptz not null default now()
);

create table public.user_word_discoveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null references public.emotion_words(id) on delete cascade,
  discovered_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table public.user_word_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null references public.emotion_words(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null references public.emotion_words(id) on delete cascade,
  content text not null,
  situation text,                              -- stage5 대조에서 추가된 컬럼(PRD.md ⑥)
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create index user_notes_user_id_idx on public.user_notes(user_id);
create index user_notes_word_id_idx on public.user_notes(word_id);

-- ============================================================
-- Row Level Security
-- 서버는 service_role 키로 접근해 RLS를 우회하지만, anon 키가 실수로라도
-- 클라이언트에서 쓰이거나 나중에 클라이언트 직접 접근을 열 경우를 대비해
-- 모든 테이블에 RLS를 켜고 최소 권한 정책을 명시적으로 둔다.
-- ============================================================

alter table public.emotion_regions enable row level security;
alter table public.emotion_words enable row level security;
alter table public.emotion_word_relations enable row level security;
alter table public.intensity_labels enable row level security;
alter table public.hero_greetings enable row level security;
alter table public.situation_prompts enable row level security;
alter table public.search_keywords enable row level security;
alter table public.badges enable row level security;
alter table public.daily_words enable row level security;
alter table public.weekly_trending_words enable row level security;

create policy "public read" on public.emotion_regions for select using (true);
create policy "public read" on public.emotion_words for select using (true);
create policy "public read" on public.emotion_word_relations for select using (true);
create policy "public read" on public.intensity_labels for select using (true);
create policy "public read" on public.hero_greetings for select using (true);
create policy "public read" on public.situation_prompts for select using (true);
create policy "public read" on public.search_keywords for select using (true);
create policy "public read" on public.badges for select using (true);
create policy "public read" on public.daily_words for select using (true);
create policy "public read" on public.weekly_trending_words for select using (true);

alter table public.profiles enable row level security;
alter table public.user_word_discoveries enable row level security;
alter table public.user_word_saves enable row level security;
alter table public.user_notes enable row level security;
alter table public.user_badges enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own discoveries" on public.user_word_discoveries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saves" on public.user_word_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes" on public.user_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own badges" on public.user_badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
