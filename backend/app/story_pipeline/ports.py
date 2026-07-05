from __future__ import annotations

from typing import Protocol

from app.schemas.story_elements import Image, StoryState


class ImageStore(Protocol):
    def save(
        self,
        photo_bytes: bytes,
        *,
        prompt: str | None = None,
    ) -> Image: ...


class StoryStateStore(Protocol):
    def patch_image_description(
        self,
        state: StoryState,
        image: Image,
    ) -> StoryState: ...
