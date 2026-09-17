# 최종 제출 체크리스트

과제 안내 화면의 필수 제출 항목과 현재 프로젝트를 대조한 체크리스트입니다.

## 1. 배포된 웹 서비스 (Vercel URL) — 충족

- [x] 실제 배포 URL 존재: https://petfood-match.vercel.app
- [x] 3개 이상 섹션/화면 구성
  - HOME
  - COMPARE
  - RESULT
  - HOW IT WORKS
  - ABOUT
- [x] 메뉴 이동 제공
- [x] 반응형 모바일 화면 확인
- [x] AI 기능 1개 이상 포함
- [x] 사용자 입력 → AI 결과 출력까지 실제 동작

## 2. GitHub 저장소 — 충족

- [x] 프로젝트 코드 업로드
- [x] 프런트엔드와 백엔드 구조 분리
  - `index.html`
  - `css/`
  - `js/`
  - `api/`
- [x] `requirements.txt` 존재
- [x] `.gitignore`로 환경변수/캐시 파일 제외

저장소: https://github.com/bamiro00/codyssey-save/tree/main/A1-3

## 3. README.md — 충족

- [x] 서비스 소개
- [x] 주요 기능
- [x] 기술 스택
- [x] 프로젝트 구조
- [x] 실행/배포 방법
- [x] 배포 URL
- [x] 환경변수 설정법
- [x] API 키 보안 원칙
- [x] HTML/CSS/JavaScript/Python 역할 설명
- [x] 사용자 입력 → fetch → Python API → 화면 반영 흐름 설명

## 4. 서비스 기획서 — 충족

파일: `docs/service-plan.md`

- [x] 서비스 목적
- [x] 타깃 사용자
- [x] 페이지/섹션 구성
- [x] 핵심 기능
- [x] AI 기능 입력/처리/출력 기준
- [x] 실패 처리
- [x] 반응형 UX
- [x] 서비스 한계

## 5. 증빙 자료 — 충족

최종 배포 화면과 AI 동작/개발 과정 캡처를 `docs/evidence/`에 정리했습니다.

- [x] 데스크톱 전체/메인 화면
- [x] 모바일 화면
- [x] AI 비교 결과가 보이는 화면
- [x] AI 코딩 도구 사용 과정

권장 파일명과 캡처 위치는 `docs/evidence-guide.md` 참고.

## 기능 요구사항 대조

### 서비스 기획
- [x] 아이디어 정의
- [x] 목적/타깃 사용자 정의
- [x] 3개 이상 섹션
- [x] AI 기능 포함

### 프로젝트 초기화/GitHub
- [x] 기본 폴더 구조
- [x] GitHub 저장소/커밋

### 프런트엔드
- [x] HTML/CSS/JavaScript만 사용
- [x] AI 코딩 도구를 활용해 UI 구현
- [x] 메뉴/섹션 이동
- [x] 기본 레이아웃 스타일링

### 반응형
- [x] 데스크톱 확인
- [x] 모바일 확인

### AI 기능 UX
- [x] 사용자 입력 UI
- [x] AI 결과 표시
- [x] 빈 입력 오류 안내
- [x] API 오류 안내
- [x] 응답 지연/타임아웃 안내

### AI API 연동
- [x] `api/` Python endpoint
- [x] Gemini API 연동
- [x] `requirements.txt`
- [x] 프런트 `fetch('/api/compare')`

### 배포
- [x] GitHub ↔ Vercel 연결
- [x] 배포 URL에서 기능 재현 가능
- [x] 모바일/AI 기능 확인

### 보안/운영 안정성
- [x] API 키 환경변수 관리
- [x] 키가 코드/README에 없음
- [x] API 오류 상태 안내
- [x] 일시 오류 자동 재시도
- [x] 브라우저 타임아웃 처리
- [x] 키 유출 시 폐기/재발급 절차 README에 기재

## 보너스 과제

- 외부 저장소/DB 연동: 미구현 (선택 항목)
- 사용자 경험 개선: 반응형 UI, 검색 자동완성, 근거 색상 구분 등으로 일부 충족 가능

## 제출 전 최종 수동 확인

1. Vercel 주소에서 새로고침
2. 강아지 제품 2개 비교
3. 고양이 제품 2개 비교
4. AI 결과 정상 출력
5. 모바일에서 동일 기능 확인
6. 최종 화면 캡처 저장
7. GitHub `A1-3`에 README/docs 최신 파일 커밋
8. 실제 API 키가 GitHub/캡처에 노출되지 않았는지 마지막 확인
