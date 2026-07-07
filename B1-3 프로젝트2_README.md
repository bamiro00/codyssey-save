[프로젝트 2. 자유 주제 자동화 설계 및 구현.pdf](https://github.com/user-attachments/files/29550449/2.pdf)

[화장품 고객 리뷰 접수 폼(응답).xlsx](https://github.com/user-attachments/files/29548070/default.xlsx)

### 프로젝트 2. 화장품 고객 리뷰 자동 분류 시스템(Make)
본 프로젝트는 고객이 Google Forms를 통해 작성한 화장품 리뷰를 자동으로 수집하고, 리뷰 내용을 분석하여 조건에 따라 분류하는 반복 업무를 자동화하는 것을 목표로 한다.
고객이 리뷰를 제출하면 Google Sheets에 자동으로 저장되며, **Make**가 신규 데이터를 감지하여 리뷰의 별점과 내용을 기준으로 긍정 리뷰, 보통 리뷰, 불만 리뷰로 자동 분류한다.
불만 리뷰의 경우에는 리뷰 내용에 포함된 특정 키워드를 한 번 더 검사하여 긴급 검토가 필요한 리뷰와 일반 리뷰를 자동으로 구분하도록 구성하였다.
이를 통해 반복적으로 수행하던 고객 리뷰 확인, 분류 및 관리 업무를 자동화하여 업무 효율성을 높이고, 긴급하게 대응해야 하는 리뷰를 빠르게 확인할 수 있도록 구현하였다.

---
### 사용한 도구
|구분|	사용 도구|
|---|------|
|Form|	Google Forms|
|Database|	Google Sheets|
|자동화|	Make|

---
### Make 선정 이유
본 프로젝트에서는 Google Forms를 통해 접수된 고객 리뷰를 자동으로 수집하고, 리뷰의 별점과 내용을 기준으로 여러 단계의 조건 분기를 수행해야 하므로 **Make를 자동화 도구로 선정**하였다.

Make는 Google Forms와 Google Sheets를 안정적으로 연동할 수 있으며, Router와 Filter를 활용하여 하나의 시나리오 안에서 다양한 조건에 따라 데이터를 자동으로 분류할 수 있다는 장점이 있다. 또한 자동화 흐름을 시각적으로 구성할 수 있어 전체 프로세스를 쉽게 이해할 수 있었으며, 각 단계의 실행 결과를 확인하면서 테스트와 오류 수정도 편리하게 진행할 수 있었다.

이번 프로젝트에서는 고객 리뷰를 긍정 리뷰, 보통 리뷰, 일반 리뷰로 먼저 분류하고, 일반 리뷰에 대해서는 추가 조건을 적용하여 긴급 검토와 일반 리뷰로 다시 분류하는 자동화 구조를 구현하였다. 

이러한 다단계 조건 분기는 Make의 Router와 Filter 기능을 활용하여 효율적으로 구성할 수 있었다.

또한 Make는 무료 플랜에서도 본 프로젝트의 자동화 기능을 구현할 수 있었으며, Google 서비스와의 연동이 간편하고 확장성이 뛰어나 향후 다양한 자동화 업무에도 활용할 수 있다는 점에서 본 프로젝트에 가장 적합한 도구라고 판단하였다.

---
### 워크플로우 설계
- 전체 자동화 흐름

Google Form 작성 → Google Sheets(리뷰_전체) → Trigger(Watch New Rows) → Router1(별점 기준 분기) → 긍정 리뷰 / 보통 리뷰 / 불만 리뷰 분류 → Router2(불만 리뷰 긴급 여부 분기) → 긴급_검토 또는 일반_리뷰 시트 저장

- Google Form

<img width="465" height="571" alt="image" src="https://github.com/user-attachments/assets/f702ab0c-b7c7-4ace-a9a8-e69e52a402ea" />, <img width="469" height="570" alt="image" src="https://github.com/user-attachments/assets/304c31a2-a316-4b41-8604-2dcab42c2c8b" />

- Make 전체 시나리오

<img width="785" height="635" alt="image" src="https://github.com/user-attachments/assets/f5af754b-70f7-4fb3-98d2-b339069fd5b4" />

---

### 실행 결과

|입력 조건|	결과|
|------|------|
|⭐⭐⭐⭐⭐ 5점|	긍정_리뷰 저장|
|⭐⭐⭐ 3점|	보통_리뷰 저장|
|⭐⭐ 2점 (일반 불만)|	일반_리뷰 저장|
|⭐ 1점 + "환불"|	긴급_검토 저장|

자동 실행 결과
- 긍정 리뷰는 긍정_리뷰 시트에 저장
- 보통 리뷰는 보통_리뷰 시트에 저장
- 일반 불만 리뷰는 일반_리뷰 시트에 저장
- 긴급 키워드가 포함된 리뷰는 긴급_검토 시트에 저장

테스트 결과 모든 조건 분기와 자동 저장이 정상적으로 수행되었으며, 반복 업무를 자동화할 수 있음을 확인하였다.

**[리뷰 전체 시트(Google Sheets)]**

<img width="940" height="517" alt="image" src="https://github.com/user-attachments/assets/d180c95e-b23c-4111-bb9b-4bcf48767d63" />

**[긍정_리뷰 실행결과]**

<img width="940" height="578" alt="image" src="https://github.com/user-attachments/assets/900a0561-33fe-4022-8518-c70faf1753e7" />

**[일반_리뷰 실행결과]**

<img width="940" height="578" alt="image" src="https://github.com/user-attachments/assets/d18ee612-ea4a-4313-a846-a4c60f2e9859" />

**[긴급_검토 실행결과]**

<img width="940" height="615" alt="image" src="https://github.com/user-attachments/assets/6d24f341-d81f-4e1e-a3ba-e13f73f4f594" />

---
### 추가과제 2_ 대체 경로 구현
본 프로젝트에서는 보너스 과제 2의 **대체 경로(Fallback Route) 기능**을 구현하였다.

불만 리뷰는 먼저 긴급 검토 여부를 판단하기 위해 Router를 통해 한 번 더 분기하도록 설계하였다. 
리뷰 내용에 **"환불", "따가움", "붉어짐", "트러블", "알레르기", "부작용"** 등의 **_긴급 키워드_** 가 포함된 경우에는 긴급_검토 시트에 자동 저장되도록 구성하였다.

반면, 긴급 키워드가 포함되지 않은 불만 리뷰는 별도의 조건을 만족하지 않더라도 데이터가 누락되지 않도록 _**Fallback Route를 적용**_ 하였다. 이를 통해 해당 리뷰는 자동으로 일반_리뷰 시트에 저장되도록 구현하였다.

이와 같이 Fallback Route를 활용하여 조건에 해당하지 않는 데이터도 자동으로 처리되는 대체 경로를 구현하였으며, 리뷰 누락을 방지하고 안정적으로 데이터를 분류할 수 있는 자동화 구조를 완성하였다.

<img width="1157" height="684" alt="image" src="https://github.com/user-attachments/assets/d0fc5e75-96db-4319-94c8-39402bd265d0" />

