import argparse
import json
import os
from datetime import datetime

from dotenv import load_dotenv
from google import genai
import requests


# .env 파일의 환경변수를 불러옵니다.
load_dotenv()

KAKAO_LOCAL_API_CONFIG = {
    "search_url": os.getenv(
        "KAKAO_LOCAL_SEARCH_URL",
        "https://dapi.kakao.com/v2/local/search/keyword.json"
    ),
    "authorization_prefix": "KakaoAK",
    "default_result_size": 5,
    "timeout_seconds": 10
}

def parse_args():
    """터미널에서 여행 날짜를 입력받습니다."""
    parser = argparse.ArgumentParser(
        description="국내 여행 추천 프로그램"
    )

    parser.add_argument(
        "-date",
        required=True,
        help='여행 날짜를 YYYY-MM-DD 형식으로 입력하세요.'
    )

    return parser.parse_args()


def validate_date(date_text):
    """날짜 형식과 과거 날짜 여부를 확인합니다."""
    try:
        travel_date = datetime.strptime(
            date_text,
            "%Y-%m-%d"
        ).date()

    except ValueError:
        return False, "invalid_format"

    today = datetime.now().date()

    if travel_date < today:
        return False, "past_date"

    return True, None


def load_api_keys():
    """Gemini와 Kakao API 키가 설정되어 있는지 확인합니다."""
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY")

    missing_keys = []

    if not gemini_api_key:
        missing_keys.append("GEMINI_API_KEY")

    if not kakao_api_key:
        missing_keys.append("KAKAO_REST_API_KEY")

    if missing_keys:
        print("오류: 필요한 API 키가 설정되지 않았습니다.")
        print("누락된 키:", ", ".join(missing_keys))
        print(".env 파일에 API 키를 설정한 뒤 다시 실행하세요.")
        return None, None

    return gemini_api_key, kakao_api_key


def clean_json_text(text):
    """Gemini 응답에 코드 블록 표시가 있으면 제거합니다."""
    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()

def validate_recommendation_schema(recommendation):
    """Gemini 추천 결과의 필수 키, 타입, 값 구조를 검증합니다."""

    if not isinstance(recommendation, dict):
        raise ValueError(
            "Gemini 추천 결과는 JSON 객체여야 합니다."
        )

    required_keys = [
        "recommended_cities",
        "weather",
        "events",
        "reason"
    ]

    for key in required_keys:
        if key not in recommendation:
            raise ValueError(
                f"Gemini 추천 결과에 필수 키가 없습니다: {key}"
            )

    cities = recommendation["recommended_cities"]

    if not isinstance(cities, list):
        raise ValueError(
            "recommended_cities는 리스트여야 합니다."
        )

    if not 2 <= len(cities) <= 3:
        raise ValueError(
            "recommended_cities에는 2~3개 지역이 있어야 합니다."
        )

    if not all(
        isinstance(city, str) and city.strip()
        for city in cities
    ):
        raise ValueError(
            "recommended_cities의 모든 항목은 "
            "비어 있지 않은 문자열이어야 합니다."
        )

    normalized_cities = [
        city.strip()
        for city in cities
    ]

    if len(set(normalized_cities)) != len(normalized_cities):
        raise ValueError(
            "recommended_cities에 중복된 지역이 있습니다."
        )

    weather = recommendation["weather"]

    if not isinstance(weather, str) or not weather.strip():
        raise ValueError(
            "weather는 비어 있지 않은 문자열이어야 합니다."
        )

    events = recommendation["events"]

    if not isinstance(events, list):
        raise ValueError(
            "events는 리스트여야 합니다."
        )

    if not 1 <= len(events) <= 3:
        raise ValueError(
            "events에는 1~3개의 항목이 있어야 합니다."
        )

    if not all(
        isinstance(event, str) and event.strip()
        for event in events
    ):
        raise ValueError(
            "events의 모든 항목은 "
            "비어 있지 않은 문자열이어야 합니다."
        )

    reason = recommendation["reason"]

    if not isinstance(reason, str) or not reason.strip():
        raise ValueError(
            "reason은 비어 있지 않은 문자열이어야 합니다."
        )

    recommendation["recommended_cities"] = normalized_cities
    recommendation["weather"] = weather.strip()
    recommendation["events"] = [
        event.strip()
        for event in events
    ]
    recommendation["reason"] = reason.strip()

    return recommendation


def generate_recommendation(date_text, gemini_api_key):
    """Gemini API로 국내 여행 지역 3곳을 추천받고 JSON으로 변환합니다."""
    client = genai.Client(api_key=gemini_api_key)

    prompt = f"""
사용자가 국내 여행을 계획하고 있습니다.

여행 날짜: {date_text}

해당 시기에 여행하기 좋은 국내 지역 3곳을 추천하세요.

반드시 아래 JSON 형식으로만 답하세요.
JSON 이외의 설명이나 Markdown 코드 블록은 작성하지 마세요.

{{
    "recommended_cities": [
        "지역 1",
        "지역 2",
        "지역 3"
    ],
    "weather": "해당 시기의 국내 여행 날씨를 간단히 요약",
    "events": [
        "행사 또는 축제 후보 1",
        "행사 또는 축제 후보 2",
        "행사 또는 축제 후보 3"
    ],
    "reason": "추천 지역들을 선정한 전체적인 이유를 2~4문장으로 작성"
}}

조건:
- recommended_cities는 서로 다른 국내 도시 또는 지역 3곳이어야 합니다.
- recommended_cities는 문자열 배열이어야 합니다.
- weather는 문자열이어야 합니다.
- events는 문자열 1~3개가 들어 있는 배열이어야 합니다.
- reason은 문자열이어야 합니다.
- 실제 날씨나 행사 일정의 정확성을 보장하는 것이 목적은 아닙니다.
- 확실하지 않은 행사는 확정된 사실처럼 표현하지 마세요.
"""

    required_keys = [
        "recommended_cities",
        "weather",
        "events",
        "reason"
    ]

    # 첫 번째 Gemini 요청
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    try:
        cleaned_text = clean_json_text(response.text)
        recommendation = json.loads(cleaned_text)

        return validate_recommendation_schema(recommendation)

    except (json.JSONDecodeError, ValueError) as error:
          print(
              f" - JSON 형식 또는 스키마 확인 실패: {error}"
       )
          print(" - 필수 형식으로 1회 재요청합니다.")

  # 첫 응답에 문제가 있을 때 최대 1회만 재요청
    retry_prompt = f"""
이전 응답을 정상적인 JSON으로 처리할 수 없었습니다.

여행 날짜: {date_text}

해당 시기에 여행하기 좋은 서로 다른 국내 지역 3곳을 추천하세요.

반드시 아래 형식의 JSON 객체만 출력하세요.

{{
    "recommended_cities": [
        "지역 1",
        "지역 2",
        "지역 3"
    ],
    "weather": "일반적인 날씨 요약",
    "events": [
        "행사 또는 축제 후보"
    ],
    "reason": "추천 이유"
}}

중요:
- JSON 이외의 설명은 작성하지 마세요.
- Markdown 코드 블록을 사용하지 마세요.
- recommended_cities는 반드시 2~3개의 문자열 배열이어야 합니다.
- recommended_cities, weather, events, reason 키를 모두 포함하세요.
"""

    retry_response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=retry_prompt
    )

    cleaned_text = clean_json_text(retry_response.text)
    recommendation = json.loads(cleaned_text)

    try:
        return validate_recommendation_schema(recommendation)

    except ValueError as error:
        raise ValueError(
            f"재요청 결과의 스키마도 올바르지 않습니다: {error}"
        ) from error

def normalize_city_name(city):
    """도시명을 Kakao Local 검색에 적합한 형태로 정규화합니다."""

    if not isinstance(city, str):
        raise ValueError("도시명은 문자열이어야 합니다.")

    city = " ".join(city.strip().split())

    if not city:
        raise ValueError("도시명이 비어 있습니다.")

    # 자주 사용되는 행정구역 명칭과 축약 표현을 통일합니다.
    city_aliases = {
        "서울특별시": "서울",
        "서울시": "서울",
        "부산광역시": "부산",
        "부산시": "부산",
        "대구광역시": "대구",
        "대구시": "대구",
        "인천광역시": "인천",
        "인천시": "인천",
        "광주광역시": "광주",
        "광주시": "광주",
        "대전광역시": "대전",
        "대전시": "대전",
        "울산광역시": "울산",
        "울산시": "울산",
        "세종특별자치시": "세종",
        "세종시": "세종",
        "제주특별자치도": "제주",
        "제주도": "제주",
        "강원특별자치도": "강원",
        "강원도": "강원",
        "전북특별자치도": "전북",
        "전라북도": "전북",
        "전라남도": "전남",
        "경상북도": "경북",
        "경상남도": "경남",
        "충청북도": "충북",
        "충청남도": "충남"
    }

    if city in city_aliases:
        return city_aliases[city]

    # 예: "강원특별자치도 강릉시" → "강릉"
    # 예: "경상북도 경주시" → "경주"
    city_parts = city.split()

    if len(city_parts) >= 2:
        city = city_parts[-1]

    administrative_suffixes = [
        "특별자치시",
        "특별자치도",
        "특별시",
        "광역시",
        "자치시",
        "자치도",
        "시",
        "군",
        "구"
    ]

    for suffix in administrative_suffixes:
        if city.endswith(suffix) and len(city) > len(suffix):
            city = city[:-len(suffix)]
            break

    city = city.strip()

    if not city:
        raise ValueError("도시명을 검색어로 변환할 수 없습니다.")

    return city

def search_restaurants(city, kakao_api_key):
    """Kakao Local API를 사용하여 추천 지역의 맛집 5곳을 검색합니다."""

    url = KAKAO_LOCAL_API_CONFIG["search_url"]

    headers = {
        "Authorization": (
            f"{KAKAO_LOCAL_API_CONFIG['authorization_prefix']} "
            f"{kakao_api_key}"
       )
   }

    normalized_city = normalize_city_name(city)

    params = {
    "query": f"{normalized_city} 맛집",
    "size": KAKAO_LOCAL_API_CONFIG["default_result_size"]
}

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=KAKAO_LOCAL_API_CONFIG["timeout_seconds"]
  )

    # 실패했을 때 카카오가 보내는 상세 오류 내용을 확인합니다.
    if response.status_code != 200:
        print(f" - Kakao HTTP 상태 코드: {response.status_code}")
        print(f" - Kakao 오류 응답: {response.text}")
        response.raise_for_status()

    data = response.json()
    documents = data.get("documents", [])

    restaurants = []

    for item in documents:
        address = (
            item.get("road_address_name")
            or item.get("address_name")
            or ""
        )

        restaurant = {
            "name": item.get("place_name", ""),
            "address": address,
            "category": item.get("category_name", ""),
            "url": item.get("place_url", ""),
            "x": item.get("x", ""),
            "y": item.get("y", "")
        }

        restaurants.append(restaurant)

    return restaurants

def generate_final_report(
    date_text,
    recommendation,
    restaurants,
    errors,
    gemini_api_key
):
    
    """1차 추천 정보와 맛집 정보를 이용해 최종 여행 리포트를 생성합니다."""
    client = genai.Client(api_key=gemini_api_key)

    recommendation_text = json.dumps(
        recommendation,
        ensure_ascii=False,
        indent=2
    )

    restaurants_text = json.dumps(
        restaurants,
        ensure_ascii=False,
        indent=2
    )

    prompt = f"""
다음 정보를 바탕으로 국내 여행 최종 리포트를 작성하세요.

여행 날짜:
{date_text}

1차 여행 추천 정보:
{recommendation_text}

맛집 검색 결과:
{restaurants_text}

최종 결과는 Markdown 형식으로 작성하세요.

반드시 다음 내용을 포함하세요.

# 국내 여행 추천 리포트

## 여행 날짜
사용자가 입력한 여행 날짜를 표시하세요.

## 추천 지역
recommended_cities에 포함된 추천 지역 2~3곳을 모두 표시하고,
전체 추천 이유를 정리하세요.

## 날씨 요약
1차 추천 정보의 날씨 내용을 정리하세요.

## 행사/축제
1차 추천 정보에 포함된 행사 또는 축제 후보를 목록으로 정리하세요.
확정 여부를 알 수 없는 행사는 확정된 일정처럼 표현하지 마세요.

## 지역별 맛집 추천
추천된 각 지역별로 맛집을 구분하여 정리하세요.

각 맛집 데이터의 city 값을 기준으로 지역별로 묶으세요.

예:

### 강릉
- 맛집명: 주소

### 제주
- 맛집명: 주소

### 경주
- 맛집명: 주소

특정 지역의 맛집 검색 결과가 없으면
해당 지역에 "데이터 없음"이라고 표시하세요.

## 1일 여행 일정
여행 일정을 다음 세 구간으로 나누어 제안하세요.

### 오전
추천 지역의 관광 또는 체험 일정을 제안하세요.

### 오후
점심 식사와 오후 관광 또는 체험을 자연스럽게 연결하여 제안하세요.

### 저녁
저녁 식사와 산책, 야경, 휴식 등 하루를 마무리하는 일정을 제안하세요.

일정은 실제 이동 흐름을 고려해 지나치게 많은 장소를 넣지 마세요.

주의사항:
- 제공되지 않은 실제 영업시간, 가격, 예약 가능 여부를 임의로 만들지 마세요.
- 행사 후보는 실제 개최가 확정된 것처럼 단정하지 마세요.
- 맛집은 제공된 Kakao Local API 검색 결과를 우선 사용하세요.
- Markdown 리포트 본문만 출력하세요.
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    report_text = response.text.strip()

    if errors:
        error_lines = "\n".join(
            f"- {str(error)}"
            for error in errors
        )
    else:
        error_lines = "- 기록된 오류 없음"

    return (
        f"{report_text}\n\n"
        "## 오류 요약\n"
        f"{error_lines}\n"
    )


def save_results(date_text, recommendation, restaurants, final_report, errors=None):
    """원본 JSON 데이터와 최종 Markdown 리포트를 results 폴더에 저장합니다."""
    results_dir = "results"

    # results 폴더가 없으면 자동으로 생성합니다.
    os.makedirs(results_dir, exist_ok=True)

    raw_file_path = os.path.join(
        results_dir,
        f"{date_text}_raw.json"
    )

    report_file_path = os.path.join(
        results_dir,
        f"{date_text}_travel_plan.md"
    )

    raw_data = {
        "date": date_text,
        "recommendation": recommendation,
        "restaurants": restaurants,
        "errors": errors or [],
        "final_report": final_report
}
    
    # 원본 데이터를 JSON으로 저장합니다.
    with open(raw_file_path, "w", encoding="utf-8") as file:
        json.dump(
            raw_data,
            file,
            ensure_ascii=False,
            indent=2
        )

    # 최종 여행 리포트를 Markdown으로 저장합니다.
    with open(report_file_path, "w", encoding="utf-8") as file:
        file.write(final_report)

    return raw_file_path, report_file_path

def load_cached_results(date_text):
    """같은 날짜의 저장 결과가 있으면 캐시 데이터를 불러옵니다."""
    results_dir = "results"

    raw_file_path = os.path.join(
        results_dir,
        f"{date_text}_raw.json"
    )

    report_file_path = os.path.join(
        results_dir,
        f"{date_text}_travel_plan.md"
    )

    # 원본 JSON이 없으면 캐시를 사용하지 않습니다.
    if not os.path.exists(raw_file_path):
        return None, None, raw_file_path, report_file_path

    try:
        with open(
            raw_file_path,
            "r",
            encoding="utf-8"
        ) as file:
            cached_data = json.load(file)

    except (OSError, json.JSONDecodeError):
        return None, None, raw_file_path, report_file_path

    # 현재 추가과제 1의 복수 지역 구조인지 확인합니다.
    recommendation = cached_data.get("recommendation", {})

    if "recommended_cities" not in recommendation:
        return None, None, raw_file_path, report_file_path

    # 기존 Markdown 리포트가 있으면 그대로 읽습니다.
    if os.path.exists(report_file_path):
        try:
            with open(
                report_file_path,
                "r",
                encoding="utf-8"
            ) as file:
                cached_report = file.read()

            return (
                cached_data,
                cached_report,
                raw_file_path,
                report_file_path
            )

        except OSError:
            pass

    # JSON 안에 최종 리포트가 있으면 그것을 사용합니다.
    cached_report = cached_data.get("final_report")

    if cached_report:
        return (
            cached_data,
            cached_report,
            raw_file_path,
            report_file_path
        )

    return None, None, raw_file_path, report_file_path

def main():
    args = parse_args()
    errors = []

    # 1. 날짜 형식 및 여행 가능 날짜 확인
    is_valid, error_type = validate_date(args.date)

    if not is_valid:
        if error_type == "invalid_format":
            print("오류: 날짜 형식이 올바르지 않습니다.")
            print('사용법: python travel_planner.py -date "YYYY-MM-DD"')

        elif error_type == "past_date":
            print("오류: 과거 날짜로는 여행 계획을 생성할 수 없습니다.")
            print("오늘 또는 미래 날짜를 입력하세요.")

        return

    print(f"입력한 여행 날짜: {args.date}")
    # 2. 기존 결과 캐시 확인
    (
        cached_data,
        cached_report,
        cached_raw_path,
        cached_report_path
    ) = load_cached_results(args.date)

    if cached_data is not None and cached_report is not None:
        print("저장된 결과를 찾았습니다.")
        print("API 호출을 건너뛰고 기존 결과를 사용합니다.")
        print()
        print(cached_report)

        print()
        print("캐시 결과 사용 완료")
        print(f" - 원본 JSON: {cached_raw_path}")
        print(f" - 최종 리포트: {cached_report_path}")
        return

    # 3. API 키 확인
    gemini_api_key, kakao_api_key = load_api_keys()

    if not gemini_api_key or not kakao_api_key:
        return

    print("API 키 설정 확인 완료")

    # 3. Gemini 1차 추천
    print("[1/3] 1차 추천 생성 중(LLM)...")

    try:
        recommendation = generate_recommendation(
            args.date,
            gemini_api_key
        )

    except json.JSONDecodeError:
        print("오류: Gemini 응답을 JSON으로 변환하지 못했습니다.")
        return

    except Exception as error:
        print(f"오류: Gemini API 호출에 실패했습니다: {error}")
        return

    print(" - recommended_cities:")

    for city in recommendation["recommended_cities"]:
        print(f"   · {city}")

    print(f' - weather: {recommendation["weather"]}')

    print(" - events:")
    for event in recommendation["events"]:
        print(f"   · {event}")

    print(f' - reason: {recommendation["reason"]}')

    print("1차 추천 생성 완료")

    # 5. 지역별 맛집 검색
    print("[2/3] 지역별 맛집 검색 중(지도/장소 API)...")

    restaurants = []

    for city in recommendation["recommended_cities"]:
        print(f" - {city} 맛집 검색 중...")

        try:
            city_restaurants = search_restaurants(
                city,
                kakao_api_key
            )

        except requests.RequestException as error:
            error_message = (
                f"Kakao Local API 맛집 검색 실패 "
                f"({city}): {error}"
            )

            print(f"   맛집 검색 실패: {error}")

            errors.append(error_message)
            city_restaurants = []

        if city_restaurants:
            print(
                f"   {city}: "
                f"맛집 {len(city_restaurants)}곳 검색 완료"
            )

            for restaurant in city_restaurants:
                restaurant["city"] = city
                restaurants.append(restaurant)

            for index, restaurant in enumerate(
                city_restaurants,
                start=1
            ):
                print(
                    f'   {index}. {restaurant["name"]}'
                )
                print(
                    f'      주소: {restaurant["address"]}'
                )

        else:
            print(f"   {city}: 데이터 없음")

     # 6. 최종 리포트 생성
    print("[3/3] 최종 리포트 생성 중(LLM)...")

    try:
        final_report = generate_final_report(
            args.date,
            recommendation,
            restaurants,
            errors,
            gemini_api_key
        )

    except Exception as error:
        print(f"오류: 최종 리포트 생성에 실패했습니다: {error}")
        return

    print(" - 최종 리포트 생성 완료")
    print()
    print(final_report)

    # 7. 결과 저장
    raw_file_path, report_file_path = save_results(
        args.date,
        recommendation,
        restaurants,
        final_report,
        errors
    )

    print()
    print("결과 저장 완료")
    print(f" - 원본 JSON: {raw_file_path}")
    print(f" - 최종 리포트: {report_file_path}")

if __name__ == "__main__":
    main()