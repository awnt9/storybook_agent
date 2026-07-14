from __future__ import annotations

import asyncio
import json
import mimetypes
from collections.abc import AsyncIterator
from dataclasses import replace

from redis import Redis
from sqlmodel import Session

from app.core.openai_client import create_llm_client
from app.repositories.draft_repository import DraftRepository
from app.schemas.story_elements import Image, UserAction
from app.schemas.story_pipeline import DEFAULT_STORY_TITLE
from app.story_pipeline.draft_adapters import DraftImageStore, DraftStoryStateStore
from app.story_pipeline.deps import StoryRunDeps
from app.story_pipeline.events import (
    PipelineDone,
    PipelineEnd,
    PipelineGraphComplete,
    PipelineStep
)
from app.story_pipeline.runner import run_scene_graph
from app.story_pipeline.serialization import scene_from_output, serialize_pipeline_value


class DraftService:
    def __init__(self, db: Session, redis_client: Redis) -> None:
        self.db = db
        self.repository = DraftRepository(redis_client)

    def create_draft(self, user_id: int, *, title: str | None = None) -> str:
        return self.repository.create_draft(user_id, title=title)

    def get_draft(self, user_id: int, draft_id: str):
        return self.repository.get_draft(user_id, draft_id)

    def update_draft_setup(
        self,
        user_id: int,
        draft_id: str,
        *,
        title: str | None = None,
        image_bytes: bytes | None = None,
        image_content_type: str | None = None,
    ):
        story_state = self.repository.update_draft_setup(
            user_id,
            draft_id,
            title=title,
            image_bytes=image_bytes,
            image_content_type=image_content_type,
        )
        _, draft_title = self.repository.get_draft(user_id, draft_id)
        return story_state, draft_title

    def update_interaction_response(
        self,
        user_id: int,
        draft_id: str,
        *,
        component_id: str,
        text: str | None = None,
        image_bytes: bytes | None = None,
        image_content_type: str | None = None,
    ):
        return self.repository.update_interaction_response(
            user_id,
            draft_id,
            component_id=component_id,
            text=text,
            image_bytes=image_bytes,
            image_content_type=image_content_type,
        )

    def prepare_continue_draft(
        self,
        *,
        user_id: int,
        api_key: str,
        draft_id: str,
        action_payload: UserAction,
        title: str | None,
        image_bytes: bytes | None,
        image_content_type: str | None,
    ) -> StoryRunDeps:
        story_state = self.repository.load_story_state(user_id, draft_id)
        action = self.repository.build_user_action(
            user_id=user_id,
            draft_id=draft_id,
            action_payload=action_payload,
            image_bytes=image_bytes,
            image_content_type=image_content_type,
        )
        story_title = title or self.repository.get_draft_title(user_id, draft_id)

        resolved_image_bytes = image_bytes
        resolved_image_content_type = image_content_type
        if (
            resolved_image_bytes is None
            and action.action_type == "cover_setup"
        ):
            cover_image = self.repository.get_cover_image(story_state)
            if cover_image is not None and cover_image.path:
                resolved_image_bytes = self.repository.read_image_bytes(cover_image)
                resolved_image_content_type = (
                    mimetypes.guess_type(cover_image.path)[0]
                    or "image/jpeg"
                )
                if action.image is None:
                    action = action.model_copy(update={"image": cover_image})

        return StoryRunDeps(
            user_id=user_id,
            history_id=draft_id,
            action=action,
            story_state=story_state,
            story_title=story_title,
            openai_client=create_llm_client(api_key),
            image_store=DraftImageStore(
                self.repository,
                user_id=user_id,
                draft_id=draft_id,
            ),
            state_store=DraftStoryStateStore(
                self.repository,
                user_id=user_id,
                draft_id=draft_id,
            ),
            uploaded_image_bytes=resolved_image_bytes,
            uploaded_image_content_type=resolved_image_content_type,
        )

    def get_draft(self, user_id: int, draft_id: str):
        return self.repository.get_draft(user_id, draft_id)

    def is_generating(self, user_id: int, draft_id: str) -> bool:
        return self.repository.is_generation_in_progress(user_id, draft_id)

    def build_draft_response(
        self,
        user_id: int,
        draft_id: str,
        *,
        story_state=None,
        title: str | None = None,
    ) -> dict:
        if story_state is None or title is None:
            loaded_state, loaded_title = self.repository.get_draft(user_id, draft_id)
            story_state = loaded_state if story_state is None else story_state
            title = loaded_title if title is None else title

        return {
            "draft_id": draft_id,
            "story_state": story_state,
            "title": title,
            "is_generating": self.is_generating(user_id, draft_id),
        }

    async def _run_continue_pipeline(
        self,
        deps: StoryRunDeps,
        *,
        title: str | None,
        event_queue: asyncio.Queue[str | None],
    ) -> None:
        story_state = deps.story_state

        try:
            resolved_title = title
            if resolved_title == DEFAULT_STORY_TITLE:
                resolved_title = None

            story_state = self.repository.record_user_action(
                deps.user_id,
                deps.history_id,
                deps.story_state,
                deps.action,
                title=resolved_title,
            )
            graph_deps = replace(deps, story_state=story_state)

            async for event in run_scene_graph(graph_deps):
                if isinstance(event, PipelineStep):
                    await event_queue.put(
                        self._format_sse(
                            "step",
                            {
                                "node_id": event.node_id,
                                "inputs": event.inputs,
                            },
                        )
                    )
                elif isinstance(event, PipelineEnd):
                    await event_queue.put(
                        self._format_sse("end", {"output": event.output})
                    )
                elif isinstance(event, PipelineGraphComplete):
                    scene = scene_from_output(event.output)
                    if scene is not None:
                        story_state = self.repository.apply_scene_output(
                            deps.user_id,
                            deps.history_id,
                            graph_deps.story_state,
                            scene,
                        )

                    done = PipelineDone(
                        history_id=deps.history_id,
                        output=serialize_pipeline_value(event.output),
                        story_state=serialize_pipeline_value(story_state),
                    )
                    await event_queue.put(
                        self._format_sse(
                            "done",
                            {
                                "draft_id": deps.history_id,
                                "output": done.output,
                                "story_state": done.story_state,
                            },
                        )
                    )
        except Exception as exc:
            await event_queue.put(self._format_sse("error", {"detail": str(exc)}))
        finally:
            await event_queue.put(None)
            self.repository.release_generation_lock(deps.user_id, deps.history_id)

    async def stream_continue_draft(
        self,
        deps: StoryRunDeps,
        *,
        title: str | None = None,
    ) -> AsyncIterator[str]:
        if not self.repository.acquire_generation_lock(deps.user_id, deps.history_id):
            yield self._format_sse(
                "error",
                {"detail": "Ya hay una generación en curso para este borrador"},
            )
            return

        event_queue: asyncio.Queue[str | None] = asyncio.Queue()

        await event_queue.put(
            self._format_sse(
                "start",
                {
                    "status": "running",
                    "draft_id": deps.history_id,
                    "story_state": serialize_pipeline_value(deps.story_state),
                },
            )
        )

        asyncio.create_task(
            self._run_continue_pipeline(deps, title=title, event_queue=event_queue)
        )

        try:
            while True:
                message = await event_queue.get()
                if message is None:
                    break
                yield message
        except asyncio.CancelledError:
            # Client disconnected; pipeline keeps running in the background task.
            return

    def commit_draft(
        self,
        user_id: int,
        draft_id: str,
        *,
        title: str | None = None,
    ) -> str:
        resolved_title = title
        if resolved_title == DEFAULT_STORY_TITLE:
            resolved_title = None
        return self.repository.commit_draft(
            self.db,
            user_id,
            draft_id,
            title=resolved_title,
        )

    def discard_draft(self, user_id: int, draft_id: str) -> None:
        self.repository.delete_draft(user_id, draft_id)

    def get_draft_image(
        self,
        user_id: int,
        draft_id: str,
        image_id: str,
    ) -> tuple[Image, bytes]:
        return self.repository.get_image_for_draft(user_id, draft_id, image_id)

    @staticmethod
    def _format_sse(event: str, data: object) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
