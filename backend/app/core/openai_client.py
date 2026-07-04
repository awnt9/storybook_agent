from __future__ import annotations

from openai import AsyncOpenAI


def create_llm_client(
    api_key: str,
    base_url: str | None = None,
) -> AsyncOpenAI:
    if base_url:
        return AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )

    return AsyncOpenAI(api_key=api_key)
