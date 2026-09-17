import pandas as pd

# 엑셀 파일 불러오기
# 실제 열 제목이 4번째 행에 있으므로 header=3 사용
df = pd.read_excel("trade_data.xlsx", header=3)

# 데이터 앞부분 확인
print(df.head())

# 데이터 크기 확인
print("데이터 크기:", df.shape)

# 컬럼명 확인
print("컬럼명:", df.columns.tolist())

# 결측치 확인
print("결측치 개수:")
print(df.isnull().sum())

# 데이터 기간 확인
print("데이터 시작일:", df["기준월"].min())
print("데이터 종료일:", df["기준월"].max())

# 무역수지 기초 통계
print("\n무역수지 기초 통계:")
print(df["무역수지"].describe())

# 최대 흑자 월
max_row = df.loc[df["무역수지"].idxmax()]
print("\n최대 흑자 월:")
print(max_row[["기준월", "무역수지"]])

# 최대 적자 월
min_row = df.loc[df["무역수지"].idxmin()]
print("\n최대 적자 월:")
print(min_row[["기준월", "무역수지"]])

# 흑자/적자 월 개수
surplus_months = (df["무역수지"] > 0).sum()
deficit_months = (df["무역수지"] < 0).sum()

print("\n흑자 월 수:", surplus_months)
print("적자 월 수:", deficit_months)

# IQR 방식으로 무역수지 이상치 후보 확인
Q1 = df["무역수지"].quantile(0.25)
Q3 = df["무역수지"].quantile(0.75)
IQR = Q3 - Q1

lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

outliers = df[
    (df["무역수지"] < lower_bound) |
    (df["무역수지"] > upper_bound)
]

print("\n이상치 기준:")
print("하한:", lower_bound)
print("상한:", upper_bound)

print("\n이상치 후보:")
print(outliers[["기준월", "무역수지"]])

import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# 한글 폰트 설정 (Windows)
plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

# 날짜 형식 확인
df["기준월"] = pd.to_datetime(df["기준월"])

# 그래프에서 보기 쉽도록 무역수지를 십억 달러 단위로 변환
df["무역수지_십억달러"] = df["무역수지"] / 1_000_000_000

# 그래프 생성
plt.figure(figsize=(14, 6))

plt.plot(
    df["기준월"],
    df["무역수지_십억달러"],
    marker="o",
    markersize=3
)

# 흑자/적자를 구분하는 0 기준선
plt.axhline(0, linewidth=1)

# 제목과 축 이름
plt.title("2016~2025년 한국 월별 무역수지 변화")
plt.xlabel("연도")
plt.ylabel("무역수지 (십억 달러)")

# X축을 1년 단위로 표시
plt.gca().xaxis.set_major_locator(mdates.YearLocator())
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

plt.grid(alpha=0.3)
plt.tight_layout()

# 그래프 이미지 저장
plt.savefig(
    "trade_balance_monthly.png",
    dpi=300,
    bbox_inches="tight"
)

# 화면에 그래프 표시
plt.show()

# 12개월 이동평균 계산
df["12개월_이동평균"] = df["무역수지_십억달러"].rolling(window=12).mean()

# 두 번째 그래프 생성
plt.figure(figsize=(14, 6))

# 월별 무역수지
plt.plot(
    df["기준월"],
    df["무역수지_십억달러"],
    marker="o",
    markersize=3,
    label="월별 무역수지"
)

# 12개월 이동평균
plt.plot(
    df["기준월"],
    df["12개월_이동평균"],
    linewidth=3,
    color="red",
    label="12개월 이동평균"
)

# 흑자/적자 기준선
plt.axhline(0, linewidth=1)

plt.title("2016~2025년 한국 월별 무역수지와 12개월 이동평균")
plt.xlabel("연도")
plt.ylabel("무역수지 (십억 달러)")

plt.gca().xaxis.set_major_locator(mdates.YearLocator())
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()

# 이미지 저장
plt.savefig(
    "trade_balance_moving_average.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

# 연도별 흑자/적자 월 수 계산
yearly_balance = df.groupby("연도")["무역수지"].agg(
    흑자월수=lambda x: (x > 0).sum(),
    적자월수=lambda x: (x < 0).sum()
)

print("\n연도별 흑자/적자 월 수:")
print(yearly_balance)

# 세 번째 그래프 생성
yearly_balance.plot(
    kind="bar",
    figsize=(12, 6)
)

plt.title("2016~2025년 연도별 무역수지 흑자·적자 월 수")
plt.xlabel("연도")
plt.ylabel("개월 수")

plt.xticks(rotation=0)
plt.legend(["흑자 월", "적자 월"])
plt.grid(axis="y", alpha=0.3)

plt.tight_layout()

# 이미지 저장
plt.savefig(
    "trade_balance_surplus_deficit_months.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

# 연도별 평균 무역수지 계산
yearly_mean = df.groupby("연도")["무역수지"].mean() / 1_000_000_000

print("\n연도별 월평균 무역수지 (십억 달러):")
print(yearly_mean.round(2))