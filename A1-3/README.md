# 우리 애 사료, 뭐가 찐일까?

> 프로젝트명: `pet-food-match-ai`

반려동물의 종류, 나이, 관심사항과 2~3개 사료의 등록 제품정보를 한 화면에서 비교하고, Google Gemini가 영양정보·제조사 강조점·구매후기 근거를 바탕으로 현재 조건에서 먼저 비교해볼 후보를 설명하는 AI 웹 서비스입니다.

## 배포 주소

- Vercel: https://petfood-match.vercel.app
- GitHub: https://github.com/bamiro00/codyssey-save/tree/main/A1-3

## 주요 기능

- 강아지 15종 + 고양이 15종 Seed Catalog
- 한글/영문 제품명 1글자부터 검색
- 사료 2~3개 선택 비교
- 등록되지 않은 제품 직접 입력
- Life Stage, 대상 연령, kcal/kg, 단백질·지방·섬유·수분 비교
- 영양표 기준이 다른 제품은 단순 수치 우열 비교를 제한
- 제조사 강조 키워드, 긍정 후기, 호불호/주의 후기를 색상으로 구분
- 반려동물 종류·나이·관심사항을 반영한 Gemini AI 비교 설명
- 추천 후보뿐 아니라 다른 후보가 더 맞을 수 있는 상황과 선택 전 체크사항 안내
- 빈 입력, API 오류, 응답 지연에 대한 사용자 안내
- 데스크톱·태블릿·모바일 반응형 UI

## 기술 구성

| 영역 | 기술 |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, Vercel Serverless Functions |
| AI | Google Gemini API (`google-genai`) |
| Data | 프로젝트 내부 Seed Catalog JSON/JS |
| Deploy | GitHub + Vercel |

React/Vue 등 프런트엔드 프레임워크는 사용하지 않았습니다.

## 폴더 구조

```text
A1-3/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  └─ app.js
├─ data/
│  ├─ pet-foods.js
│  └─ pet-foods.json
├─ assets/
│  ├─ hero-pets.png
│  └─ about-pets.png
├─ api/
│  └─ compare.py
├─ docs/
│  ├─ service-plan.md
│  ├─ submission-checklist.md
│  ├─ evidence-guide.md
│  ├─ verification-report.md
│  └─ evidence/  # 제출용 캡처 9종
├─ requirements.txt
├─ .env.example
└─ README.md
```

## 사용자 입력 → AI 결과 흐름

1. 사용자가 강아지/고양이, 나이, 관심사항과 사료 2~3개를 선택합니다.
2. `js/app.js`가 필수 입력과 선택 개수를 검사합니다.
3. JavaScript가 먼저 제품 비교표와 근거 키워드를 화면에 렌더링합니다.
4. `fetch("/api/compare")`로 필요한 제품정보만 Python 백엔드에 전송합니다.
5. `api/compare.py`가 `GEMINI_API_KEY` 환경변수를 사용해 Gemini API를 호출합니다.
6. 서버는 구조화된 AI 응답을 검사하고, 내부 제품 ID나 필드명이 사용자 화면에 노출되지 않도록 정리합니다.
7. JavaScript가 AI 결과를 받아 다음 구조로 표시합니다.
   - 현재 조건에서 1순위 후보와 2~3문장 결론
   - 영양성분 비교 근거
   - 제조사 강조점
   - 구매후기 반응
   - 다른 후보가 더 맞을 수 있는 상황
   - 선택 전 체크사항

## AI 비교 원칙

- 등록 데이터에 없는 값을 임의로 추측하지 않습니다.
- 영양성분 표시 기준이 다른 제품은 단순 숫자 우열로 비교하지 않습니다.
- 공개된 kcal/kg가 없는 제품은 열량을 추정하지 않습니다.
- 제조사 문구는 제조사가 강조하는 특성으로만 사용합니다.
- 구매후기는 실제 사용자 경험 키워드로만 사용하며 의학적 효과로 해석하지 않습니다.
- 질병 진단, 치료, 처방 또는 임의 급여량 변경을 권하지 않습니다.
- 결과는 절대적인 1등이 아니라 현재 입력 조건에서 상대적으로 먼저 비교할 후보입니다.

## 오류 및 지연 처리

- 제품을 2개 미만 선택: 프런트 화면에서 안내
- 제품을 3개 초과 선택: 프런트 화면에서 안내
- 잘못된 API 요청: HTTP 400 처리
- API 키 미설정/서비스 설정 문제: HTTP 503 처리
- 인증 오류: `AI_AUTH`
- 요청 한도 초과: `AI_RATE_LIMIT`
- 잘못된 AI 요청: `AI_BAD_REQUEST`
- Gemini 외부 서비스 오류: `AI_UPSTREAM`
- 500/502/503/504: 최대 3회 자동 재시도
- 브라우저 응답 지연: `AbortController`를 이용한 시간 초과 안내

## 환경변수 설정

| 이름 | 필수 | 설명 |
|---|---:|---|
| `GEMINI_API_KEY` | 예 | Google AI Studio에서 발급한 Gemini API 키 |
| `GEMINI_MODEL` | 아니요 | 기본값 `gemini-3.6-flash` |

`.env.example`에는 변수 이름과 예시 모델만 포함하며 실제 API 키는 넣지 않습니다.

### 로컬/배포 환경의 키 관리 원칙

- API 키는 GitHub에 커밋하지 않습니다.
- 코드, README, 스크린샷에 실제 키를 노출하지 않습니다.
- Vercel의 Environment Variables에 저장합니다.
- 키 유출이 의심되면 기존 키를 폐기하고 새 키를 발급한 뒤 Vercel 환경변수를 갱신하고 재배포합니다.

## Vercel 배포 방법

1. Vercel에서 GitHub 저장소 `bamiro00/codyssey-save`를 가져옵니다.
2. 프로젝트 이름을 `pet-food-match-ai`로 설정합니다.
3. Root Directory를 `A1-3`으로 지정합니다.
4. Framework Preset은 `Other`를 선택합니다.
5. Settings → Environment Variables에 `GEMINI_API_KEY`를 등록합니다.
6. 필요하면 `GEMINI_MODEL=gemini-3.6-flash`를 등록합니다.
7. Production/Preview 환경에 적용하고 Deploy 합니다.

## 배포 후 확인

- https://petfood-match.vercel.app 접속
- `/api/compare` GET에서 `ok: true`, `api_key_configured: true` 확인
- 제품 데이터 30종 로드 확인
- 강아지/고양이 각각 제품 2개 비교 테스트
- AI 설명 정상 출력 확인
- 제품 1개만 선택했을 때 오류 안내 확인
- 모바일 화면에서 메뉴·입력·비교 결과가 깨지지 않는지 확인

## HTML / CSS / JavaScript 역할

- **HTML**: 서비스의 구조, 메뉴, 입력 폼, 비교 결과 영역을 구성합니다.
- **CSS**: 색상, 카드, 반응형 레이아웃, 모바일/데스크톱 화면을 담당합니다.
- **JavaScript**: 제품 검색, 선택 상태 관리, 입력 검증, 비교표 생성, `fetch()` API 호출, AI 결과 렌더링을 담당합니다.
- **Python API**: Vercel Serverless Function에서 Gemini API를 호출하고 오류·재시도·응답 검증을 처리합니다.

## 문서

- 서비스 기획서: `docs/service-plan.md`
- 제출 요구사항 체크리스트: `docs/submission-checklist.md`
- 증빙자료 캡처 가이드: `docs/evidence-guide.md`
- 최종 코드/요구사항 검증 보고서: `docs/verification-report.md`
- 제출용 캡처: `docs/evidence/`


## 제출용 증빙자료

최종 배포본 기준 증빙 캡처는 `docs/evidence/`에 포함되어 있습니다. 파일명은 Windows에서도 깨지지 않도록 영문/숫자만 사용했습니다.

- 데스크톱 메인: [`01_desktop_main.png`](docs/evidence/01_desktop_main.png)
- 사료 비교 입력: [`02_compare_input.png`](docs/evidence/02_compare_input.png)
- 비교 결과/영양정보: [`03_compare_nutrition.png`](docs/evidence/03_compare_nutrition.png)
- AI 추천 결과: [`04_ai_recommendation.png`](docs/evidence/04_ai_recommendation.png)
- 모바일 메인: [`05_mobile_main.jpg`](docs/evidence/05_mobile_main.jpg)
- 모바일 비교 입력: [`06_mobile_compare.jpg`](docs/evidence/06_mobile_compare.jpg)
- AI 코딩 도구 사용 과정: [`07_ai_coding_process.png`](docs/evidence/07_ai_coding_process.png)
- Vercel API 정상 호출 로그: [`08_vercel_api_logs.png`](docs/evidence/08_vercel_api_logs.png)
- Vercel 배포 성공: [`09_vercel_deployment.png`](docs/evidence/09_vercel_deployment.png)

### 대표 화면 미리보기

![데스크톱 메인](docs/evidence/01_desktop_main.png)

![AI 추천 결과](docs/evidence/04_ai_recommendation.png)

![모바일 메인](docs/evidence/05_mobile_main.jpg)

## 주의사항

이 서비스는 제품정보를 비교해 선택을 돕는 참고 도구이며 진단이나 처방을 제공하지 않습니다. 질병이 있거나 치료 중인 반려동물의 사료 선택은 수의사와 상담해야 합니다.
