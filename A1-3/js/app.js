import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler

from google import genai
from google.genai import errors, types


MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
MAX_BODY_BYTES = 100_000
MAX_AI_ATTEMPTS = 3

CONCERN_LABELS = {
    "none": "특별한 고민 없음",
    "weight": "체중 관리",
    "palatability": "기호성",
    "digestion": "소화",
    "senior": "시니어 사료 선택",
}

SPECIES_LABELS = {"dog": "강아지", "cat": "고양이"}
CHOICE_KEYS = ("A", "B", "C")

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "recommended_choice": {
            "type": "string",
            "description": "현재 조건에서 먼저 비교할 후보의 선택키(A/B/C)",
        },
        "verdict_title": {
            "type": "string",
            "description": "추천 결론을 12자 내외의 한국어 제목으로 요약",
        },
        "verdict": {
            "type": "string",
            "description": "현재 조건과 가장 중요한 차이를 연결한 1~2문장 결론",
        },
        "nutrition_analysis": {
            "type": "string",
            "description": "열량·단백질·지방·섬유·수분 중 실제 공개된 영양정보를 비교한 설명",
        },
        "manufacturer_analysis": {
            "type": "string",
            "description": "제조사 강조 키워드가 현재 관심사와 어떻게 연결되는지 설명",
        },
        "review_analysis": {
            "type": "string",
            "description": "구매후기 긍정/호불호 키워드를 함께 사용해 실제 반응 패턴을 설명",
        },
        "alternative_choice": {
            "type": "string",
            "description": "다른 상황에서 함께 고려할 후보의 선택키(A/B/C). 없으면 빈 문자열",
        },
        "alternative_tradeoff": {
            "type": "string",
            "description": "추천 후보와 다른 장점 때문에 대안이 더 맞을 수 있는 조건을 1~2문장으로 설명",
        },
        "check_point": {
            "type": "string",
            "description": "선택 전에 실제로 한 가지만 확인할 점. 앞선 설명과 중복하지 않음",
        },
    },
    "required": [
        "recommended_choice",
        "verdict_title",
        "verdict",
        "nutrition_analysis",
        "manufacturer_analysis",
        "review_analysis",
        "alternative_choice",
        "alternative_tradeoff",
        "check_point",
    ],
}


def _clean_text(value, max_length=500):
    return str(value or "").strip()[:max_length]


def _clean_number(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clean_product(product):
    if not isinstance(product, dict):
        raise ValueError("제품 정보 형식이 올바르지 않습니다.")

    nutrients = product.get("nutrients") or {}
    energy = product.get("energy") or {}
    manufacturer = product.get("manufacturer_evidence") or {}
    review = product.get("review_evidence") or {}

    clean_nutrients = {}
    for key in ("protein_pct", "fat_pct", "fiber_pct", "moisture_pct"):
        item = nutrients.get(key) or {}
        clean_nutrients[key] = {
            "value": _clean_number(item.get("value")),
            "qualifier": _clean_text(item.get("qualifier"), 40),
        }

    return {
        "product_id": _clean_text(product.get("product_id"), 40),
        "brand_ko": _clean_text(product.get("brand_ko"), 100),
        "brand": _clean_text(product.get("brand"), 100),
        "product_name_ko": _clean_text(product.get("product_name_ko"), 180),
        "product_name": _clean_text(product.get("product_name"), 180),
        "display_brand": _clean_text(product.get("display_brand"), 180),
        "display_name": _clean_text(product.get("display_name"), 260),
        "category": _clean_text(product.get("category"), 60),
        "life_stage": _clean_text(product.get("life_stage"), 80),
        "target_age": _clean_text(product.get("target_age"), 80),
        "nutrition_basis": _clean_text(product.get("nutrition_basis"), 80),
        "nutrients": clean_nutrients,
        "energy": {
            "kcal_kg": _clean_number(energy.get("kcal_kg")),
            "source_status": _clean_text(energy.get("source_status"), 80),
        },
        "manufacturer_keywords": [
            _clean_text(item, 80)
            for item in (manufacturer.get("keywords_ko") or [])[:8]
            if _clean_text(item, 80)
        ],
        "review_positive_keywords": [
            _clean_text(item, 80)
            for item in (review.get("positive_keywords") or [])[:8]
            if _clean_text(item, 80)
        ],
        "review_mixed_keywords": [
            _clean_text(item, 80)
            for item in (review.get("mixed_keywords") or [])[:8]
            if _clean_text(item, 80)
        ],
        "review_confidence": _clean_text(review.get("confidence"), 30),
    }


def _validate_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("요청 형식이 올바르지 않습니다.")

    species = _clean_text(payload.get("species"), 10)
    if species not in SPECIES_LABELS:
        raise ValueError("반려동물 종류를 확인해주세요.")

    age = _clean_number(payload.get("age"))
    if age is None or age < 0 or age > 30:
        raise ValueError("나이는 0~30 사이로 입력해주세요.")

    concern = _clean_text(payload.get("concern"), 30)
    if concern not in CONCERN_LABELS:
        raise ValueError("관심사항을 확인해주세요.")

    raw_products = payload.get("products")
    if not isinstance(raw_products, list) or not 2 <= len(raw_products) <= 3:
        raise ValueError("비교할 사료를 2~3개 선택해주세요.")

    products = [_clean_product(product) for product in raw_products]
    ids = [product["product_id"] for product in products]
    if any(not product_id for product_id in ids) or len(set(ids)) != len(ids):
        raise ValueError("제품 선택 정보를 다시 확인해주세요.")

    return {
        "species": species,
        "age": age,
        "concern": concern,
        "concern_label": CONCERN_LABELS[concern],
        "products": products,
    }


def _qualifier_label(value):
    return {
        "min": "최소",
        "max": "최대",
        "average": "평균",
        "average_dry_matter": "건물 기준 평균",
    }.get(value, value or "")


def _prompt_product(product, choice_key):
    nutrients = product["nutrients"]

    def nutrient(label, key):
        item = nutrients[key]
        return {
            "항목": label,
            "값_퍼센트": item["value"],
            "표기방식": _qualifier_label(item["qualifier"]),
        }

    return {
        "선택키": choice_key,
        "브랜드": product["display_brand"],
        "제품명": product["display_name"],
        "대상연령": product["target_age"] or product["life_stage"],
        "영양표기기준": product["nutrition_basis"],
        "열량_kcal_per_kg": product["energy"]["kcal_kg"],
        "영양성분": [
            nutrient("단백질", "protein_pct"),
            nutrient("지방", "fat_pct"),
            nutrient("섬유", "fiber_pct"),
            nutrient("수분", "moisture_pct"),
        ],
        "제조사강조키워드": product["manufacturer_keywords"],
        "구매후기_긍정키워드": product["review_positive_keywords"],
        "구매후기_호불호키워드": product["review_mixed_keywords"],
        "후기근거신뢰도": product["review_confidence"],
    }


def _build_prompt(data):
    prompt_data = {
        "반려동물": SPECIES_LABELS[data["species"]],
        "나이": data["age"],
        "가장_신경쓰이는_부분": data["concern_label"],
        "비교제품": [
            _prompt_product(product, CHOICE_KEYS[index])
            for index, product in enumerate(data["products"])
        ],
    }

    rules = """
당신은 반려동물 사료의 공개 제품정보와 구매후기 요약을 이용해 '왜 이 후보가 현재 조건에 더 맞는지'를 설명하는 비교 도우미입니다.
아래 JSON에 있는 정보만 사용하고, 누락된 성분이나 효능을 추측하지 마세요.

가장 중요한 작성 규칙:
1. 모든 설명 문장은 자연스러운 한국어로 작성합니다. 공식 영문 제품명 외에는 외국어를 섞지 않습니다.
2. 선택키 A/B/C는 시스템 제어용입니다. verdict_title, verdict, nutrition_analysis, manufacturer_analysis, review_analysis, alternative_tradeoff, check_point 문장 안에는 절대 선택키나 카탈로그 내부 코드/ID를 쓰지 않습니다.
3. kcal_kg, protein_pct, moisture_pct 같은 내부 필드명도 문장에 쓰지 말고 반드시 '열량', '단백질', '수분'처럼 사용자 표현으로 바꿉니다.
4. '최고', '무조건', '먹이면 살이 빠진다'처럼 단정하지 않습니다. 질병 진단·치료·처방·급여량 변경도 권하지 않습니다.
5. 영양표기 기준이 다른 제품끼리는 단백질·지방·섬유 수치를 직접 우열 비교하지 않습니다. 비교 가능한 숫자만 사용합니다.
6. 제조사 키워드는 반드시 '제조사는 ~을 강조한다'는 맥락으로 쓰고, 검증된 효능처럼 표현하지 않습니다.
7. 구매후기 키워드는 반드시 '구매후기에서는 ~ 반응이 있었고, 한편 ~ 의견도 있었다'처럼 실제 후기 패턴으로 풀어 씁니다. 긍정/호불호 키워드가 모두 있으면 각각 최소 하나씩 사용하세요.
8. 현재 관심사와 연결되는 제조사 키워드가 있으면 manufacturer_analysis에서 최소 하나를 반드시 사용합니다.
9. 각 섹션 역할을 겹치지 않게 작성합니다.
   - verdict: 왜 이 제품을 먼저 볼지 한눈에 이해되는 결론. 가장 강한 차이 1~2개만.
   - nutrition_analysis: 숫자로 확인 가능한 영양·열량 정보만 비교. 제조사/후기 내용은 넣지 않음.
   - manufacturer_analysis: 제조사가 어떤 점을 강조하는지와 현재 관심사의 연결만 설명.
   - review_analysis: 실제 구매후기의 긍정 반응과 호불호/주의 반응을 함께 설명. 영양수치 반복 금지.
   - alternative_tradeoff: 추천 제품을 반복 칭찬하지 말고, 다른 후보가 어떤 상황에서 더 나을 수 있는지 '트레이드오프'를 설명.
   - check_point: 앞 내용을 반복하지 말고, 구매 전 실제 확인할 한 가지(미공시 정보, 알갱이 크기/기호성 개인차, 표기기준 등)만 제시.
10. 제품이 2개면 두 제품을 실제로 비교하고, 3개면 1순위와 가장 의미 있는 대안 1개를 중심으로 비교합니다.
11. 추천은 항상 '현재 입력 조건에서 상대적으로 먼저 비교해볼 후보'라는 의미이며 의료적 결론이 아닙니다.
""".strip()

    return f"{rules}\n\n비교 입력 JSON:\n{json.dumps(prompt_data, ensure_ascii=False)}"


def _product_label(product):
    return product["product_name_ko"] or product["display_name"] or product["product_name"]


def _product_name_en(product):
    return product["product_name"] or ""


def _replace_internal_tokens(text, products):
    value = _clean_text(text, 900)
    for product in products:
        product_id = product.get("product_id") or ""
        if product_id:
            value = re.sub(
                rf"(?<![A-Za-z0-9]){re.escape(product_id)}(?![A-Za-z0-9])",
                _product_label(product),
                value,
                flags=re.IGNORECASE,
            )
    field_labels = {
        "protein_pct": "단백질",
        "fat_pct": "지방",
        "fiber_pct": "섬유",
        "moisture_pct": "수분",
        "kcal_kg": "열량",
    }
    for raw_name, label in field_labels.items():
        value = re.sub(rf"\b{raw_name}\b", label, value, flags=re.IGNORECASE)
    return value.strip()


def _validate_ai_result(result, products):
    if not isinstance(result, dict):
        raise ValueError("AI 응답 형식이 올바르지 않습니다.")

    choice_map = {
        CHOICE_KEYS[index]: product for index, product in enumerate(products)
    }
    recommended_choice = _clean_text(result.get("recommended_choice"), 5).upper()
    alternative_choice = _clean_text(result.get("alternative_choice"), 5).upper()

    if recommended_choice not in choice_map:
        raise ValueError("AI가 선택하지 않은 제품을 반환했습니다.")
    if alternative_choice not in choice_map or alternative_choice == recommended_choice:
        alternative_choice = ""

    fields = {
        key: _replace_internal_tokens(result.get(key), products)
        for key in (
            "verdict_title",
            "verdict",
            "nutrition_analysis",
            "manufacturer_analysis",
            "review_analysis",
            "alternative_tradeoff",
            "check_point",
        )
    }

    if not all(fields[key] for key in ("verdict", "nutrition_analysis", "manufacturer_analysis", "review_analysis", "check_point")):
        raise ValueError("AI 비교 근거가 충분하지 않습니다.")

    recommended = choice_map[recommended_choice]
    alternative = choice_map.get(alternative_choice)

    return {
        "recommended_product_id": recommended["product_id"],
        "recommended_product_name": _product_label(recommended),
        "recommended_product_name_en": _product_name_en(recommended),
        "verdict_title": fields["verdict_title"] or "현재 조건의 우선 후보",
        "verdict": fields["verdict"],
        "nutrition_analysis": fields["nutrition_analysis"],
        "manufacturer_analysis": fields["manufacturer_analysis"],
        "review_analysis": fields["review_analysis"],
        "alternative_product_id": alternative["product_id"] if alternative else "",
        "alternative_product_name": _product_label(alternative) if alternative else "",
        "alternative_product_name_en": _product_name_en(alternative) if alternative else "",
        "alternative_tradeoff": fields["alternative_tradeoff"] if alternative else "",
        "check_point": fields["check_point"],
        "disclaimer": "이 결과는 등록된 제품정보·제조사 강조점·구매후기 요약을 함께 비교한 참고 자료이며, 진단이나 처방을 대신하지 않습니다.",
        "model": MODEL_NAME,
    }


def _generate_with_retry(client, data):
    last_error = None
    for attempt in range(MAX_AI_ATTEMPTS):
        try:
            return client.models.generate_content(
                model=MODEL_NAME,
                contents=_build_prompt(data),
                config=types.GenerateContentConfig(
                    max_output_tokens=1300,
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    response_mime_type="application/json",
                    response_json_schema=RESPONSE_SCHEMA,
                ),
            )
        except errors.APIError as exc:
            last_error = exc
            code = getattr(exc, "code", None)
            if code not in (500, 502, 503, 504) or attempt == MAX_AI_ATTEMPTS - 1:
                raise
            time.sleep(0.7 * (2**attempt))
    raise last_error


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send_json(
            200,
            {
                "ok": True,
                "service": "pet-food-match-ai",
                "model": MODEL_NAME,
                "api_key_configured": bool(os.environ.get("GEMINI_API_KEY")),
            },
        )

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > MAX_BODY_BYTES:
                self._send_json(413, {"error": "요청 데이터 크기를 확인해주세요."})
                return

            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            data = _validate_request(payload)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self._send_json(400, {"error": str(exc)})
            return

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            self._send_json(503, {"error": "AI 서비스 환경변수가 설정되지 않았습니다."})
            return

        try:
            client = genai.Client(api_key=api_key)
            response = _generate_with_retry(client, data)
            raw_result = json.loads(response.text)
            result = _validate_ai_result(raw_result, data["products"])
            self._send_json(200, {"ok": True, "result": result})
        except errors.APIError as exc:
            code = getattr(exc, "code", None)
            if code == 429:
                status = 429
                error_code = "AI_RATE_LIMIT"
                message = "AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요."
            elif code in (401, 403):
                status = 502
                error_code = "AI_AUTH"
                message = "AI API 키의 인증 또는 권한을 확인해주세요."
            elif code == 400:
                status = 502
                error_code = "AI_BAD_REQUEST"
                message = "AI 요청 설정을 처리하지 못했습니다. 모델 설정을 확인해주세요."
            else:
                status = 502
                error_code = "AI_UPSTREAM"
                message = "AI 서비스 호출에 실패했습니다. 잠시 후 다시 시도해주세요."
            print(f"Gemini API error: code={code}")
            self._send_json(
                status,
                {"error": message, "error_code": error_code, "model": MODEL_NAME},
            )
        except (ValueError, TypeError, json.JSONDecodeError):
            self._send_json(
                502,
                {"error": "AI 응답을 처리하지 못했습니다. 다시 시도해주세요."},
            )
        except Exception as exc:
            print(f"Server error: {type(exc).__name__}")
            self._send_json(
                500,
                {"error": "서버에서 요청을 처리하지 못했습니다."},
            )
