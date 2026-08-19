**바이브코딩 기반 디지털플랫폼 제작**  
**6단계. 데이터베이스 설계**

# **① 데이터 항목 도출**

화면에 표시되는 정보를 역으로 분석해서, 화면이 실제로 동작하는 데 필요한 데이터 항목(테이블)을 뽑습니다. 문법이나 코드는 전혀 고려하지 않아도 됩니다.

**프롬프트**

| 5단계에서 완성한 화면설계 워크시트 파일(화면 흐름·요소, 화면 시안)을 첨부해줘. 이 화면들이 실제로 동작하려면 어떤 데이터가 저장되고 관리되어야 하는지 알려줘. 화면에 표시되는 정보를 역으로 분석해서 필요한 데이터 항목(테이블)을 뽑아줘. 각 항목이 어떤 화면 요소에서 왔는지도 한 줄씩 연결해서 설명해줘. |
| :---- |

| 테이블명 | 항목(컬럼) | 타입 (텍스트/숫자/날짜 등) | 출처 화면 |
| :---- | :---- | :---- | :---- |
| emotion\_regions | region\_id | 텍스트 | 감정 지도 — 영역 타원/라벨 |
|  | name | 텍스트 | 감정 지도 라벨, 감정 서고 지역 완성도 카드 제목 |
|  | root\_word\_id | 텍스트(FK) | 감정 지도 — 영역 중심 노드 |
|  | color | 텍스트(색상코드) | 감정 지도 — 노드/라벨 색상 |
|  | area\_color | 텍스트(색상코드) | 감정 지도 — 영역 워시 배경색 |
|  | text\_color | 텍스트(색상코드) | 감정 지도 — 영역 라벨 글자색 |
|  | mood | 텍스트 | 감정 지도 상세패널 — 캐릭터 표정(입모양) |
|  | cx, cy, rx, ry | 숫자 | 감정 지도 — 영역 타원이 그려지는 위치·크기 |
| emotion\_words | word\_id | 텍스트(PK) | 감정 지도 — URL 쿼리(?w=), 노드 클릭 대상 |
|  | verb\_form | 텍스트 | 감정 찾기 — 검색어 매칭용 원형 |
|  | noun\_form | 텍스트 | 감정 지도 노드 라벨, 상세패널 제목 |
|  | region\_id | 텍스트(FK) | 감정 지도 — 소속 영역 배치 |
|  | intensity | 숫자(1\~5) | 상세패널 — "감정 강도" 5칸 바 |
|  | pos | 텍스트 | 상세패널 — 제목 옆 품사 라벨 |
|  | prop | 텍스트 | 상세패널 — 캐릭터 일러스트 소품 |
|  | definition | 텍스트 | 상세패널 — 뜻풀이 문장 |
|  | example\_sentence | 텍스트 | 상세패널 — 예문 인용구, "문장 복사" 버튼 |
|  | scene\_description | 텍스트 | 상세패널 — 캐릭터 장면 설명 |
|  | display\_order | 숫자 | 감정 지도 — 노드가 영역 안에서 나선형으로 배치되는 순서 |
| emotion\_word\_relations | word\_a\_id | 텍스트(FK) | 감정 지도 — 노드 간 연결선 |
|  | word\_b\_id | 텍스트(FK) | 감정 지도 — 노드 간 연결선, 상세패널 "가까운 감정"/"조금 다른 감정" |
| intensity\_labels | intensity | 숫자(PK) | 상세패널 — "감정 강도" 바와 매칭되는 기준값 |
|  | label | 텍스트 | 상세패널 — 강도 바 옆 문구("매우 약함"\~"매우 강함") |
| hero\_greetings | from\_hour, to\_hour | 숫자 | 감정 찾기 — 시간대별 헤드라인 적용 시간 범위 |
|  | text | 텍스트 | 감정 찾기 — 상단 헤드라인 문구("고요한 새벽의 책상에…" 등) |
| users | user\_id | 텍스트(PK) | 공통 상단 유저칩(현재 미구현) |
|  | display\_name | 텍스트 | 상단 유저칩 — 이름("이준호") |
|  | avatar\_initial | 텍스트 | 상단 유저칩 — 아바타 원 글자 |
|  | status | 텍스트 | 상단 유저칩 — 상태 점 |
| user\_word\_discoveries | user\_id | 텍스트(FK) | 공통(누구의 기록인지) |
|  | word\_id | 텍스트(FK) | 감정 지도 — 채색된(발견된) 노드 |
|  | discovered\_at | 날짜/시간 | 감정 서고 — "발견 추이" 일/월/연도별 그래프 |
| user\_word\_saves | user\_id | 텍스트(FK) | 공통 |
|  | word\_id | 텍스트(FK) | 상세패널 — "이 단어 저장하기" 버튼 |
|  | saved\_at | 날짜/시간 | 감정 서고 — "저장 추이" 그래프, "저장한 단어" 칩 목록 |
| user\_notes | note\_id | 텍스트/숫자(PK) | — (내부 식별용) |
|  | user\_id | 텍스트(FK) | 공통 |
|  | word\_id | 텍스트(FK) | 상세패널 — 마음 기록 섹션 |
|  | text | 텍스트 | 상세패널 — 마음 기록 입력창, 감정 서고 "마음 기록" 카드 본문 |
|  | created\_at | 날짜/시간 | 감정 서고 — 마음 기록 카드 날짜 표시 |
| badges | badge\_id | 텍스트(PK) | 감정 서고 — 감정 뱃지 그리드 |
|  | name | 텍스트 | 뱃지 카드 — 이름("첫 발견" 등) |
|  | glyph | 텍스트 | 뱃지 카드 — 인장 안 한자 아이콘 |
|  | description | 텍스트 | 뱃지 카드 — 조건 설명 문구 |
|  | condition\_type | 텍스트 | 뱃지 조건 종류(발견수/쌍수/저장수/기록수 등) |
|  | threshold | 숫자 | 뱃지 조건 임계값(예: 12개, 8쌍) |
| user\_badges | user\_id | 텍스트(FK) | 공통 |
|  | badge\_id | 텍스트(FK) | 뱃지 카드 — 달성 여부(진하게/흐리게) |
|  | earned\_at | 날짜/시간 | 뱃지 획득 시점 |
| situation\_prompts | situation\_id | 텍스트(PK) | 감정 찾기 — "어떤 상황인가요?" 카드 |
|  | label | 텍스트 | 상황 카드 문구("애인과 헤어졌을 때" 등) |
|  | linked\_word\_id | 텍스트(FK) | 상황 카드 클릭 시 이동할 단어 |
|  | accent\_color | 텍스트(색상코드) | 상황 카드 테두리색 |
| search\_keywords | keyword\_id | 숫자(PK) | — (내부 식별용) |
|  | keyword | 텍스트 | 감정 찾기 — 입력창 구어체 검색어("화나","열받" 등) |
|  | word\_id | 텍스트(FK) | 감정 찾기 — 검색 결과로 연결되는 단어 |
| daily\_word | date | 날짜 | 감정 찾기 — "오늘의 한 단어" 카드 |
|  | word\_id | 텍스트(FK) | 감정 찾기 — 카드의 "지도에서 발견하기" 링크 대상 |
| weekly\_trending\_words | week | 날짜(주차) | 감정 찾기 — "요즘 많이 찾는 감정" 리스트 |
|  | rank | 숫자 | 리스트 항목 순번(1\~5) |
|  | word\_id | 텍스트(FK) | 리스트 항목 — 감정 단어 |
|  | discoverer\_count | 숫자 | 리스트 항목 — "1,204명" 등 인원수 표시 |

# **② Supabase 테이블 설계로 다듬기**

**📝 프롬프트 예시**

| 위에서 도출한 데이터 항목들을 Supabase 테이블로 만들 수 있게 정리해줘. 각 테이블의 이름, 항목(컬럼)별 이름과 타입을 표로 만들고, 테이블끼리는 어떻게 연결되는지(예: 한 사용자가 여러 재료를 가짐) 비개발자도 이해할 수 있는 말로 설명해줘. |
| :---- |

**1\. 테이블 · 컬럼 · 타입**  
**users (사용자 — Supabase Auth의 auth.users와 연결)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| users | id (PK, auth.users 참조) | uuid |
| users | display\_name | text |
| users | avatar\_initial | text |
| users | status | text |
| users | created\_at | timestamptz |

 

**emotion\_regions (감정 영역 마스터 — 관리자가 채우는 고정 데이터)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| emotion\_regions | id (PK) | text |
| emotion\_regions | name | text |
| emotion\_regions | root\_word\_id (FK) | text |
| emotion\_regions | color | text |
| emotion\_regions | area\_color | text |
| emotion\_regions | text\_color | text |
| emotion\_regions | mood | text |
| emotion\_regions | cx | real |
| emotion\_regions | cy | real |
| emotion\_regions | rx | real |
| emotion\_regions | ry | real |

 

**emotion\_words (감정 단어 마스터, 145개)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| emotion\_words | id (PK) | text |
| emotion\_words | verb\_form | text |
| emotion\_words | noun\_form | text |
| emotion\_words | region\_id (FK) | text |
| emotion\_words | intensity (FK → intensity\_labels) | smallint |
| emotion\_words | pos | text |
| emotion\_words | prop | text |
| emotion\_words | definition | text |
| emotion\_words | example\_sentence | text |
| emotion\_words | scene\_description | text |
| emotion\_words | display\_order | smallint |

 

**emotion\_word\_relations (단어 간 연결, 203개 엣지)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| emotion\_word\_relations | id (PK) | uuid |
| emotion\_word\_relations | word\_a\_id (FK) | text |
| emotion\_word\_relations | word\_b\_id (FK) | text |

 

**intensity\_labels (강도 라벨 마스터 — 신규)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| intensity\_labels | intensity (PK) | smallint |
| intensity\_labels | label | text |

 

**hero\_greetings (시간대별 인사말 — 신규)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| hero\_greetings | id (PK) | uuid |
| hero\_greetings | from\_hour | smallint |
| hero\_greetings | to\_hour | smallint |
| hero\_greetings | text | text |

 

**user\_word\_discoveries (발견 기록)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| user\_word\_discoveries | id (PK) | uuid |
| user\_word\_discoveries | user\_id (FK) | uuid |
| user\_word\_discoveries | word\_id (FK) | text |
| user\_word\_discoveries | discovered\_at | timestamptz |

 

**user\_word\_saves (저장 기록)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| user\_word\_saves | id (PK) | uuid |
| user\_word\_saves | user\_id (FK) | uuid |
| user\_word\_saves | word\_id (FK) | text |
| user\_word\_saves | saved\_at | timestamptz |

 

**user\_notes (마음 기록)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| user\_notes | id (PK) | uuid |
| user\_notes | user\_id (FK) | uuid |
| user\_notes | word\_id (FK) | text |
| user\_notes | content | text |
| user\_notes | created\_at | timestamptz |
| user\_notes | situation | text |

 

**badges (뱃지 마스터)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| badges | id (PK) | text |
| badges | name | text |
| badges | glyph | text |
| badges | description | text |
| badges | condition\_type | text |
| badges | threshold | integer |

 

**user\_badges (사용자 획득 뱃지)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| user\_badges | id (PK) | uuid |
| user\_badges | user\_id (FK) | uuid |
| user\_badges | badge\_id (FK) | text |
| user\_badges | earned\_at | timestamptz |

 

**situation\_prompts (상황별 추천 카드)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| situation\_prompts | id (PK) | uuid |
| situation\_prompts | label | text |
| situation\_prompts | linked\_word\_id (FK) | text |
| situation\_prompts | accent\_color | text |

 

**search\_keywords (검색 키워드 매핑)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| search\_keywords | id (PK) | uuid |
| search\_keywords | keyword | text |
| search\_keywords | word\_id (FK) | text |

 

**daily\_words (오늘의 한 단어)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| daily\_words | id (PK) | uuid |
| daily\_words | date | date |
| daily\_words | word\_id (FK) | text |

 

**weekly\_trending\_words (주간 인기 감정)**

| 테이블명 | 항목(컬럼) | 타입 |
| :---- | :---- | :---- |
| weekly\_trending\_words | id (PK) | uuid |
| weekly\_trending\_words | week\_start\_date | date |
| weekly\_trending\_words | rank | smallint |
| weekly\_trending\_words | word\_id (FK) | text |
| weekly\_trending\_words | discoverer\_count | integer |

 

**2\. 테이블 간 관계 (비개발자용 설명)**

| 테이블 A | 테이블 B | 관계 유형 | 설명 |
| :---- | :---- | :---- | :---- |
| users | user\_word\_discoveries | 1:N | 한 사용자가 여러 개의 "감정 단어를 발견한 기록"을 가질 수 있다 |
| users | user\_word\_saves | 1:N | 한 사용자가 여러 단어를 "저장함" 표시할 수 있다 |
| users | user\_notes | 1:N | 한 사용자가 여러 개의 마음 기록(메모)을 남길 수 있다 |
| users | user\_badges | 1:N | 한 사용자가 여러 개의 뱃지를 획득할 수 있다 |
| emotion\_regions | emotion\_words | 1:N | 하나의 감정 영역(예: 슬픔의 강) 안에는 여러 개의 감정 단어가 속해 있다 |
| emotion\_regions | emotion\_words | 1:1 | (root\_word\_id 기준) 하나의 영역은 자신을 대표하는 단어를 정확히 하나 가진다 |
| intensity\_labels | emotion\_words | 1:N | 하나의 강도 단계(예: "3 \= 보통")에 여러 감정 단어가 속할 수 있다 |
| emotion\_words | user\_word\_discoveries | 1:N | 하나의 감정 단어는 여러 사용자에 의해 각자 다른 시점에 발견될 수 있다 |
| emotion\_words | user\_word\_saves | 1:N | 하나의 감정 단어는 여러 사용자에 의해 각자 저장될 수 있다 |
| emotion\_words | user\_notes | 1:N | 하나의 감정 단어에 여러 사용자가 각자의 마음 기록을 남길 수 있다 |
| emotion\_words | emotion\_word\_relations | N:M | 감정 단어끼리는 서로 여러 개씩 연결될 수 있다(A단어가 여러 단어와 이웃이고, 그 단어들도 각자 다른 단어와 이웃일 수 있음) |
| emotion\_words | search\_keywords | 1:N | 하나의 감정 단어에 여러 개의 구어체 검색어(별칭)가 연결될 수 있다 |
| emotion\_words | situation\_prompts | 1:N | 하나의 감정 단어가 여러 개의 "상황 카드"에서 추천 단어로 쓰일 수 있다 |
| emotion\_words | daily\_words | 1:N | 하나의 감정 단어가 여러 날짜에 걸쳐 "오늘의 단어"로 반복 선정될 수 있다 |
| emotion\_words | weekly\_trending\_words | 1:N | 하나의 감정 단어가 여러 주(週)에 걸쳐 인기 순위에 오를 수 있다 |
| badges | user\_badges | 1:N | 하나의 뱃지 조건(예: "12개 발견")을 여러 사용자가 각자 달성할 수 있다 |

 

*참고: hero\_greetings는 다른 테이블과 연결되지 않는 독립 테이블입니다. 현재 시각(시)이 from\_hour\~to\_hour 범위에 들어오는 행을 찾아 그 문구를 보여주는 방식이라, 저장된 데이터끼리 이어질 FK가 필요 없습니다.*

**③ 검증 — 5단계 화면과 대조하기**  
테이블 설계가 끝나면, 5단계 화면 목록을 다시 펼쳐놓고 화면에 보이는 정보가 테이블 어딘가에 빠짐없이 대응되는지 확인합니다. 화면과 데이터가 어긋나면 개발 착수 후에 뒤늦게 발견되어 손이 훨씬 많이 갑니다.

**📝 프롬프트 예시**

| 5단계 워크시트 파일(화면 흐름·요소)과 지금 만든 테이블 설계를 나란히 놓고 대조해줘. 화면에 표시되는 정보인데 테이블에는 빠진 항목이 있는지 확인해줘. 빠진 항목이 있다면 어느 테이블에 어떤 컬럼으로 추가해야 할지 알려줘. |
| :---- |

| 화면 | 화면에 표시되는 정보 | 대응 테이블·컬럼 | 누락 여부 (O/X) |
| ----- | ----- | ----- | ----- |
| 1\. 탐색 시작 | 감정 입력창, 추천 감정 어휘, 추천 상황 | search\_keywords, emotion\_words, situation\_prompts | X |
| 2\. 후보 탐색 | 추천 감정 후보 목록(여러 개), 다시 찾기 | 검색 쿼리 결과(저장 불필요) | X |
| 3\. 지도 미리보기 | 선택한 감정, 소속 영역, 주변 감정 | emotion\_words, emotion\_regions, emotion\_word\_relations | X |
| 4\. 영역 탐색 | 9개 영역, 영역별 어휘 목록 | emotion\_regions, emotion\_words | X |
| 5\. 관계 탐색 | 유사·관련·반대 감정, 거리 | emotion\_word\_relations | X |
| 5\. 관계 탐색 | 이 감정은 아닌 것 같아요(제외) | 없음 | O (보류) |
| 6\. 비교·선택 | 감정 A/B 비교, 선택 완료 | user\_word\_discoveries | X |
| 7\. 상세 확인 | 감정명·의미·특징, 상황 예시, 유사/반대 감정 | emotion\_words, emotion\_word\_relations | X |
| 7\. 상세 확인 | 표현 문장 "추천"(복수·상황별) | example\_sentence(단일 문장만 존재) | O (보류) |
| 8\. 표현하기 | 표현 대상 선택 | 없음 | O (보류) |
| 8\. 표현하기 | 상황 선택(표현 맥락) | 없음(situation\_prompts는 진입용이라 용도 다름) | O (보류) |
| 8\. 표현하기 | 문장 복사 | UI 동작(데이터 아님) | X |
| 8\. 표현하기 | 이모티콘 추천 | 없음 | O (보류) |
| 8\. 표현하기 | 캐릭터/감정 표현 요소 | emotion\_words.prop, emotion\_regions.mood | X |
| 9\. 감정 기록 | 선택한 감정, 메모, 날짜/시간 | user\_notes.word\_id, content, created\_at | X |
| 9\. 감정 기록 | 상황(감정+상황+메모 형태로 저장) | user\_notes.situation | X (이번에 반영 완료) |
| 10\. 기록 히스토리 | 날짜별 목록, 감정 태그, 필터, 상세 | user\_notes(+조인) | X |
| 11\. 데이터 시각화 | 기간별 그래프, 감정별/영역별 분포 | user\_word\_discoveries·user\_notes 집계 | X |
| 11\. 데이터 시각화 | 상황별 감정 패턴 | user\_notes.situation | X (이번에 반영 완료) |
| 12\. 감정 리포트 | 주요 감정, 감정 패턴 | 집계로 계산 가능 | X |
| 12\. 감정 리포트 | 감정 변화 요약(서술형 해석 문장) | 없음 | O (보류) |
| 13\. 감정 도감 | 발견 목록, 어휘 상세, 수집 | user\_word\_discoveries, emotion\_words | X |
| 14\. 뱃지·업적 | 획득 뱃지, 조건, 진행률 | badges, user\_badges(진행률은 계산값) | X |

