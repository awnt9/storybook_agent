from __future__ import annotations

from app.repositories.draft_repository import DraftRepository
from app.schemas.story_elements import Image, StoryState


class DraftImageStore:
    def __init__(
        self,
        repository: DraftRepository,
        *,
        user_id: int,
        draft_id: str,
    ) -> None:
        self._repository = repository
        self._user_id = user_id
        self._draft_id = draft_id

    def save(
        self,
        photo_bytes: bytes,
        *,
        prompt: str | None = None,
    ) -> Image:
        return self._repository.store_image(
            self._user_id,
            self._draft_id,
            photo_bytes,
            prompt=prompt,
        )


class DraftStoryStateStore:
    def __init__(
        self,
        repository: DraftRepository,
        *,
        user_id: int,
        draft_id: str,
    ) -> None:
        self._repository = repository
        self._user_id = user_id
        self._draft_id = draft_id

    def patch_image_description(
        self,
        state: StoryState,
        image: Image,
    ) -> StoryState:
        return self._repository.patch_image_description(
            self._user_id,
            self._draft_id,
            state,
            image,
        )
