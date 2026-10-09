import os

from dotenv import load_dotenv
from openai import OpenAI


render_secret_env_path = "/etc/secrets/.env"

if os.path.exists(render_secret_env_path):
    load_dotenv(render_secret_env_path)
else:
    load_dotenv()

OPENAI_BASE_URL = os.getenv(
    "OPENAI_BASE_URL",
    "https://copa.codyssey.kr/v1"
)
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY가 설정되지 않았습니다. "
            ".env 파일에 키를 추가해 주세요."
        )

    return OpenAI(
        api_key=api_key,
        base_url=OPENAI_BASE_URL
    )
