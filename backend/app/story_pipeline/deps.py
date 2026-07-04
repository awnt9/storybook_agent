from __future__ import annotations

from dataclasses import dataclass

from openai import AsyncOpenAI

from app.schemas.story_elements import StoryState, UserAction
from app.story_pipeline.ports import ImageStore


@dataclass
class StoryRunDeps:
    user_id: int
    history_id: str
    action: UserAction
    story_state: StoryState
    openai_client: AsyncOpenAI
    image_store: ImageStore
