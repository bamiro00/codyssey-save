# **ChatGPT에게 일을 제대로 시키는 법 배우기**

[LLM 모델 비교·선정 보고서.docx](https://github.com/user-attachments/files/28923857/LLM.docx)

[시스템 설계 문서.docx](https://github.com/user-attachments/files/28923859/default.docx)

[실행 로그 - 대화 로그.docx](https://github.com/user-attachments/files/28923862/-.docx)

[부록_대화 원문.docx](https://github.com/user-attachments/files/28923863/_.docx)

---

## 프로젝트 소개
프로젝트 주제는 **「LLM 기반 화장품 리뷰 요약 및 마케팅 문구 생성 자동화**」로 친숙한 화장품 분야로 주제를 잡았습니다. 
화장품 분야는 리뷰가 마케팅에 매우 중요하다고 생각했습니다. 고객 리뷰에는 사용감, 만족도, 아쉬운 점, 피부 타입별 반응이 들어 있기 때문에 제품 홍보 문구를 만들 때 중요한 자료가 됩니다.
다만 사람이 리뷰를 직접 정리하면 시간이 오래 걸리고, 마케팅 문구를 만들 때 과장 표현이나 사실과 다른 표현이 들어갈 위험이 있습니다.
그래서 LLM을 활용해 리뷰 요약과 마케팅 문구 초안 작성을 자동화하는 과제를 선택했습니다.

제품은 **브링그린 티트리 시카 수딩 토너**를 기준으로 했습니다. 실제 제품 정보를 사용한 이유는 AI가 제품 정보에 없는 성분이나 효능을 만들어내는지 쉽게 검증하기 위해서입니다. 다만 고객 리뷰는 실제 리뷰를 그대로 쓰지 않고, 개인정보나 저작권 문제를 피하기 위해 가상 리뷰로 만들었습니다.

---

## ver1 프롬프트에 대한 클로드의 답변

<img width="1212" height="534" alt="image" src="https://github.com/user-attachments/assets/ba4c087b-b9c3-4822-a81d-64cf06619265" />

## ver2 프롬프트에 대한 답변

<img width="413" height="431" alt="image" src="https://github.com/user-attachments/assets/a529635d-ecaa-46cd-b4ee-3b1654cf1c2f" />
<img width="1111" height="398" alt="image" src="https://github.com/user-attachments/assets/8ffcd2c8-7831-42bd-982d-96949c1e6942" />
<img width="375" height="382" alt="image" src="https://github.com/user-attachments/assets/1c0c8316-833c-47e1-b1d5-7d1dd747890b" /> <img width="337" height="297" alt="image" src="https://github.com/user-attachments/assets/f9732237-d2d3-4f1e-9ba2-3f47c4f28006" />
<img width="201" height="211" alt="image" src="https://github.com/user-attachments/assets/5da55d0e-9762-4090-9bff-2cb9481597e4" />  <img width="311" height="259" alt="image" src="https://github.com/user-attachments/assets/fd3cba8c-d0e1-46df-a2e4-1105fb83aca1" />

---

## 최종모델 **Claude Haiku 4.5**

**선정 근거 1. 제품 정보와 사용 가능 표현을 명확히 구분함**

Claude는 제품 정보를 먼저 정리하고, 마케팅 문구 작성 시 사용할 수 있는 표현과 피해야 할 표현을 구분하였다. 이는 화장품 마케팅 업무에서 중요한 안전성 기준을 반영한 것이다.

**선정 근거 2. 기능성 화장품 오인 가능성을 잘 통제함**

제품 정보에 “기능성 화장품 여부: 해당사항 없음”이 포함되어 있었기 때문에, 미백, 주름 개선, 여드름 치료와 같은 표현은 피해야 한다.
Claude는 이러한 조건을 가장 명확하게 반영하였고, 과장 표현을 줄이는 데 강점을 보였다.

**선정 근거 3. 리뷰 분석 구조가 가장 체계적임**

Claude는 가상 리뷰를 작성한 뒤 긍정 키워드, 아쉬운 표현, 반복 키워드, 마케팅 포인트를 구분해 정리하였다. 이는 단순한 문구 생성이 아니라 리뷰 기반 마케팅 업무 자동화라는 과제 목적에 잘 맞는다.

**선정 근거 4. 출력 형식이 보고서 작성에 적합함**

Claude의 결과는 표와 항목 구분이 명확하여 모델 비교 보고서, 시스템 설계 문서, 실행 로그로 정리하기 쉽다. 또한 과제에서 요구하는 검증 전략과 안전성 검토 항목을 문서화하기에 적합하다.

---
## 추가과제_ 멀티모달 확장(업무 결과의 시각화)

<img width="1536" height="1024" alt="ChatGPT Image 2026년 6월 14일 오후 08_09_00" src="https://github.com/user-attachments/assets/dbf25fc3-a237-46d6-9b7f-0607de2c1163" />
