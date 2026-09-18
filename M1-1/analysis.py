import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates


# =========================================================
# 1. 데이터 불러오기
# =========================================================

# 원본 엑셀 파일에서 실제 컬럼명이 4번째 행에 있으므로 header=3 사용
df = pd.read_excel("trade_data.xlsx", header=3)

# 날짜 형식 변환
df["기준월"] = pd.to_datetime(df["기준월"])


# =========================================================
# 2. 데이터 기본 정보 확인
# =========================================================

print("\n==============================")
print("데이터 기본 정보")
print("==============================")

print("\n데이터 앞부분:")
print(df.head())

print("\n데이터 크기:", df.shape)
print("컬럼명:", df.columns.tolist())

print("\n결측치 개수:")
print(df.isnull().sum())

print("\n데이터 시작일:", df["기준월"].min())
print("데이터 종료일:", df["기준월"].max())


# =========================================================
# 3. 무역수지 기초 통계
# =========================================================

print("\n==============================")
print("무역수지 기초 통계")
print("==============================")

print(df["무역수지"].describe())

# 최대 흑자 월
max_row = df.loc[df["무역수지"].idxmax()]

print("\n최대 흑자 월:")
print(max_row[["기준월", "무역수지"]])

# 최대 적자 월
min_row = df.loc[df["무역수지"].idxmin()]

print("\n최대 적자 월:")
print(min_row[["기준월", "무역수지"]])

# 흑자 / 적자 월 개수
surplus_months = (df["무역수지"] > 0).sum()
deficit_months = (df["무역수지"] < 0).sum()

print("\n흑자 월 수:", surplus_months)
print("적자 월 수:", deficit_months)


# =========================================================
# 4. 이상치 확인
# =========================================================

Q1 = df["무역수지"].quantile(0.25)
Q3 = df["무역수지"].quantile(0.75)
IQR = Q3 - Q1

lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

outliers = df[
    (df["무역수지"] < lower_bound)
    | (df["무역수지"] > upper_bound)
]

print("\n==============================")
print("이상치 확인")
print("==============================")

print("\n이상치 기준:")
print("하한:", lower_bound)
print("상한:", upper_bound)

print("\n이상치 후보:")
print(outliers[["기준월", "무역수지"]])


# =========================================================
# 5. 이상치 포함 / 제외 결과 비교
# =========================================================

df_no_outliers = df[
    (df["무역수지"] >= lower_bound)
    & (df["무역수지"] <= upper_bound)
]

mean_all = df["무역수지"].mean() / 1_000_000_000
mean_no_outliers = df_no_outliers["무역수지"].mean() / 1_000_000_000

print("\n==============================")
print("이상치 포함 / 제외 평균 비교")
print("==============================")

print("전체 데이터 평균 무역수지 (십억 달러):",
      round(mean_all, 2))

print("이상치 제외 평균 무역수지 (십억 달러):",
      round(mean_no_outliers, 2))


# =========================================================
# 6. 전월 대비 무역수지 변화량
# =========================================================

# 무역수지는 음수가 될 수 있으므로 백분율 변화율 대신
# 전월과 비교한 금액 차이를 사용
df["전월대비_변화량"] = (
    df["무역수지"] / 1_000_000_000
).diff()

print("\n==============================")
print("전월 대비 무역수지 변화량")
print("==============================")

print("\n전월 대비 무역수지 변화량이 큰 감소 월:")
print(
    df[["기준월", "전월대비_변화량"]]
    .sort_values("전월대비_변화량")
    .head(10)
)


# =========================================================
# 7. 그래프용 단위 변환
# =========================================================

df["무역수지_십억달러"] = (
    df["무역수지"] / 1_000_000_000
)

# Windows 한글 폰트
plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False


# =========================================================
# 8. 시각화 1 - 월별 무역수지
# =========================================================

plt.figure(figsize=(14, 6))

plt.plot(
    df["기준월"],
    df["무역수지_십억달러"],
    marker="o",
    markersize=3,
    color="blue"
)

plt.axhline(0, color="black", linewidth=1)

plt.title("2016~2025년 한국 월별 무역수지 변화")
plt.xlabel("연도")
plt.ylabel("무역수지 (십억 달러)")

plt.gca().xaxis.set_major_locator(
    mdates.YearLocator()
)

plt.gca().xaxis.set_major_formatter(
    mdates.DateFormatter("%Y")
)

plt.grid(alpha=0.3)
plt.tight_layout()

plt.savefig(
    "trade_balance_monthly.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()


# =========================================================
# 9. 12개월 이동평균
# =========================================================

# 3개월 또는 6개월 이동평균보다 단기 변화에는 덜 민감하지만,
# 본 분석은 10년간의 연간 단위 장기 흐름을 보는 것이 목적이므로
# 12개월 이동평균을 사용
df["12개월_이동평균"] = (
    df["무역수지_십억달러"]
    .rolling(window=12)
    .mean()
)


# =========================================================
# 10. 시각화 2 - 월별 무역수지 + 이동평균
# =========================================================

plt.figure(figsize=(14, 6))

plt.plot(
    df["기준월"],
    df["무역수지_십억달러"],
    marker="o",
    markersize=3,
    color="blue",
    label="월별 무역수지"
)

plt.plot(
    df["기준월"],
    df["12개월_이동평균"],
    linewidth=3,
    color="red",
    label="12개월 이동평균"
)

plt.axhline(0, color="black", linewidth=1)

plt.title(
    "2016~2025년 한국 월별 무역수지와 12개월 이동평균"
)

plt.xlabel("연도")
plt.ylabel("무역수지 (십억 달러)")

plt.gca().xaxis.set_major_locator(
    mdates.YearLocator()
)

plt.gca().xaxis.set_major_formatter(
    mdates.DateFormatter("%Y")
)

plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()

plt.savefig(
    "trade_balance_moving_average.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()


# =========================================================
# 11. 월별 평균 - 계절성 확인
# =========================================================

monthly_pattern = (
    df.groupby("월")["무역수지"].mean()
    / 1_000_000_000
)

print("\n==============================")
print("월별 평균 무역수지 - 계절성 확인")
print("==============================")

print(monthly_pattern.round(2))

print("\n평균 무역수지가 가장 높은 월:")
print(
    monthly_pattern.idxmax(),
    round(monthly_pattern.max(), 2)
)

print("\n평균 무역수지가 가장 낮은 월:")
print(
    monthly_pattern.idxmin(),
    round(monthly_pattern.min(), 2)
)


# =========================================================
# 12. 연도별 흑자 / 적자 월 수
# =========================================================

yearly_balance = (
    df.groupby("연도")["무역수지"].agg(
        흑자월수=lambda x: (x > 0).sum(),
        적자월수=lambda x: (x < 0).sum()
    )
)

print("\n==============================")
print("연도별 흑자 / 적자 월 수")
print("==============================")

print(yearly_balance)


# =========================================================
# 13. 시각화 3 - 연도별 흑자 / 적자 월 수
# =========================================================

yearly_balance.plot(
    kind="bar",
    figsize=(12, 6)
)

plt.title(
    "2016~2025년 연도별 무역수지 흑자·적자 월 수"
)

plt.xlabel("연도")
plt.ylabel("개월 수")

plt.xticks(rotation=0)

plt.legend(
    ["흑자 월", "적자 월"]
)

plt.grid(
    axis="y",
    alpha=0.3
)

plt.tight_layout()

plt.savefig(
    "trade_balance_surplus_deficit_months.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()


# =========================================================
# 14. 연도별 월평균 무역수지
# =========================================================

yearly_mean = (
    df.groupby("연도")["무역수지"].mean()
    / 1_000_000_000
)

print("\n==============================")
print("연도별 월평균 무역수지")
print("==============================")

print(
    yearly_mean.round(2)
)


# =========================================================
# 15. 분기별 재검증
# =========================================================

df["분기"] = (
    df["기준월"]
    .dt.to_period("Q")
)

quarterly_balance = (
    df.groupby("분기")["무역수지"].sum()
    / 1_000_000_000
)

print("\n==============================")
print("분기별 무역수지 - 월별 분석 결과 재검증")
print("==============================")

print(
    quarterly_balance.round(2)
)


# =========================================================
# 분석 완료
# =========================================================

print("\n==============================")
print("분석 완료")
print("==============================")