from openai import OpenAI


def create_llm_client(
    api_key: str,
    base_url: str | None = None,
) -> OpenAI:
    if base_url:
        return OpenAI(
            api_key=api_key,
            base_url=base_url,
        )

    return OpenAI(api_key=api_key)
