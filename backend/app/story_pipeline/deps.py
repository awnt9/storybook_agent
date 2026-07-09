from __future__ import annotations

from dataclasses import dataclass

from openai import AsyncOpenAI

from app.schemas.story_elements import StoryState, UserAction
from app.story_pipeline.ports import ImageStore, StoryStateStore


@dataclass
class StoryRunDeps:
    user_id: int
    history_id: str
    action: UserAction
    story_state: StoryState
    openai_client: AsyncOpenAI
    image_store: ImageStore
    state_store: StoryStateStore
    story_title: str | None = None
    uploaded_image_bytes: bytes | None = None
    uploaded_image_content_type: str | None = None
