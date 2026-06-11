from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Image(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_id: str | None = None
    url: str | None = None
    path: str | None = None
    prompt: str | None = None
    description: str | None = None


class Scene(BaseModel):
    model_config = ConfigDict(extra="forbid")

    texts: str | list[str] = []
    images: Image | list[Image] = []


class StoryState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    story_id: str | None = None
    current_scene: Scene | None = None
    history: list[Scene] = Field(default_factory=list)


class UserAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_action: str | Image | None = None


class ToolCallRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool_name: str
    arguments: dict[str, Any]
    output: dict[str, Any]


class ToolHistory(BaseModel):
    model_config = ConfigDict(extra="forbid")

    calls: list[ToolCallRecord] = Field(default_factory=list)
