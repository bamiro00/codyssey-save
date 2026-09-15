# 제출용 증빙자료 가이드

과제 안내에서 요구한 서비스 화면, AI 기능 동작, AI 코딩 도구 사용 과정과 추가 배포 증빙을 최종 파일명 기준으로 정리했습니다.

## 최종 포함 증빙

1. `01_desktop_main.png` — 데스크톱 메인/비교 UI
2. `02_compare_input.png` — 반려동물 조건 및 제품 선택 입력 화면
3. `03_compare_nutrition.png` — 비교 결과와 영양정보 표
4. `04_ai_recommendation.png` — AI 비교 추천 결과와 근거
5. `05_mobile_main.jpg` — 모바일 반응형 메인 화면
6. `06_mobile_compare.jpg` — 모바일 반응형 비교 입력 화면
7. `07_ai_coding_process.png` — AI 코딩 도구를 활용한 오류 분석 및 수정 과정
8. `08_vercel_api_logs.png` — `/api/compare`와 Gemini 3.6 Flash의 `200 OK` 정상 호출 로그
9. `09_vercel_deployment.png` — Vercel Production Deployment 성공 화면

## 과제 필수 증빙에 대응하는 파일

- 서비스 스크린샷(데스크톱): `01_desktop_main.png`
- 서비스 스크린샷(모바일): `05_mobile_main.jpg`, `06_mobile_compare.jpg`
- AI 기능 동작 장면: `03_compare_nutrition.png`, `04_ai_recommendation.png`
- AI 코딩 도구 사용 과정: `07_ai_coding_process.png`

## 추가 증빙

- 백엔드/API 정상 실행: `08_vercel_api_logs.png`
- 실제 공개 배포 성공: `09_vercel_deployment.png`

## 보안 체크

- API 키 값이 보이는 화면은 포함하지 않습니다.
- 환경변수 값, 토큰, 비밀번호 등 민감정보는 캡처에 포함하지 않습니다.
- 오류 로그를 제출할 때도 키 값이 표시되지 않는지 확인합니다.

## 폴더 구조

```text
docs/evidence/
├─ 01_desktop_main.png
├─ 02_compare_input.png
├─ 03_compare_nutrition.png
├─ 04_ai_recommendation.png
├─ 05_mobile_main.jpg
├─ 06_mobile_compare.jpg
├─ 07_ai_coding_process.png
├─ 08_vercel_api_logs.png
├─ 09_vercel_deployment.png
└─ README.md
```

모든 증빙 파일명은 Windows 압축 해제 환경에서도 깨지지 않도록 영문/숫자만 사용합니다.
