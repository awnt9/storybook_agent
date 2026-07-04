from __future__ import annotations

from dataclasses import asdict, is_dataclass

from pydantic import BaseModel

from app.schemas.story_elements import Image, Scene
from app.story_pipeline.deps import StoryRunDeps


def serialize_pipeline_value(value: object) -> object:
    if isinstance(value, StoryRunDeps):
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
            key: serialize_pipeline_value(item)
            for key, item in asdict(value).items()
        }
    if isinstance(value, list):
        return [serialize_pipeline_value(item) for item in value]
    return value


def scene_from_output(output: object) -> Scene | None:
    if isinstance(output, Scene):
        return output
    if isinstance(output, Image):
        return Scene(background_image=output)
    return None
