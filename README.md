# 감정 어휘 지도 (Emotion Word Map)

지금의 마음을 한 줄 적으면, 그 마음이 놓인 자리를 지도에서 찾아주는 감정 어휘 탐색 서비스입니다. 하나의 감정에서 멈추지 않고, 연결된 단어를 따라가며 더 정확한 감정 어휘를 발견할 수 있습니다.

- **서비스 링크**: https://emotionwordmap.vercel.app
- **저장소**: https://github.com/hwamokworks-ui/emotionwordmap

## 화면 구성

| 경로 | 설명 |
|---|---|
| `/` (`app/page.tsx`) | 감정 찾기(홈) — 마음을 적어 검색하거나, 상황 카드로 감정을 찾음. "오늘의 한 단어"·"요즘 많이 찾는 감정" 위젯 포함 |
| `/map` (`app/map/`) | 감정 지도 — 434개 단어·10개 영역·620개 연결로 이루어진 데이터 기반 인터랙티브 지도(모바일 터치 팬/핀치줌 지원) |
| `/archive` (`app/archive/`) | 감정 서고 — 발견·저장·마음 기록 통계, 기간별 그래프, 지역 완성도, 뱃지 |
| `/login` (`app/login/`) | 로그인 · 회원가입 (이메일 + 비밀번호, 탭으로 전환) |

로그인 없이도 지도 탐색·발견·저장·기록은 그대로 됩니다(브라우저 `localStorage`에 보관). 로그인하면 같은 기록이 Supabase에 쌓여서 날짜를 넘긴 일별·월별·연도별 리포트를 볼 수 있습니다.

## 감정 찾기 — 자유 문장 검색

검색창에 상황을 문장으로 적으면 두 단계로 감정 단어를 찾습니다.

1. **글자 매칭** — 문장에 감정 단어의 원형·명사형·어간이 그대로 포함돼 있는지 본다.
2. **AI 의미 분류** — 글자로 못 찾으면 OpenRouter(`openai/gpt-4o-mini`)에게 434개 단어 후보를 주고 가까운 단어를 최대 5개 고르게 한다.

어느 쪽이든 결과는 후보 카드로 보여주고 **사용자가 직접 클릭해야만** 지도로 이동합니다 — AI 분류 결과는 정확도가 완벽하지 않다는 걸 그대로 드러내는 편이 안전하다고 판단했습니다. 이 기능을 만들며 겪은 시행착오(임베딩 방식 폐기, 위치 편향 발견, UX 설계 결정)는 `docs/AI_의미검색_구현기록.md`에 정리했습니다.

## 기술 스택

- **Next.js 16(App Router) + React 19**, Tailwind CSS는 CDN으로 로드
- **Supabase** — Postgres(콘텐츠: 영역·단어·관계선 등) + Auth(이메일/비밀번호) + RLS(본인 데이터만 읽고 쓰기)
- **OpenRouter(LLM)** — 자유 문장 → 감정 단어 의미 검색(`lib/ai-match.ts`)
- DB·AI API 접근 코드는 전부 서버(Route Handler / Server Action / Server Component)에만 있고, 클라이언트 번들에는 노출되지 않음
- 공통 디자인 토큰: `public/design-system/tokens.css`, 문서는 `design-system/DESIGN.md`
- 게스트 상태 저장: `localStorage`(`ewm_store_v1` 키)

## 프로젝트 구조

```
app/                  감정 찾기(/) · 로그인 · 인증 콜백
app/map/              감정 지도 — Server Component가 Supabase에서 조회, Client Component가 판/줌·상세 패널 담당
app/archive/          감정 서고 — 통계·그래프·뱃지
app/login/            로그인·회원가입 (탭 전환)
app/auth/signout/     로그아웃 Route Handler
lib/supabase/         서버 전용 Supabase 클라이언트(server.ts) · 세션 갱신(middleware.ts)
lib/ai-match.ts        자유 문장 → 감정 단어 후보 LLM 분류 (OpenRouter, 서버 전용)
lib/home-widgets.ts    홈 화면 "오늘의 한 단어"·"요즘 많이 찾는 감정" — 실데이터 우선, 부족하면 추천으로 채움
proxy.ts              모든 요청 전 세션 쿠키 갱신(Next.js의 미들웨어 방식)
supabase/migrations/  0001 스키마 · 0002 시드 데이터 · 0003 프로필 트리거 · 0004 임베딩 컬럼(0005에서 폐기) ·
                       0005 임베딩 인프라 제거 · 0006 트렌딩 집계 함수
scripts/              eval-llm-search.mjs — 의미 검색 정확도 평가(30문장)
data/                 시드 데이터 원본(JSON) — 434개 단어·10개 영역·620개 관계선
public/design-system/ 정적 자산(디자인 토큰 CSS)
docs/                 설계·구현 기록 — 어휘 선정 기준, AI 검색 구현기, 홈 위젯 구현기
```

## 로컬에서 실행하기

```bash
npm install
```

`.env.local`에 Supabase 값을 채웁니다. `NEXT_PUBLIC_` 접두어를 쓰지 않아 서버에서만 읽힙니다.

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

`.env.development.local`에는 민감한 키를 따로 둡니다(둘 다 절대 커밋되지 않음).

```
SUPABASE_SERVICE_ROLE_KEY=   # 현재 실행 중인 앱·스크립트 어디에서도 쓰지 않음(향후 1회성 관리 스크립트용으로만 보관)
OPENROUTER_API_KEY=          # lib/ai-match.ts의 의미 검색에 필요
```

DB가 비어 있다면 Supabase 대시보드 → SQL Editor에서 `supabase/migrations/` 아래 파일을 `0001` → `0002` → `0003` → `0004` → `0005` → `0006` 순서로 실행합니다.

```bash
npm run dev
```

`http://localhost:3000` 접속 시 감정 찾기 화면이 바로 열립니다.

### 그 외 명령

```bash
npm run build       # 프로덕션 빌드
npm run typecheck   # TypeScript 타입 검사

node --env-file=.env.local --env-file=.env.development.local scripts/eval-llm-search.mjs
# 의미 검색(자유 문장 → 감정 단어) 정확도를 30개 문장으로 평가
```

## 배포

GitHub `main` 브랜치에 푸시되면 Vercel과 연동되어 있어 프리뷰가 생성됩니다. 프로덕션 반영은 다음처럼 진행합니다.

```bash
git add -A
git commit -m "설명"
git push
npx vercel --prod
```

Vercel 프로젝트의 환경변수(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`)도 로컬과 동일하게 설정되어 있어야 합니다.

## 더 읽을거리

- `docs/감정지도_어휘기준.md` — 10개 영역·434개 단어를 어떤 기준으로 골랐는지
- `docs/AI_의미검색_구현기록.md` — 자유 문장 검색 기능의 시행착오와 최종 동작
- `docs/홈_위젯_구현기록.md` — 홈 화면 "오늘의 한 단어"·"요즘 많이 찾는 감정" 설계
- `design-system/DESIGN.md` — 디자인 토큰·화면별 스타일 가이드
