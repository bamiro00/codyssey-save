import json
import os
from http.server import BaseHTTPRequestHandler

from google import genai
from google.genai import errors, types


MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
MAX_BODY_BYTES = 100_000

CONCERN_LABELS = {
    "none": "특별한 고민 없음",
    "weight": "체중 관리",
    "palatability": "기호성",
    "digestion": "소화",
    "senior": "시니어 사료 선택",
}

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "recommended_product_id": {
            "type": "string",
            "description": "현재 조건에서 상대적으로 먼저 비교해볼 제품의 product_id",
        },
        "summary": {
            "type": "string",
            "description": "단정하지 않는 한국어 추천 요약",
        },
        "reasons": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 4,
            "description": "제공된 데이터에서 확인 가능한 추천 근거",
        },
        "alternative_product_id": {
            "type": "string",
            "description": "함께 고려할 제품의 product_id. 없으면 빈 문자열",
        },
        "alternative_reason": {
            "type": "string",
            "description": "대안 제품을 함께 고려할 이유. 없으면 빈 문자열",
        },
        "cautions": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 3,
            "description": "표시 기준 차이, 미공시 정보, 개인차 등 확인할 점",
        },
    },
    "required": [
        "recommended_product_id",
        "summary",
        "reasons",
        "alternative_product_id",
        "alternative_reason",
        "cautions",
    ],
}


def _clean_text(value, max_length=300):
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
        "display_brand": _clean_text(product.get("display_brand"), 120),
        "display_name": _clean_text(product.get("display_name"), 180),
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
        ],
        "review_positive_keywords": [
            _clean_text(item, 80)
            for item in (review.get("positive_keywords") or [])[:8]
        ],
        "review_mixed_keywords": [
            _clean_text(item, 80)
            for item in (review.get("mixed_keywords") or [])[:8]
        ],
        "review_confidence": _clean_text(review.get("confidence"), 30),
    }


def _validate_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("요청 형식이 올바르지 않습니다.")

    species = _clean_text(payload.get("species"), 10)
    if species not in ("dog", "cat"):
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


def _build_prompt(data):
    rules = """
당신은 반려동물 사료의 공개 제품정보를 이해하기 쉽게 정리하는 비교 설명 도우미입니다.
아래 JSON 데이터에 있는 정보만 사용하세요. 인터넷 지식이나 누락된 성분을 추측하지 마세요.

반드시 지킬 규칙:
1. '최고', '무조건', '먹이면 살이 빠진다'처럼 단정하지 않습니다.
2. 질병 진단, 치료 효과, 처방 또는 급여량 변경을 권하지 않습니다.
3. nutrition_basis가 다른 제품의 단백질·지방·섬유 수치를 단순 우열로 비교하지 않습니다.
4. kcal/kg가 null이면 열량을 추정하지 않습니다.
5. 제조사 키워드는 제조사의 강조점으로만, 구매후기 키워드는 개인 경험으로만 설명합니다.
6. 현재 입력 조건에서 '상대적으로 먼저 비교해볼 후보'라는 표현을 사용합니다.
7. recommended_product_id와 alternative_product_id는 입력 JSON에 실제 존재하는 product_id만 사용합니다.
8. 한국어로 짧고 친절하게 작성합니다.
""".strip()
    return f"{rules}\n\n비교 입력 JSON:\n{json.dumps(data, ensure_ascii=False)}"


def _validate_ai_result(result, products):
    if not isinstance(result, dict):
        raise ValueError("AI 응답 형식이 올바르지 않습니다.")

    product_map = {product["product_id"]: product for product in products}
    recommended_id = _clean_text(result.get("recommended_product_id"), 40)
    alternative_id = _clean_text(result.get("alternative_product_id"), 40)

    if recommended_id not in product_map:
        raise ValueError("AI가 선택하지 않은 제품을 반환했습니다.")
    if alternative_id and alternative_id not in product_map:
        alternative_id = ""
    if alternative_id == recommended_id:
        alternative_id = ""

    reasons = [
        _clean_text(item, 240)
        for item in result.get("reasons", [])
        if _clean_text(item, 240)
    ][:4]
    cautions = [
        _clean_text(item, 240)
        for item in result.get("cautions", [])
        if _clean_text(item, 240)
    ][:3]
    summary = _clean_text(result.get("summary"), 500)
    if not summary or len(reasons) < 2 or not cautions:
        raise ValueError("AI 비교 근거가 충분하지 않습니다.")

    return {
        "recommended_product_id": recommended_id,
        "recommended_product_name": product_map[recommended_id]["display_name"],
        "summary": summary,
        "reasons": reasons,
        "alternative_product_id": alternative_id,
        "alternative_product_name": (
            product_map[alternative_id]["display_name"] if alternative_id else ""
        ),
        "alternative_reason": _clean_text(result.get("alternative_reason"), 300),
        "cautions": cautions,
        "disclaimer": "이 결과는 등록된 제품정보를 비교한 참고 자료이며, 진단이나 처방을 대신하지 않습니다.",
        "model": MODEL_NAME,
    }


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
        self._send_json(200, {"ok": True, "service": "pet-food-match-ai"})

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
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=_build_prompt(data),
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=900,
                    response_mime_type="application/json",
                    response_json_schema=RESPONSE_SCHEMA,
                ),
            )
            raw_result = json.loads(response.text)
            result = _validate_ai_result(raw_result, data["products"])
            self._send_json(200, {"ok": True, "result": result})
        except errors.APIError as exc:
            status = 429 if getattr(exc, "code", None) == 429 else 502
            self._send_json(
                status,
                {"error": "AI 서비스 호출에 실패했습니다. 잠시 후 다시 시도해주세요."},
            )
        except (ValueError, TypeError, json.JSONDecodeError):
            self._send_json(
                502,
                {"error": "AI 응답을 처리하지 못했습니다. 다시 시도해주세요."},
            )
        except Exception:
            self._send_json(
                500,
                {"error": "서버에서 요청을 처리하지 못했습니다."},
            )
