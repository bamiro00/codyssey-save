import json
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore


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
    elif firebase_key_path:
        cred = credentials.Certificate(firebase_key_path)
    else:
        raise ValueError(
            "FIREBASE_SERVICE_ACCOUNT_JSON 또는 "
            "FIREBASE_SERVICE_ACCOUNT_PATH 환경 변수가 필요합니다."
        )

    firebase_admin.initialize_app(cred)

db = firestore.client()
