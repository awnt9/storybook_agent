from __future__ import annotations

import mimetypes
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.core.minio import get_minio_client
from app.schemas.story_elements import Image, Scene, StoryHistory, StoryState, UserAction


class AgentRepository:
    def __init__(self, db: Session):
        self.db = db
        self.minio = get_minio_client()
        self.bucket = settings.minio_bucket

    def create_history(self, user_id: int) -> str:
        history_id = str(uuid4())
        state = StoryState(story_id=history_id)
        self._insert_history(user_id, history_id, state)
        return history_id

    def get_or_create_history(
        self,
        user_id: int,
        history_id: str | None,
    ) -> tuple[str, StoryState]:
        if history_id:
            return history_id, self.load_story_state(user_id, history_id)

        history_id = self.create_history(user_id)
        return history_id, self.load_story_state(user_id, history_id)

    def load_story_state(self, user_id: int, history_id: str) -> StoryState:
        record = self._get_owned_history(user_id, history_id)
        state = StoryState.model_validate(record.state)
        state.story_id = history_id
        return self._resolve_state_images(state, history_id)

    def save_story_state(
        self,
        user_id: int,
        history_id: str,
        state: StoryState,
    ) -> StoryState:
        record = self._get_owned_history(user_id, history_id)
        persisted = self._strip_image_urls(state)
        persisted.story_id = history_id
        record.state = persisted.model_dump(mode="json")
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self.load_story_state(user_id, history_id)

    def store_image(
        self,
        user_id: int,
        history_id: str,
        photo_bytes: bytes,
        *,
        content_type: str | None = None,
        prompt: str | None = None,
        description: str | None = None,
    ) -> Image:
        self._get_owned_history(user_id, history_id)

        extension = self._extension_from_content_type(content_type, photo_bytes)
        image_id = f"img_{uuid4().hex}"
        object_name = self._object_name(user_id, history_id, image_id, extension)

        self.minio.put_object(
            self.bucket,
            object_name,
            BytesIO(photo_bytes),
            length=len(photo_bytes),
            content_type=content_type or mimetypes.guess_type(object_name)[0] or "application/octet-stream",
        )

        return Image(
            image_id=image_id,
            path=object_name,
            url=self.build_image_url(history_id, image_id),
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

    def build_image_url(self, history_id: str, image_id: str) -> str:
        return f"/api/v1/stories/{history_id}/images/{image_id}"

    def build_user_action(
        self,
        *,
        user_id: int,
        history_id: str,
        text: str | None,
        image_bytes: bytes | None,
        image_content_type: str | None,
    ) -> UserAction:
        clean_text = text.strip() if text else None
        image = None

        if image_bytes:
            image = self.store_image(
                user_id,
                history_id,
                image_bytes,
                content_type=image_content_type,
                prompt=clean_text or "Reference character photo",
            )

        if not clean_text and image is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Provide text and/or an image",
            )

        if clean_text and image is not None:
            return UserAction(text=clean_text, image=image)

        if clean_text:
            return UserAction(text=clean_text)

        return UserAction(image=image)

    def record_user_action(
        self,
        user_id: int,
        history_id: str,
        state: StoryState,
        action: UserAction,
    ) -> StoryState:
        scene = state.current_scene or Scene()
        action_text = action.text

        if action_text:
            scene.texts = (
                [*scene.texts, action_text]
                if isinstance(scene.texts, list)
                else [scene.texts, action_text]
                if scene.texts
                else [action_text]
            )

        if action.image is not None:
            scene.images = (
                [*scene.images, action.image]
                if isinstance(scene.images, list)
                else [scene.images, action.image]
                if scene.images
                else [action.image]
            )

        state.current_scene = scene
        return self.save_story_state(user_id, history_id, state)

    def apply_scene_output(
        self,
        user_id: int,
        history_id: str,
        state: StoryState,
        scene: Scene,
    ) -> StoryState:
        state.history = [*state.history, scene]
        state.current_scene = scene
        return self.save_story_state(user_id, history_id, state)

    def patch_image_description(
        self,
        user_id: int,
        history_id: str,
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
        return self.save_story_state(user_id, history_id, state)

    def get_image_for_history(
        self,
        user_id: int,
        history_id: str,
        image_id: str,
    ) -> tuple[Image, bytes]:
        state = self.load_story_state(user_id, history_id)
        image = self._find_image(state, image_id)

        if image is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found",
            )

        return image, self.read_image_bytes(image)

    def _insert_history(
        self,
        user_id: int,
        history_id: str,
        state: StoryState,
    ) -> StoryHistory:
        persisted = self._strip_image_urls(state)
        persisted.story_id = history_id
        record = StoryHistory(
            id=history_id,
            user_id=user_id,
            state=persisted.model_dump(mode="json"),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def _get_owned_history(self, user_id: int, history_id: str) -> StoryHistory:
        record = self.db.exec(
            select(StoryHistory).where(
                StoryHistory.id == history_id,
                StoryHistory.user_id == user_id,
            )
        ).first()

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Story history not found",
            )

        return record

    def _resolve_state_images(self, state: StoryState, history_id: str) -> StoryState:
        if state.current_scene is not None:
            state.current_scene = self._resolve_scene_images(
                state.current_scene,
                history_id,
            )

        state.history = [
            self._resolve_scene_images(scene, history_id) for scene in state.history
        ]
        return state

    def _resolve_scene_images(self, scene: Scene, history_id: str) -> Scene:
        if scene.background_image is not None:
            scene.background_image = self._resolve_image(
                scene.background_image,
                history_id,
            )

        if isinstance(scene.images, list):
            scene.images = [
                self._resolve_image(image, history_id) for image in scene.images
            ]
        elif scene.images is not None:
            scene.images = self._resolve_image(scene.images, history_id)

        return scene

    def _resolve_image(self, image: Image, history_id: str) -> Image:
        if image.image_id is None:
            return image

        resolved = image.model_copy()
        resolved.url = self.build_image_url(history_id, image.image_id)
        return resolved

    def _strip_image_urls(self, state: StoryState) -> StoryState:
        payload = state.model_copy(deep=True)

        if payload.current_scene is not None:
            payload.current_scene = self._strip_scene_urls(payload.current_scene)

        payload.history = [
            self._strip_scene_urls(scene) for scene in payload.history
        ]
        return payload

    def _strip_scene_urls(self, scene: Scene) -> Scene:
        if scene.background_image is not None:
            scene.background_image = self._strip_image_url(scene.background_image)

        if isinstance(scene.images, list):
            scene.images = [self._strip_image_url(image) for image in scene.images]
        elif scene.images is not None:
            scene.images = self._strip_image_url(scene.images)

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

        return None

    @staticmethod
    def _object_name(
        user_id: int,
        history_id: str,
        image_id: str,
        extension: str,
    ) -> str:
        return f"users/{user_id}/histories/{history_id}/{image_id}.{extension}"

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
