from __future__ import annotations

from app.repositories.agent_repository import AgentRepository
from app.schemas.story_elements import Image, StoryState


class RepositoryImageStore:
    def __init__(
        self,
        repository: AgentRepository,
        *,
        user_id: int,
        history_id: str,
    ) -> None:
        self._repository = repository
        self._user_id = user_id
        self._history_id = history_id

    def save(
        self,
        photo_bytes: bytes,
        *,
        prompt: str | None = None,
    ) -> Image:
        return self._repository.store_image(
            self._user_id,
            self._history_id,
            photo_bytes,
            prompt=prompt,
        )


class RepositoryStoryStateStore:
    def __init__(
        self,
        repository: AgentRepository,
        *,
        user_id: int,
        history_id: str,
    ) -> None:
        self._repository = repository
        self._user_id = user_id
        self._history_id = history_id

    def patch_image_description(
        self,
        state: StoryState,
        image: Image,
    ) -> StoryState:
        return self._repository.patch_image_description(
            self._user_id,
            self._history_id,
            state,
            image,
        )
