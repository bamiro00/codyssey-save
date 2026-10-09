import pandas as pd
from pathlib import Path

from firebase_config import db


# 현재 프로젝트 폴더에 있는 엑셀 파일
FILE_PATH = Path(__file__).parent / "K뷰티_월별_수출액_통합.xlsx"


def upload_data():
    # 1. 엑셀 읽기
    df = pd.read_excel(FILE_PATH)

    print("엑셀 데이터 개수:", len(df))
    print("엑셀 컬럼:", df.columns.tolist())

    # 2. 필요한 컬럼 확인
    required_columns = {"date", "value", "memo"}

    if not required_columns.issubset(df.columns):
        raise ValueError(
            f"엑셀에 필요한 컬럼이 없습니다. "
            f"필요한 컬럼: {required_columns}"
        )

    # 3. 중복 확인
    duplicate_count = df["date"].duplicated().sum()

    if duplicate_count > 0:
        raise ValueError(
            f"중복된 날짜가 {duplicate_count}개 있습니다."
        )

    # 4. 빈 값 확인
    if df[["date", "value", "memo"]].isnull().any().any():
        raise ValueError("빈 값이 있는 데이터가 있습니다.")

    # 5. Firestore 업로드
    batch = db.batch()

    for _, row in df.iterrows():
        date = str(row["date"]).strip()
        value = int(row["value"])
        memo = str(row["memo"]).strip()

        # 날짜를 문서 ID로 사용
        doc_ref = db.collection("data").document(date)

        batch.set(
            doc_ref,
            {
                "date": date,
                "value": value,
                "memo": memo,
                "unit": "US$"
            }
        )

    # 6. 한 번에 저장
    batch.commit()

    print("--------------------------------")
    print("Firestore 업로드 완료!")
    print(f"총 {len(df)}개 데이터 저장")
    print("--------------------------------")


if __name__ == "__main__":
    upload_data()