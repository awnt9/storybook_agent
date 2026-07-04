from __future__ import annotations

import json
from collections.abc import AsyncIterator

from sqlmodel import Session

from app.core.openai_client import create_llm_client
from app.repositories.agent_repository import AgentRepository
from app.schemas.story_elements import Image
from app.story_pipeline.adapters import RepositoryImageStore
from app.story_pipeline.deps import StoryRunDeps
from app.story_pipeline.events import (
    PipelineDone,
    PipelineEnd,
    PipelineGraphComplete,
    PipelineStep,
)
from app.story_pipeline.runner import run_scene_graph
from app.story_pipeline.serialization import scene_from_output, serialize_pipeline_value


class AgentService:
    def __init__(self, db: Session):
        self.repository = AgentRepository(db)

    def prepare_continue_history(
        self,
        *,
        user_id: int,
        api_key: str,
        text: str | None,
        history_id: str | None,
        image_bytes: bytes | None,
        image_content_type: str | None,
    ) -> StoryRunDeps:
        history_id, story_state = self.repository.get_or_create_history(
            user_id,
            history_id,
        )
        action = self.repository.build_user_action(
            user_id=user_id,
            history_id=history_id,
            text=text,
            image_bytes=image_bytes,
            image_content_type=image_content_type,
        )

        return StoryRunDeps(
            user_id=user_id,
            history_id=history_id,
            action=action,
            story_state=story_state,
            openai_client=create_llm_client(api_key),
            image_store=RepositoryImageStore(
                self.repository,
                user_id=user_id,
                history_id=history_id,
            ),
        )

    async def stream_continue_history(
        self,
        deps: StoryRunDeps,
    ) -> AsyncIterator[str]:
        yield self._format_sse(
            "start",
            {
                "status": "running",
                "history_id": deps.history_id,
                "story_state": serialize_pipeline_value(deps.story_state),
            },
        )

        try:
            story_state = self.repository.record_user_action(
                deps.user_id,
                deps.history_id,
                deps.story_state,
                deps.action,
            )

            async for event in run_scene_graph(deps):
                if isinstance(event, PipelineStep):
                    yield self._format_sse(
                        "step",
                        {
                            "node_id": event.node_id,
                            "inputs": event.inputs,
                        },
                    )
                elif isinstance(event, PipelineEnd):
                    yield self._format_sse("end", {"output": event.output})
                elif isinstance(event, PipelineGraphComplete):
                    scene = scene_from_output(event.output)
                    if scene is not None:
                        story_state = self.repository.apply_scene_output(
                            deps.user_id,
                            deps.history_id,
                            story_state,
                            scene,
                        )

                    done = PipelineDone(
                        history_id=deps.history_id,
                        output=serialize_pipeline_value(event.output),
                        story_state=serialize_pipeline_value(story_state),
                    )
                    yield self._format_sse(
                        "done",
                        {
                            "history_id": done.history_id,
                            "output": done.output,
                            "story_state": done.story_state,
                        },
                    )
        except Exception as exc:
            yield self._format_sse("error", {"detail": str(exc)})

    def get_story_image(
        self,
        user_id: int,
        history_id: str,
        image_id: str,
    ) -> tuple[Image, bytes]:
        return self.repository.get_image_for_history(user_id, history_id, image_id)

    @staticmethod
    def _format_sse(event: str, data: object) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
