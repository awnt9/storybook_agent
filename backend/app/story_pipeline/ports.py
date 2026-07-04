from __future__ import annotations

from typing import Protocol

from app.schemas.story_elements import Image


class ImageStore(Protocol):
    def save(
        self,
        photo_bytes: bytes,
        *,
        prompt: str | None = None,
    ) -> Image: ...
