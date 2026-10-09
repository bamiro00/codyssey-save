from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    RateLimitError,
)

from openai_config import OPENAI_MODEL, get_openai_client


def main() -> None:
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "K-뷰티 수출 데이터를 분석하는 AI 서비스입니다. "
                        "연결 테스트 성공이라고 짧게 답해 주세요."
                    ),
                }
            ],
            max_tokens=500,
        )
        answer = response.choices[0].message.content

        if not answer:
            print("응답 오류: 모델이 빈 답변을 반환했습니다.")
            raise SystemExit(1)

        print(answer)
    except RuntimeError as error:
        print(f"설정 오류: {error}")
        raise SystemExit(1)
    except AuthenticationError:
        print("인증 오류: OPENAI_API_KEY가 올바른지 확인해 주세요.")
        raise SystemExit(1)
    except RateLimitError:
        print("사용 한도 오류: OpenAI API 사용 한도와 결제 설정을 확인해 주세요.")
        raise SystemExit(1)
    except APIConnectionError:
        print("연결 오류: 인터넷 연결 또는 OpenAI API 연결 상태를 확인해 주세요.")
        raise SystemExit(1)
    except APIStatusError as error:
        print(f"OpenAI API 오류: 상태 코드 {error.status_code}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
