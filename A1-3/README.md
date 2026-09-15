# 우리 애 사료, 뭐가 찐일까?

> 프로젝트명: `pet-food-match-ai`

반려동물의 종류, 나이, 관심사항과 2~3개 사료의 등록 제품정보를 한 화면에서 비교하고, Google Gemini가 **영양정보·제조사 강조점·구매후기 근거**를 바탕으로 현재 조건에서 먼저 비교해볼 후보를 설명하는 AI 웹 서비스입니다.

- **배포 주소:** https://pet-food-match-ai.vercel.app
- **GitHub:** https://github.com/bamiro00/codyssey-save/tree/main/A1-3

<details open>
<summary><b>서비스 메인 화면 보기</b></summary>

<br>

<img src="docs/evidence/01_desktop_main.png" width="100%" alt="데스크톱 메인 화면">

</details>

---

## 1. 서비스 기획 배경

반려동물 사료를 고를 때 제품마다 영양성분 표시 방식이 다르고, 제조사가 강조하는 특징과 실제 구매후기까지 따로 확인해야 해서 비교가 번거롭습니다.

이 프로젝트는 사용자가 **반려동물 종류·나이·관심사항**을 입력하고 비교할 사료를 선택하면, 등록된 제품정보를 한 화면에서 정리한 뒤 AI가 해당 조건에 맞춰 비교 설명을 제공하도록 설계했습니다.

### 주요 사용자

- 여러 사료 중 어떤 제품을 먼저 비교할지 고민하는 반려인
- 영양성분·제조사 특징·구매후기를 한 번에 보고 싶은 사용자
- 강아지/고양이의 나이와 체중관리·기호성·소화 등 조건을 함께 고려하고 싶은 사용자

---

## 2. 주요 기능

### 2-1. 반려동물 정보와 사료 선택

사용자는 다음 정보를 입력합니다.

- 반려동물: 강아지 / 고양이
- 나이
- 가장 신경 쓰이는 부분
- 비교할 사료 2~3개

Seed Catalog에는 **강아지 15종 + 고양이 15종, 총 30종**이 등록되어 있으며 한글/영문 제품명을 **1글자부터 검색**할 수 있습니다. 등록되지 않은 제품은 사용자가 직접 입력할 수도 있습니다.

<details>
<summary><b>사료 비교 입력 화면 보기</b></summary>

<br>

<img src="docs/evidence/02_compare_input.png" width="100%" alt="사료 비교 입력 화면">

</details>

### 2-2. 제품정보 비교

선택한 제품의 다음 정보를 표로 비교합니다.

- Life Stage
- 대상 연령
- kcal/kg
- 단백질
- 지방
- 섬유
- 수분
- 영양표 기준

제품별 영양성분 표시 기준이 다를 수 있기 때문에 **보장성분량·Dry Matter 평균값 등 기준이 다르면 단순 수치 우열로 비교하지 않도록** 안내합니다.

<details>
<summary><b>영양정보 비교 결과 보기</b></summary>

<br>

<img src="docs/evidence/03_compare_nutrition.png" width="100%" alt="영양정보 비교 결과">

</details>

### 2-3. 제조사 강조점과 구매후기 구분

단순 영양성분뿐 아니라 제품별 근거 데이터를 다음과 같이 구분해 보여줍니다.

- **제조사가 강조하는 특징**: 체중관리, 포만감, L-카르니틴 등
- **구매후기 긍정 경험**: 기호성, 체중관리 목적 사용, 재구매 등
- **호불호·주의 경험**: 가격, 알갱이 크기, 개체별 기호성 차이 등

각 항목은 색상을 다르게 표시해 근거의 성격을 구분했습니다.

### 2-4. Gemini AI 비교 설명

프런트엔드에서 선택된 제품정보를 `/api/compare`로 전송하면 Python Serverless Function이 Gemini API를 호출합니다.

AI 결과는 다음 구조로 출력됩니다.

1. 현재 조건에서 1순위 후보와 **2~3문장 결론**
2. 영양성분 비교 근거
3. 제조사가 강조하는 점
4. 구매후기에서 보인 반응
5. 다른 후보가 더 맞을 수 있는 상황
6. 선택 전 확인할 사항

AI가 제품 ID나 내부 필드명을 그대로 노출하지 않도록 서버에서 응답을 정리하고, 등록 데이터에 없는 사실을 임의로 만들어내지 않도록 프롬프트를 제한했습니다.

<details open>
<summary><b>AI 비교 추천 결과 보기</b></summary>

<br>

<img src="docs/evidence/04_ai_recommendation.png" width="100%" alt="AI 비교 추천 결과">

</details>

---

## 3. 사용자 입력 → AI 결과 흐름

```text
사용자 입력
   ↓
JavaScript 입력 검증
   ↓
제품 비교표/근거 키워드 렌더링
   ↓
fetch('/api/compare')
   ↓
Vercel Serverless Function (Python)
   ↓
Gemini API
   ↓
구조화된 응답 검증 및 정리
   ↓
AI 비교 결과 화면 출력
```

1. 사용자가 강아지/고양이, 나이, 관심사항과 사료 2~3개를 선택합니다.
2. `js/app.js`가 필수 입력과 선택 개수를 검사합니다.
3. JavaScript가 제품 비교표와 근거 키워드를 먼저 화면에 표시합니다.
4. `fetch('/api/compare')`로 필요한 정보만 Python 백엔드에 전송합니다.
5. `api/compare.py`가 환경변수의 API 키를 이용해 Gemini를 호출합니다.
6. 서버가 구조화된 응답을 검사하고 사용자용 표현으로 정리합니다.
7. JavaScript가 AI 결과를 화면에 렌더링합니다.

---

## 4. 반응형 UI

데스크톱뿐 아니라 모바일에서도 비교 입력과 결과를 사용할 수 있도록 반응형 CSS를 적용했습니다.

- 모바일에서 메뉴와 입력 폼을 한 열 구조로 재배치
- 상단 반려동물 이미지 중앙 정렬
- 긴 제품명을 한글/영문 두 줄로 분리
- 비교표는 가독성을 위해 필요한 경우 가로 스크롤 허용
- ABOUT 영역과 문구 카드를 모바일 폭에 맞게 재배치

<details>
<summary><b>모바일 메인 화면 보기</b></summary>

<br>

<img src="docs/evidence/05_mobile_main.jpg" width="420" alt="모바일 메인 화면">

</details>

<details>
<summary><b>모바일 비교 입력 화면 보기</b></summary>

<br>

<img src="docs/evidence/06_mobile_compare.jpg" width="420" alt="모바일 비교 입력 화면">

</details>

---

## 5. AI 비교 원칙

- 등록 데이터에 없는 값을 임의로 추측하지 않습니다.
- 영양성분 표시 기준이 다른 제품은 단순 숫자 우열로 비교하지 않습니다.
- 공개된 kcal/kg가 없는 제품은 열량을 추정하지 않습니다.
- 제조사 문구는 **제조사가 강조하는 특성**으로만 사용합니다.
- 구매후기는 **사용자 경험 키워드**로만 사용하고 의학적 효과로 해석하지 않습니다.
- 질병 진단, 치료, 처방 또는 임의 급여량 변경을 권하지 않습니다.
- AI 결과는 절대적인 1등이 아니라 **현재 입력 조건에서 상대적으로 먼저 비교할 후보**입니다.

---

## 6. 오류 및 지연 처리

사용자가 실제로 서비스를 사용할 때 발생할 수 있는 오류를 구분해 처리했습니다.

| 상황 | 처리 |
|---|---|
| 제품 2개 미만 선택 | 프런트에서 안내 메시지 표시 |
| 제품 3개 초과 선택 | 프런트에서 안내 메시지 표시 |
| 잘못된 API 요청 | HTTP 400 |
| API 키/서비스 설정 문제 | HTTP 503 |
| 인증 오류 | `AI_AUTH` |
| 요청 한도 초과 | `AI_RATE_LIMIT` |
| 잘못된 AI 요청 | `AI_BAD_REQUEST` |
| Gemini 외부 서비스 오류 | `AI_UPSTREAM` |
| 500/502/503/504 | 최대 3회 자동 재시도 |
| 응답 지연 | `AbortController`로 시간 초과 안내 |

개발 과정에서 실제 Gemini 호출이 `503 Service Unavailable`을 반환한 사례가 있었고, Vercel Logs를 확인해 Google Gemini 외부 서비스 오류임을 확인한 뒤 안정적으로 동작하는 모델과 재시도 처리를 적용했습니다.

<details>
<summary><b>AI 코딩 도구를 이용한 오류 해결 과정 보기</b></summary>

<br>

<img src="docs/evidence/07_ai_coding_process.png" width="100%" alt="AI 코딩 도구 사용 과정">

</details>

---

## 7. 기술 구성

| 영역 | 기술 |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, Vercel Serverless Functions |
| AI | Google Gemini API (`google-genai`) |
| Data | 프로젝트 내부 Seed Catalog JSON/JS |
| Deploy | GitHub + Vercel |

React/Vue 등 프런트엔드 프레임워크는 사용하지 않았습니다.

### HTML / CSS / JavaScript 역할

- **HTML**: 메뉴, 서비스 소개, 입력 폼, 비교 결과 영역 등 페이지 구조를 담당합니다.
- **CSS**: 색상, 카드, 데스크톱/모바일 반응형 레이아웃을 담당합니다.
- **JavaScript**: 제품 검색, 선택 상태 관리, 입력 검증, 비교표 생성, API 호출, AI 결과 렌더링을 담당합니다.
- **Python API**: Vercel Serverless Function에서 Gemini API 호출, 오류 처리, 재시도, 응답 검증을 담당합니다.

---

## 8. 프로젝트 구조

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
│  └─ evidence/
│     ├─ 01_desktop_main.png
│     ├─ 02_compare_input.png
│     ├─ 03_compare_nutrition.png
│     ├─ 04_ai_recommendation.png
│     ├─ 05_mobile_main.jpg
│     ├─ 06_mobile_compare.jpg
│     ├─ 07_ai_coding_process.png
│     ├─ 08_vercel_api_logs.png
│     └─ 09_vercel_deployment.png
├─ requirements.txt
├─ .env.example
└─ README.md
```

---

## 9. 환경변수 설정

| 이름 | 필수 | 설명 |
|---|---:|---|
| `GEMINI_API_KEY` | 예 | Google AI Studio에서 발급한 Gemini API 키 |
| `GEMINI_MODEL` | 아니요 | 기본값 `gemini-3.6-flash` |

`.env.example`에는 변수 이름과 예시 모델만 포함하며 실제 API 키는 저장하지 않습니다.

### API 키 관리 원칙

- API 키는 GitHub에 커밋하지 않습니다.
- 코드, README, 스크린샷에 실제 키를 노출하지 않습니다.
- Vercel Environment Variables에 저장합니다.
- 키 유출이 의심되면 기존 키를 폐기하고 새 키를 발급한 뒤 환경변수를 갱신합니다.

---

## 10. Vercel 배포 및 검증

### 배포 방법

1. Vercel에서 GitHub 저장소 `bamiro00/codyssey-save`를 가져옵니다.
2. Root Directory를 `A1-3`으로 지정합니다.
3. Framework Preset은 `Other`를 선택합니다.
4. Environment Variables에 `GEMINI_API_KEY`를 등록합니다.
5. 필요하면 `GEMINI_MODEL=gemini-3.6-flash`를 등록합니다.
6. Production/Preview 환경에 적용한 뒤 Deploy 합니다.

### 배포 후 검증

- 배포 URL 접속 확인
- `/api/compare` GET에서 `ok: true`, `api_key_configured: true` 확인
- 제품 데이터 30종 로드 확인
- 실제 제품 2개 비교 후 AI 설명 출력 확인
- 모바일 레이아웃 확인
- Vercel Logs에서 `/api/compare` 요청이 `200`으로 완료되는지 확인

<details>
<summary><b>Vercel API 정상 호출 로그 보기</b></summary>

<br>

<img src="docs/evidence/08_vercel_api_logs.png" width="100%" alt="Vercel API 정상 호출 로그">

</details>

<details>
<summary><b>Vercel 배포 성공 화면 보기</b></summary>

<br>

<img src="docs/evidence/09_vercel_deployment.png" width="100%" alt="Vercel 배포 성공 화면">

</details>

---

## 11. 관련 문서

- [서비스 기획서](docs/service-plan.md)
- [제출 요구사항 체크리스트](docs/submission-checklist.md)
- [증빙자료 캡처 가이드](docs/evidence-guide.md)
- [최종 코드/요구사항 검증 보고서](docs/verification-report.md)

---

## 12. 주의사항

이 서비스는 등록된 제품정보를 비교해 선택을 돕는 **참고용 서비스**이며 진단이나 처방을 제공하지 않습니다.

질병이 있거나 치료 중인 반려동물의 사료 선택은 수의사와 상담해야 합니다.
