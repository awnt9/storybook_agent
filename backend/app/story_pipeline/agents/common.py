from __future__ import annotations

from openai import AsyncOpenAI
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.core.config import settings


def planner_model_name() -> str:
    model = settings.bg_model
    if ":" in model:
        return model.split(":", 1)[1]
    return model


def chat_model(openai_client: AsyncOpenAI) -> OpenAIChatModel:
    return OpenAIChatModel(
        planner_model_name(),
        provider=OpenAIProvider(openai_client=openai_client),
    )
