# 우리 애 사료, 뭐가 찐일까?

> 영문명·프로젝트명: `pet-food-match-ai`

## 서비스 소개

**‘우리 애 사료, 뭐가 찐일까?’**는 반려동물의 종류, 나이, 관심사항과 2~3개 사료의 등록된 제품정보를 바탕으로 비교표와 AI 설명을 제공하는 웹 서비스입니다.

## 주요 기능

- 강아지 15종 + 고양이 15종 Seed Catalog
- 한글/영문 제품 검색 및 2~3개 제품 선택
- 등록되지 않은 제품 직접 입력
- Life Stage, 대상 연령, kcal/kg, 영양성분 표시 기준 비교
- 제조사 강조점과 구매후기 경험 키워드 구분
- Google Gemini API를 이용한 비교 설명
- 빈 입력, API 오류, 응답 지연에 대한 사용자 안내
- 데스크톱·태블릿·모바일 반응형 화면

## 기술 구성

- 프런트엔드: HTML, CSS, Vanilla JavaScript
- 백엔드: Python 기반 Vercel Serverless Function
- AI: Google Gemini API (`google-genai`)
- 배포: GitHub + Vercel

## 폴더 구조

```text
├─ index.html
├─ css/style.css
├─ js/app.js
├─ data/
│  ├─ pet-foods.js
│  └─ pet-foods.json
├─ assets/
├─ api/compare.py
├─ docs/
│  └─ service-plan.md
├─ requirements.txt
└─ .env.example
```

## AI 처리 흐름

1. 사용자가 반려동물 정보와 사료 2~3개를 선택합니다.
2. 프런트엔드가 입력을 검사하고 기존 비교표를 표시합니다.
3. `POST /api/compare`로 선택 제품의 필요한 정보만 전달합니다.
4. Python 함수가 `GEMINI_API_KEY` 환경변수로 Gemini를 호출합니다.
5. 서버가 구조화된 응답과 제품 ID를 검사한 뒤 결과를 반환합니다.
6. 화면에 우선 비교 후보, 추천 이유, 대안 후보와 확인사항을 표시합니다.

## 환경변수

| 이름 | 필수 | 설명 |
|---|---:|---|
| `GEMINI_API_KEY` | 예 | Google AI Studio에서 발급한 Gemini API 키 |
| `GEMINI_MODEL` | 아니요 | 기본값은 `gemini-3.8-flash` |

실제 키는 코드, README, 캡처 또는 GitHub에 올리지 않습니다. `.env.example`은 이름만 보여주는 예시이며 실제 값을 넣지 않습니다.

## Vercel 배포

1. Vercel에서 `bamiro00/codyssey-save` 저장소를 새 프로젝트로 가져옵니다.
2. 프로젝트 이름은 `pet-food-match-ai`로 입력합니다.
3. **Root Directory**는 `A1-3`으로 지정합니다.
4. Framework Preset은 `Other`를 선택합니다.
5. Vercel 프로젝트의 **Settings → Environment Variables**에 `GEMINI_API_KEY`를 추가합니다.
6. Production, Preview, Development 환경에 적용한 뒤 배포합니다.
7. 키를 배포 후 추가하거나 변경했다면 새로 배포합니다.

## 배포 후 확인

- `https://배포주소.vercel.app/api/compare` 접속 시 상태 JSON이 표시되는지 확인
- 메인 화면에서 제품 데이터 30종이 로드되는지 확인
- 제품 2개를 선택하고 비교했을 때 표와 AI 설명이 모두 표시되는지 확인
- 제품을 1개만 선택했을 때 안내 메시지가 표시되는지 확인
- 모바일 화면에서 메뉴, 입력, 표와 AI 결과가 깨지지 않는지 확인

## 비교 원칙과 주의사항

- 등록 데이터에 없는 값은 추측하지 않습니다.
- 영양성분 표시 기준이 다른 제품은 단순 수치 우열로 비교하지 않습니다.
- 공개된 kcal/kg가 없는 제품은 열량을 추정하지 않습니다.
- 제조사 설명과 구매후기는 보조자료로만 사용합니다.
- 질병 진단, 치료, 처방 또는 임의 급여량 변경을 권하지 않습니다.
- 결과는 절대적인 1등이 아니라 현재 입력 조건에서 상대적으로 먼저 비교할 후보입니다.

## 제출 정보

- GitHub 저장소: https://github.com/bamiro00/codyssey-save/tree/main/A1-3
- Vercel URL: 배포 후 입력
- 서비스 기획서: `docs/service-plan.md`
