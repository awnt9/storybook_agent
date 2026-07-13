from __future__ import annotations

import json
import mimetypes
from datetime import UTC, datetime
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, status
from minio.commonconfig import CopySource
from redis import Redis
from sqlmodel import Session

from app.core.config import settings
from app.core.minio import get_minio_client
from app.repositories.agent_repository import AgentRepository
from app.schemas.story_elements import Image, Scene, StoryState, UserAction


class DraftRepository:
    GENERATION_LOCK_TTL_SECONDS = 300

    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client
        self.minio = get_minio_client()
        self.bucket = settings.minio_bucket
        self.ttl_seconds = settings.draft_ttl_seconds

    def create_draft(self, user_id: int, *, title: str | None = None) -> str:
        draft_id = str(uuid4())
        state = StoryState(story_id=draft_id)
        self._save_state(user_id, draft_id, state)
        self._save_meta(
            user_id,
            draft_id,
            {
                "title": title,
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
            },
        )
        self._refresh_ttl(user_id, draft_id)
        return draft_id

    def get_draft(
        self,
        user_id: int,
        draft_id: str,
    ) -> tuple[StoryState, str | None]:
        self._ensure_owned_draft(user_id, draft_id)
        state = self.load_story_state(user_id, draft_id)
        meta = self._load_meta(user_id, draft_id)
        return state, meta.get("title")

    def load_story_state(self, user_id: int, draft_id: str) -> StoryState:
        self._ensure_owned_draft(user_id, draft_id)
        raw_state = self.redis.get(self._state_key(user_id, draft_id))
        if raw_state is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found",
            )

        state = StoryState.model_validate_json(raw_state)
        state.story_id = draft_id
        return self._resolve_state_images(state, draft_id)

    def get_draft_title(self, user_id: int, draft_id: str) -> str | None:
        self._ensure_owned_draft(user_id, draft_id)
        meta = self._load_meta(user_id, draft_id)
        return meta.get("title")

    def save_story_state(
        self,
        user_id: int,
        draft_id: str,
        state: StoryState,
    ) -> StoryState:
        self._ensure_owned_draft(user_id, draft_id)
        persisted = self._strip_image_urls(state)
        persisted.story_id = draft_id
        self.redis.set(
            self._state_key(user_id, draft_id),
            persisted.model_dump_json(),
        )
        self._touch_meta(user_id, draft_id)
        self._refresh_ttl(user_id, draft_id)
        return self.load_story_state(user_id, draft_id)

    def store_image(
        self,
        user_id: int,
        draft_id: str,
        photo_bytes: bytes,
        *,
        content_type: str | None = None,
        prompt: str | None = None,
        description: str | None = None,
    ) -> Image:
        self._ensure_owned_draft(user_id, draft_id)

        extension = self._extension_from_content_type(content_type, photo_bytes)
        image_id = f"img_{uuid4().hex}"
        object_name = self._draft_object_name(user_id, draft_id, image_id, extension)

        self.minio.put_object(
            self.bucket,
            object_name,
            BytesIO(photo_bytes),
            length=len(photo_bytes),
            content_type=content_type
            or mimetypes.guess_type(object_name)[0]
            or "application/octet-stream",
        )

        return Image(
            image_id=image_id,
            path=object_name,
            url=self.build_image_url(draft_id, image_id),
            prompt=prompt,
            description=description,
        )

    def read_image_bytes(self, image: Image) -> bytes:
        if not image.path:
            raise ValueError("Image path is required to read from MinIO")

        response = self.minio.get_object(self.bucket, image.path)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    @staticmethod
    def build_image_url(draft_id: str, image_id: str) -> str:
        return f"/api/v1/drafts/{draft_id}/images/{image_id}"

    def build_user_action(
        self,
        *,
        user_id: int,
        draft_id: str,
        action_payload: UserAction,
        image_bytes: bytes | None,
        image_content_type: str | None,
    ) -> UserAction:
        action = action_payload.model_copy(deep=True)
        clean_text = action.text.strip() if action.text else None
        action.text = clean_text

        if image_bytes:
            prompt = clean_text or "User uploaded image"
            if action.action_type == "cover_setup":
                prompt = clean_text or "Reference character photo"
            action.image = self.store_image(
                user_id,
                draft_id,
                image_bytes,
                content_type=image_content_type,
                prompt=prompt,
            )

        if action.action_type in {None, "advance"} and not clean_text and action.image is None:
            action.action_type = "advance"
            return action

        if action.action_type == "advance":
            return action

        if not action.action_type:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="action_type is required",
            )

        if action.action_type in {
            "text_input",
            "single_choice",
            "yes_no",
            "image_input",
        } and not action.component_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="component_id is required for component actions",
            )

        if action.action_type == "image_input" and action.image is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="An image is required for image_input actions",
            )

        if action.action_type in {"text_input", "single_choice", "yes_no"} and not clean_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="text is required for this action type",
            )

        if action.action_type == "cover_setup":
            return action

        return action

    def record_user_action(
        self,
        user_id: int,
        draft_id: str,
        state: StoryState,
        action: UserAction,
        *,
        title: str | None = None,
    ) -> StoryState:
        if action.component_id:
            for scene in reversed(state.history):
                component = scene.interaction_component
                if component is None or component.id != action.component_id:
                    continue

                updated_component = component.model_copy(
                    update={
                        "response_text": action.text,
                        "response_image": action.image,
                    }
                )
                scene.interaction_component = updated_component
                break

        if action.action_type == "cover_setup" and action.image is not None:
            scene = state.current_scene or Scene()
            scene.images = (
                [*scene.images, action.image]
                if isinstance(scene.images, list)
                else [scene.images, action.image]
                if scene.images
                else [action.image]
            )
            state.current_scene = scene

        if title:
            self._update_title(user_id, draft_id, title)

        return self.save_story_state(user_id, draft_id, state)

    def apply_scene_output(
        self,
        user_id: int,
        draft_id: str,
        state: StoryState,
        scene: Scene,
    ) -> StoryState:
        state.history = [*state.history, scene]
        state.current_scene = scene
        return self.save_story_state(user_id, draft_id, state)

    def patch_image_description(
        self,
        user_id: int,
        draft_id: str,
        state: StoryState,
        image: Image,
    ) -> StoryState:
        if image.image_id is None or state.current_scene is None:
            return state

        scene = state.current_scene.model_copy(deep=True)
        images = scene.images

        if isinstance(images, list):
            scene.images = [
                image if item.image_id == image.image_id else item
                for item in images
            ]
        elif images is not None and images.image_id == image.image_id:
            scene.images = image

        state.current_scene = scene
        return self.save_story_state(user_id, draft_id, state)

    def get_image_for_draft(
        self,
        user_id: int,
        draft_id: str,
        image_id: str,
    ) -> tuple[Image, bytes]:
        state = self.load_story_state(user_id, draft_id)
        image = self._find_image(state, image_id)

        if image is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found",
            )

        return image, self.read_image_bytes(image)

    def acquire_generation_lock(self, user_id: int, draft_id: str) -> bool:
        key = self._lock_key(user_id, draft_id)
        return bool(
            self.redis.set(
                key,
                "1",
                nx=True,
                ex=self.GENERATION_LOCK_TTL_SECONDS,
            )
        )

    def release_generation_lock(self, user_id: int, draft_id: str) -> None:
        self.redis.delete(self._lock_key(user_id, draft_id))

    def delete_draft(self, user_id: int, draft_id: str) -> None:
        self._ensure_owned_draft(user_id, draft_id)
        prefix = self._draft_prefix(user_id, draft_id)
        for item in self.minio.list_objects(self.bucket, prefix=prefix, recursive=True):
            self.minio.remove_object(self.bucket, item.object_name)

        self.redis.delete(
            self._state_key(user_id, draft_id),
            self._meta_key(user_id, draft_id),
            self._lock_key(user_id, draft_id),
            self._owner_key(draft_id),
        )

    def commit_draft(
        self,
        db: Session,
        user_id: int,
        draft_id: str,
        *,
        title: str | None = None,
    ) -> str:
        state, draft_title = self.get_draft(user_id, draft_id)
        agent_repository = AgentRepository(db)
        resolved_title = title or draft_title
        history_id = agent_repository.create_history(user_id, title=resolved_title)

        promoted_state = self._promote_state_images(
            user_id=user_id,
            draft_id=draft_id,
            history_id=history_id,
            state=state,
            agent_repository=agent_repository,
        )
        agent_repository.save_story_state(user_id, history_id, promoted_state)
        self.delete_draft(user_id, draft_id)
        return history_id

    def _promote_state_images(
        self,
        *,
        user_id: int,
        draft_id: str,
        history_id: str,
        state: StoryState,
        agent_repository: AgentRepository,
    ) -> StoryState:
        promoted = state.model_copy(deep=True)
        promoted.story_id = history_id

        if promoted.current_scene is not None:
            promoted.current_scene = self._promote_scene_images(
                user_id=user_id,
                draft_id=draft_id,
                history_id=history_id,
                scene=promoted.current_scene,
                agent_repository=agent_repository,
            )

        promoted.history = [
            self._promote_scene_images(
                user_id=user_id,
                draft_id=draft_id,
                history_id=history_id,
                scene=scene,
                agent_repository=agent_repository,
            )
            for scene in promoted.history
        ]
        return promoted

    def _promote_scene_images(
        self,
        *,
        user_id: int,
        draft_id: str,
        history_id: str,
        scene: Scene,
        agent_repository: AgentRepository,
    ) -> Scene:
        promoted_scene = scene.model_copy(deep=True)

        if promoted_scene.background_image is not None:
            promoted_scene.background_image = self._promote_image(
                user_id=user_id,
                draft_id=draft_id,
                history_id=history_id,
                image=promoted_scene.background_image,
                agent_repository=agent_repository,
            )

        if isinstance(promoted_scene.images, list):
            promoted_scene.images = [
                self._promote_image(
                    user_id=user_id,
                    draft_id=draft_id,
                    history_id=history_id,
                    image=image,
                    agent_repository=agent_repository,
                )
                for image in promoted_scene.images
            ]
        elif promoted_scene.images is not None:
            promoted_scene.images = self._promote_image(
                user_id=user_id,
                draft_id=draft_id,
                history_id=history_id,
                image=promoted_scene.images,
                agent_repository=agent_repository,
            )

        if (
            promoted_scene.interaction_component is not None
            and promoted_scene.interaction_component.response_image is not None
        ):
            component = promoted_scene.interaction_component.model_copy(deep=True)
            component.response_image = self._promote_image(
                user_id=user_id,
                draft_id=draft_id,
                history_id=history_id,
                image=component.response_image,
                agent_repository=agent_repository,
            )
            promoted_scene.interaction_component = component

        return promoted_scene

    def _promote_image(
        self,
        *,
        user_id: int,
        draft_id: str,
        history_id: str,
        image: Image,
        agent_repository: AgentRepository,
    ) -> Image:
        if image.image_id is None or image.path is None:
            return image

        extension = image.path.rsplit(".", 1)[-1]
        destination = agent_repository._object_name(  # noqa: SLF001
            user_id,
            history_id,
            image.image_id,
            extension,
        )

        self.minio.copy_object(
            self.bucket,
            destination,
            CopySource(self.bucket, image.path),
        )

        promoted = image.model_copy()
        promoted.path = destination
        promoted.url = agent_repository.build_image_url(history_id, image.image_id)
        return promoted

    def _ensure_owned_draft(self, user_id: int, draft_id: str) -> None:
        owner = self.redis.get(self._owner_key(draft_id))
        if owner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found",
            )
        if int(owner) != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found",
            )

    def _save_state(
        self,
        user_id: int,
        draft_id: str,
        state: StoryState,
    ) -> None:
        persisted = self._strip_image_urls(state)
        persisted.story_id = draft_id
        self.redis.set(
            self._state_key(user_id, draft_id),
            persisted.model_dump_json(),
        )
        self.redis.set(self._owner_key(draft_id), str(user_id))

    def _save_meta(
        self,
        user_id: int,
        draft_id: str,
        meta: dict[str, str | None],
    ) -> None:
        self.redis.set(self._meta_key(user_id, draft_id), json.dumps(meta))

    def _load_meta(self, user_id: int, draft_id: str) -> dict[str, str | None]:
        raw_meta = self.redis.get(self._meta_key(user_id, draft_id))
        if raw_meta is None:
            return {}
        return json.loads(raw_meta)

    def _touch_meta(self, user_id: int, draft_id: str) -> None:
        meta = self._load_meta(user_id, draft_id)
        meta["updated_at"] = datetime.now(UTC).isoformat()
        self._save_meta(user_id, draft_id, meta)

    def _update_title(self, user_id: int, draft_id: str, title: str) -> None:
        meta = self._load_meta(user_id, draft_id)
        meta["title"] = title
        self._save_meta(user_id, draft_id, meta)

    def _refresh_ttl(self, user_id: int, draft_id: str) -> None:
        self.redis.expire(self._state_key(user_id, draft_id), self.ttl_seconds)
        self.redis.expire(self._meta_key(user_id, draft_id), self.ttl_seconds)
        self.redis.expire(self._owner_key(draft_id), self.ttl_seconds)

    def _resolve_state_images(self, state: StoryState, draft_id: str) -> StoryState:
        if state.current_scene is not None:
            state.current_scene = self._resolve_scene_images(
                state.current_scene,
                draft_id,
            )

        state.history = [
            self._resolve_scene_images(scene, draft_id) for scene in state.history
        ]
        return state

    def _resolve_scene_images(self, scene: Scene, draft_id: str) -> Scene:
        if scene.background_image is not None:
            scene.background_image = self._resolve_image(
                scene.background_image,
                draft_id,
            )

        if isinstance(scene.images, list):
            scene.images = [
                self._resolve_image(image, draft_id) for image in scene.images
            ]
        elif scene.images is not None:
            scene.images = self._resolve_image(scene.images, draft_id)

        if scene.interaction_component and scene.interaction_component.response_image:
            component = scene.interaction_component.model_copy(deep=True)
            component.response_image = self._resolve_image(
                component.response_image,
                draft_id,
            )
            scene.interaction_component = component

        return scene

    def _resolve_image(self, image: Image, draft_id: str) -> Image:
        if image.image_id is None:
            return image

        resolved = image.model_copy()
        resolved.url = self.build_image_url(draft_id, image.image_id)
        return resolved

    def _strip_image_urls(self, state: StoryState) -> StoryState:
        payload = state.model_copy(deep=True)

        if payload.current_scene is not None:
            payload.current_scene = self._strip_scene_urls(payload.current_scene)

        payload.history = [
            self._strip_scene_urls(scene) for scene in payload.history
        ]
        return payload

    @staticmethod
    def _strip_scene_urls(scene: Scene) -> Scene:
        if scene.background_image is not None:
            scene.background_image = DraftRepository._strip_image_url(scene.background_image)

        if isinstance(scene.images, list):
            scene.images = [
                DraftRepository._strip_image_url(image) for image in scene.images
            ]
        elif scene.images is not None:
            scene.images = DraftRepository._strip_image_url(scene.images)

        if scene.interaction_component and scene.interaction_component.response_image:
            component = scene.interaction_component.model_copy(deep=True)
            component.response_image = DraftRepository._strip_image_url(
                component.response_image
            )
            scene.interaction_component = component

        return scene

    @staticmethod
    def _strip_image_url(image: Image) -> Image:
        stripped = image.model_copy()
        stripped.url = None
        return stripped

    def _find_image(self, state: StoryState, image_id: str) -> Image | None:
        scenes = [*state.history]
        if state.current_scene is not None:
            scenes.append(state.current_scene)

        for scene in scenes:
            if scene.background_image and scene.background_image.image_id == image_id:
                return scene.background_image

            images = scene.images if isinstance(scene.images, list) else [scene.images]
            for image in images:
                if image is not None and image.image_id == image_id:
                    return image

            component = scene.interaction_component
            if (
                component is not None
                and component.response_image is not None
                and component.response_image.image_id == image_id
            ):
                return component.response_image

        return None

    @staticmethod
    def _draft_prefix(user_id: int, draft_id: str) -> str:
        return f"drafts/{user_id}/{draft_id}/"

    @staticmethod
    def _draft_object_name(
        user_id: int,
        draft_id: str,
        image_id: str,
        extension: str,
    ) -> str:
        return f"drafts/{user_id}/{draft_id}/{image_id}.{extension}"

    @staticmethod
    def _state_key(user_id: int, draft_id: str) -> str:
        return f"storybook:draft:{user_id}:{draft_id}:state"

    @staticmethod
    def _meta_key(user_id: int, draft_id: str) -> str:
        return f"storybook:draft:{user_id}:{draft_id}:meta"

    @staticmethod
    def _lock_key(user_id: int, draft_id: str) -> str:
        return f"storybook:draft:{user_id}:{draft_id}:lock"

    @staticmethod
    def _owner_key(draft_id: str) -> str:
        return f"storybook:draft-owner:{draft_id}"

    @staticmethod
    def _extension_from_content_type(
        content_type: str | None,
        photo_bytes: bytes,
    ) -> str:
        if content_type:
            extension = mimetypes.guess_extension(content_type.split(";", 1)[0].strip())
            if extension:
                return extension.lstrip(".")

        if photo_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "png"
        if photo_bytes.startswith(b"\xff\xd8\xff"):
            return "jpg"
        if photo_bytes[:4] == b"RIFF" and photo_bytes[8:12] == b"WEBP":
            return "webp"

        return "png"
