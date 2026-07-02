from __future__ import annotations

import json
from collections.abc import AsyncIterator
from dataclasses import asdict, is_dataclass

from pydantic import BaseModel
from pydantic_graph import EndMarker, GraphBuilder, StepContext
from pydantic_graph.graph_builder import GraphTask
from sqlmodel import Session

from app.core.agents.agents import bg_generator
from app.core.config import settings
from app.core.openai_client import create_llm_client
from app.repositories.agent_repository import AgentRepository
from app.schemas.story_elements import (
    Image,
    ImageDeps,
    Scene,
    StoryAgentDeps,
)


g = GraphBuilder(input_type=StoryAgentDeps, output_type=Scene)


@g.step
async def create_background_image(ctx: StepContext[None, None, StoryAgentDeps]) -> Image:
    prompt = ctx.inputs.action.text
    if not prompt:
        raise ValueError("Background generation requires a text prompt")

    result = await bg_generator.run(
        prompt,
        deps=ImageDeps(
            openai_client=ctx.inputs.openai_client,
            image_model=settings.bg_image_model,
            image_size=settings.bg_image_size,
        ),
    )

    return Image(url=result.output, prompt=prompt)


g.add(
    g.edge_from(g.start_node).to(create_background_image),
    g.edge_from(create_background_image).to(g.end_node),
)

scene_graph = g.build()


def _serialize_payload(value: object) -> object:
    if isinstance(value, StoryAgentDeps):
        return {
            "user_id": value.user_id,
            "history_id": value.history_id,
            "action": value.action.model_dump(),
            "story_state": value.story_state.model_dump(),
        }
    if isinstance(value, BaseModel):
        return value.model_dump()
    if is_dataclass(value) and not isinstance(value, type):
        return {
            key: _serialize_payload(item)
            for key, item in asdict(value).items()
        }
    if isinstance(value, list):
        return [_serialize_payload(item) for item in value]
    return value


def _format_sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _scene_from_output(output: object) -> Scene | None:
    if isinstance(output, Scene):
        return output
    if isinstance(output, Image):
        return Scene(background_image=output)
    return None


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
    ) -> StoryAgentDeps:
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

        return StoryAgentDeps(
            user_id=user_id,
            history_id=history_id,
            action=action,
            story_state=story_state,
            openai_client=create_llm_client(api_key),
        )

    async def stream_continue_history(
        self,
        deps: StoryAgentDeps,
    ) -> AsyncIterator[str]:
        yield _format_sse(
            "start",
            {
                "status": "running",
                "history_id": deps.history_id,
                "story_state": _serialize_payload(deps.story_state),
            },
        )

        try:
            story_state = self.repository.record_user_action(
                deps.user_id,
                deps.history_id,
                deps.story_state,
                deps.action,
            )

            async with scene_graph.iter(inputs=deps) as run:
                async for event in run:
                    if isinstance(event, list):
                        for task in event:
                            if isinstance(task, GraphTask):
                                yield _format_sse(
                                    "step",
                                    {
                                        "node_id": task.node_id,
                                        "inputs": _serialize_payload(task.inputs),
                                    },
                                )
                    elif isinstance(event, EndMarker):
                        yield _format_sse(
                            "end",
                            {"output": _serialize_payload(event._value)},
                        )

                if run.output is not None:
                    scene = _scene_from_output(run.output)
                    if scene is not None:
                        story_state = self.repository.apply_scene_output(
                            deps.user_id,
                            deps.history_id,
                            story_state,
                            scene,
                        )

                    yield _format_sse(
                        "done",
                        {
                            "history_id": deps.history_id,
                            "output": _serialize_payload(run.output),
                            "story_state": _serialize_payload(story_state),
                        },
                    )
        except Exception as exc:
            yield _format_sse("error", {"detail": str(exc)})

    def get_story_image(
        self,
        user_id: int,
        history_id: str,
        image_id: str,
    ) -> tuple[Image, bytes]:
        return self.repository.get_image_for_history(user_id, history_id, image_id)
