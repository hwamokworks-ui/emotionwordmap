# 감정 어휘 지도 (Emotion Vocabulary Map)

지금의 마음을 한 줄 적으면, 그 마음이 놓인 자리를 지도에서 찾아주는 감정 어휘 탐색 서비스입니다. 하나의 감정에서 멈추지 않고, 연결된 단어를 따라가며 더 정확한 감정 어휘를 발견할 수 있습니다.

- **서비스 링크**: https://emotionwordmap.vercel.app
- **저장소**: https://github.com/hwamokworks-ui/emotionwordmap

## 화면 구성

| 파일 | 설명 |
|---|---|
| `screens/find.html` | 감정 찾기(홈) — 마음을 적어 검색하거나, 상황 카드로 감정을 찾음 |
| `screens/map.html` | 감정 지도 — 145개 단어·9개 영역·203개 연결로 이루어진 데이터 기반 인터랙티브 지도 |
| `screens/archive.html` | 감정 서고 — 발견·저장·마음 기록 통계, 기간별 그래프, 지역 완성도, 뱃지 |
| `screens/index.html` | 전체 흐름 소개 페이지 |

## 기술 스택

- 정적 HTML + Tailwind CSS(CDN), 별도 빌드 과정 없음
- 공통 디자인 토큰: `design-system/tokens.css`, `design-system/MASTER.md`
- 상태 저장: 백엔드 없이 `localStorage`(`ewm_store_v1` 키)로 발견한 단어·저장한 단어·마음 기록을 기기에 보관

## 로컬에서 보기

빌드 없이 정적 파일이라 바로 열어보면 됩니다.

```bash
# 아무 정적 서버로 루트를 서빙 (예시)
npx serve .
```

브라우저에서 `http://localhost:3000` 접속 시 `index.html`이 `screens/find.html`로 자동 이동합니다.

## 배포

GitHub `main` 브랜치에 푸시되면 Vercel과 연동되어 있어 프리뷰가 생성됩니다. 프로덕션 반영은 다음처럼 진행합니다.

```bash
git add -A
git commit -m "설명"
git push
npx vercel --prod
```
