# 노코드 자동화 기초 위크플로우 설계

[프로젝트 1. 자동화 도구 비교 구현.pdf](https://github.com/user-attachments/files/29546953/1.pdf)

[화장품 고객 문의 접수 폼(응답).xlsx](https://github.com/user-attachments/files/29546962/default.xlsx)


### 프로젝트1. Make와 Zapier를 활용한 화장품 고객 문의 자동 분류 시스템 비교
본 프로젝트에서는 동일한 자동화 업무를 Make와 Zapier 두 가지 자동화 플랫폼으로 각각 구현하고, 구현 과정과 기능을 비교 분석하였다.
자동화 대상은 화장품 고객 문의 접수 시스템으로, Google Form을 통해 접수된 문의를 Google Sheets에 저장한 후 문의 유형에 따라 자동으로 담당 부서를 지정하고 문의 유형별 시트로 자동 분류되도록 구현하였다.

---
### 사용한 자동화 도구
|구분 |	사용 도구|
|----|---------|
|Form|	Google Forms|
|Database| Google Sheets|
|자동화①|	Make|
|자동화②|	Zapier|

---
### 구현한 자동화 워크플로우
Google Forms → Google Sheets → 문의 유형 확인 → 조건 분기 → 담당부서 지정 → 처리상태 지정 → 문의유형별 시트 저장


- Google Forms 입력(공통)

<img width="452" height="597" alt="image" src="https://github.com/user-attachments/assets/e2efca7c-2aa7-4843-9606-6ee90a0bc017" />, <img width="453" height="595" alt="image" src="https://github.com/user-attachments/assets/fa4bfe11-f4b1-4102-8983-7bf8c269f78a" />

### [ Make ]
- Make 전체 시나리오
<img width="757" height="619" alt="image" src="https://github.com/user-attachments/assets/57d00eca-8748-4e72-a45c-1fe65efe6914" />

### [ Zapier ]
- Zapier 전체 잽(Zap)
<img width="938" height="399" alt="image" src="https://github.com/user-attachments/assets/96691291-b268-407b-9259-c5fdcf3c2fd0" />

---
### 실행 결과
- 배송 문의 → 물류팀
- 상품 문의 → 상품기획팀
- 교환/반품 문의 → 고객지원팀
- 환불 문의 → 고객지원팀
- 기타 문의 → 고객지원팀

모든 문의 유형이 조건에 맞게 자동 분류되었으며, 문의_전체 시트와 문의 유형별 시트에도 정상적으로 저장되는 것을 확인하였다.

**[문의 전체 시트 실행 결과]**

<img width="939" height="460" alt="image" src="https://github.com/user-attachments/assets/1bc46cdd-dd3d-43c7-a09a-41b32d10d86d" />


**[문의유형별 시트 실행 결과]**

- 배송_문의
<img width="950" height="563" alt="image" src="https://github.com/user-attachments/assets/fb1c25cc-ee21-48e2-8d37-b48003867afd" />


- 기타_문의
<img width="939" height="453" alt="image" src="https://github.com/user-attachments/assets/99e38ea6-c2fa-42b2-aa71-1be7220f3b8f" />

---
### Make와 Zapier 비교

|비교 항목|	Make|	Zapier|
|-----|-----|-----|
|사용화면(UI/UX)|	Google Sheets와 쉽게 연동되며 기본적인 데이터 추가 및 수정 작업을 편리하게 수행할 수 있다.|	단계별 화면으로 구성되어 초보자도 순서대로 설정하기 쉽다.|
|설정 난이도|	Router, Filter 등 다양한 기능을 제공하여 설정이 다소 복잡하다.|	Path 중심으로 설정하여 비교적 간단하게 구성할 수 있다.|
|조건 분기| Router와 Filter를 활용하여 복잡한 조건 분기와 다양한 자동화를 구현할 수 있다.|	Paths 기능을 이용하여 기본적인 조건 분기를 쉽게 구현할 수 있다.|
|무료 플랜|	무료 플랜에서도 실습 수준의 자동화 구현이 가능하며 비교적 기능이 다양하다.|	무료 플랜에서는 일부 기능이 제한되며 Paths 사용에도 제약이 있다.(유료 기능 제약이 있음)|
|실행 로그|	각 모듈의 실행 결과와 데이터 흐름을 시각적으로 확인할 수 있다.|	단계별 실행 결과를 순차적으로 확인할 수 있다.|
|Google Sheets 연동|	Google Sheets와 유연하게 연동되어 데이터 추가·수정 등 다양한 작업을 수행할 수 있다.|	Google Sheets와 쉽게 연동되며 기본적인 데이터 추가 및 수정 작업을 편리하게 수행할 수 있다.|

