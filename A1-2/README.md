# 국내 여행 추천 프로그램

여행 날짜를 입력하면 Google Gemini API와 Kakao Local API를 연동하여
국내 여행 지역을 추천하고, 지역별 맛집을 검색한 뒤 최종 여행 리포트를 생성하는
Python CLI 프로그램입니다.

단일 API 호출이 아니라 첫 번째 API의 결과를 다음 API의 입력으로 사용하여
여러 API의 데이터를 연결하는 과제입니다.

---

## 1. 프로그램 실행 흐름

```text
여행 날짜 입력
        ↓
날짜 형식 및 여행 가능 날짜 검증
        ↓
기존 결과 캐시 확인
        ↓
Gemini API
여행 지역 추천
        ↓
recommended_cities
        ↓
Kakao Local API
추천 지역별 맛집 검색
        ↓
추천 정보 + 맛집 정보
        ↓
Gemini API
최종 여행 리포트 생성
        ↓
results/ 저장
```

---

## 2. 개발 환경

- Python 3.10 이상
- 터미널 기반 CLI 프로그램

사용 패키지:

```text
google-genai
requests
python-dotenv
```

설치 예:

```bash
pip install google-genai requests python-dotenv
```

---

## 3. 사용 API

### Google Gemini API

다음 두 단계에서 사용합니다.

1. 여행 날짜에 따른 국내 여행 지역 추천
2. 추천 정보와 맛집 정보를 종합한 최종 여행 리포트 생성

### Kakao Local API

Gemini의 추천 지역을 검색어로 사용하여 국내 맛집 정보를 검색합니다.

---

## 4. API 키 설정

API 키는 Python 코드에 직접 작성하지 않고 `.env` 파일에서 읽습니다.

프로젝트 폴더에 `.env` 파일을 생성하고 다음과 같이 설정합니다.

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
```

실제 키 값은 코드, README, 결과 파일 등에 작성하지 않습니다.

`.gitignore`에는 다음 항목을 등록합니다.

```gitignore
.env
.venv/
__pycache__/
*.pyc
```

API 키를 코드와 분리하면 GitHub 또는 협업 과정에서 키가 공개되는 것을 방지할 수 있고,
키가 변경되어도 프로그램 코드를 수정할 필요가 없습니다.

---

## 5. 실행 방법

기본 실행 명령은 다음과 같습니다.

```bash
python travel_planner.py -date "2026-08-15"
```

`-date`는 필수 옵션이며 다음 형식을 사용합니다.

```text
YYYY-MM-DD
```

---

## 6. 입력값 검증

`argparse`를 사용하여 여행 날짜를 입력받습니다.

### 잘못된 날짜 형식

예:

```bash
python travel_planner.py -date "20260815"
```

날짜 형식이 올바르지 않으면 사용 방법을 안내하고 프로그램을 종료합니다.

```text
오류: 날짜 형식이 올바르지 않습니다.
사용법: python travel_planner.py -date "YYYY-MM-DD"
```

### 과거 날짜

과거 날짜는 여행 계획 요청으로 처리하지 않습니다.

과거 날짜가 입력되면 API를 호출하기 전에 프로그램을 종료합니다.

```text
오류: 과거 날짜로는 여행 계획을 생성할 수 없습니다.
오늘 또는 미래 날짜를 입력하세요.
```

이를 통해 불필요한 외부 API 호출을 방지합니다.

---

## 7. 여행 지역 추천

입력 날짜를 Gemini API에 전달하여 여행하기 좋은 국내 지역을 추천받습니다.

기본 과제의 단일 지역 추천을 보너스 과제에서 복수 지역 추천으로 확장했습니다.

1차 추천 JSON은 다음과 같은 구조입니다.

```json
{
  "recommended_cities": [
    "강릉",
    "평창",
    "부산"
  ],
  "weather": "해당 시기의 일반적인 날씨 요약",
  "events": [
    "행사 또는 축제 후보"
  ],
  "reason": "추천 이유"
}
```

주요 필드:

- `recommended_cities`: 추천 지역 2~3곳
- `weather`: 해당 시기의 일반적인 날씨 요약
- `events`: 행사 또는 축제 후보
- `reason`: 추천 이유

실제 날씨나 행사 데이터의 정확도를 평가하는 것이 아니라,
LLM이 생성한 구조화된 데이터를 다음 API의 입력값으로 연결하는 것이 목적입니다.

---

## 8. LLM JSON 오류 처리

Gemini 응답은 Python에서 JSON으로 파싱합니다.

정상적인 JSON이 아니거나 필수 키가 누락된 경우,
JSON 형식만 다시 출력하도록 프롬프트를 수정하여 최대 1회 재요청합니다.

필수 키:

```text
recommended_cities
weather
events
reason
```

무한 재시도는 하지 않습니다.

---

## 9. 지역별 맛집 검색

`recommended_cities`의 각 지역을 반복 처리하여 Kakao Local API를 호출합니다.

예:

```text
강릉 → 강릉 맛집 검색
평창 → 평창 맛집 검색
부산 → 부산 맛집 검색
```

각 지역에서 권장 수량인 최대 5개의 맛집을 검색합니다.

맛집 데이터에는 다음 필드를 저장합니다.

```text
city
name
address
category
url
x
y
```

예:

```json
{
  "city": "강릉",
  "name": "맛집 이름",
  "address": "주소",
  "category": "카테고리",
  "url": "장소 URL",
  "x": "경도",
  "y": "위도"
}
```

`city`를 추가하여 여러 지역의 검색 결과를 하나의 데이터 구조에 저장해도
어느 지역의 맛집인지 구분할 수 있도록 했습니다.

---

## 10. 지도/장소 API 오류 처리

Kakao Local API 요청이 실패해도 전체 프로그램을 종료하지 않습니다.

해당 지역의 맛집 목록을 빈 목록으로 처리하고 최종 리포트 생성을 계속합니다.

검색 결과가 0건인 경우에도 동일하게 다음 단계로 진행합니다.

발생한 오류는 `errors` 배열에 기록합니다.

정상 실행 시:

```json
"errors": []
```

오류 발생 시:

```json
"errors": [
  "Kakao Local API 맛집 검색 실패 ..."
]
```

---

## 11. 최종 여행 리포트

Gemini API에 다음 데이터를 전달합니다.

```text
1차 여행 추천 JSON
+
지역별 맛집 검색 결과
```

이를 종합하여 Markdown 형식의 최종 여행 리포트를 생성합니다.

리포트에는 다음 내용이 포함됩니다.

- 추천 지역 및 추천 이유
- 날씨 요약
- 행사/축제 후보
- 지역별 맛집 목록
- 1일 여행 일정

1일 일정은 다음 수준으로 구성합니다.

```text
오전
오후
저녁
```

특정 지역의 맛집 검색 결과가 0건이면 해당 부분은 `데이터 없음`으로 처리할 수 있습니다.

---

## 12. 결과 저장

실행 결과는 `results/` 폴더에 저장됩니다.

예:

```text
results/
├─ 2026-08-15_raw.json
└─ 2026-08-15_travel_plan.md
```

### 원본 JSON

```text
2026-08-15_raw.json
```

다음 데이터를 포함합니다.

- 여행 날짜
- 1차 추천 JSON
- 맛집 검색 결과
- 오류 요약 `errors`

JSON은 프로그램이 다시 읽고 처리하기 쉬운 구조화된 데이터입니다.

### 최종 Markdown 리포트

```text
2026-08-15_travel_plan.md
```

사람이 읽기 좋은 최종 여행 리포트입니다.

---

## 13. 실행 진행 로그

프로그램 실행 중 다음과 같이 현재 진행 상태를 확인할 수 있습니다.

```text
[1/3] 1차 추천 생성 중(LLM)...
[2/3] 지역별 맛집 검색 중(지도/장소 API)...
[3/3] 최종 리포트 생성 중(LLM)...
```

실행 완료 후 저장 경로도 출력합니다.

```text
결과 저장 완료
 - 원본 JSON: results\2026-08-15_raw.json
 - 최종 리포트: results\2026-08-15_travel_plan.md
```

---

## 14. 보너스 과제 1 - 복수 지역 추천

기본 과제의 `recommended_city` 1개를
`recommended_cities` 2~3개로 확장했습니다.

```text
Gemini
   ↓
추천 지역 2~3곳
   ↓
for 반복문
   ├─ 지역 1 → Kakao API
   ├─ 지역 2 → Kakao API
   └─ 지역 3 → Kakao API
```

추천된 각 지역에 대해 맛집을 검색하고,
결과에 `city` 값을 추가하여 지역별로 구분합니다.

최종 리포트에서도 맛집을 지역별로 정리합니다.

---

## 15. 보너스 과제 2 - 결과 캐싱

같은 `-date`로 다시 실행할 경우 이미 저장된 원본 JSON이 있는지 확인합니다.

```text
날짜 입력
    ↓
기존 결과 있음?
 ┌──────────┴──────────┐
YES                   NO
 ↓                     ↓
저장 결과 사용          API 호출
 ↓                     ↓
API 호출 생략           결과 저장
```

캐시가 정상적으로 발견되면 다음과 같이 출력합니다.

```text
저장된 결과를 찾았습니다.
API 호출을 건너뛰고 기존 결과를 사용합니다.
```

같은 날짜의 결과를 반복해서 생성하지 않으므로 Gemini와 Kakao API의 불필요한 호출을 줄일 수 있습니다.

---

## 16. 프로젝트 구조

```text
travel_planner/
├─ results/
│  ├─ YYYY-MM-DD_raw.json
│  └─ YYYY-MM-DD_travel_plan.md
├─ .env
├─ .gitignore
├─ README.md
└─ travel_planner.py
```

`.env`는 실제 프로젝트에는 존재하지만 보안을 위해 GitHub 저장소에는 포함하지 않습니다.

---

## 17. 결과 확인 방법

프로그램 실행 후 두 곳에서 결과를 확인할 수 있습니다.

### 터미널

API 처리 단계와 최종 리포트를 확인할 수 있습니다.

### `results/`

```text
YYYY-MM-DD_raw.json
YYYY-MM-DD_travel_plan.md
```

JSON 파일에서는 구조화된 API 결과를,
Markdown 파일에서는 사람이 읽기 좋은 최종 여행 리포트를 확인할 수 있습니다.

---

## 18. 보안 주의사항

- API 키를 코드에 직접 작성하지 않습니다.
- 실제 API 키를 README에 작성하지 않습니다.
- 결과 파일이나 실행 로그에도 API 키가 포함되지 않도록 합니다.
- `.env`를 GitHub에 업로드하지 않습니다.