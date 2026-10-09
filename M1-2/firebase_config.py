import json
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore


render_secret_env_path = "/etc/secrets/.env"
render_firebase_key_path = "/etc/secrets/firebase-key.json"

if os.path.exists(render_secret_env_path):
    load_dotenv(render_secret_env_path)
else:
    load_dotenv()

if not firebase_admin._apps:
    firebase_service_account_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
    firebase_key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

    if firebase_service_account_json:
        try:
            service_account_info = json.loads(
                firebase_service_account_json
            )
        except json.JSONDecodeError as error:
            raise ValueError(
                "FIREBASE_SERVICE_ACCOUNT_JSON 형식이 올바르지 않습니다."
            ) from error

        cred = credentials.Certificate(service_account_info)
    elif firebase_key_path and os.path.exists(firebase_key_path):
        cred = credentials.Certificate(firebase_key_path)
    elif os.path.exists(render_firebase_key_path):
        cred = credentials.Certificate(render_firebase_key_path)
    else:
        raise ValueError(
            "FIREBASE_SERVICE_ACCOUNT_JSON 또는 "
            "FIREBASE_SERVICE_ACCOUNT_PATH 환경 변수가 필요합니다."
        )

    firebase_admin.initialize_app(cred)

db = firestore.client()
