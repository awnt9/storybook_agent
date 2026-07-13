from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.story_elements import StoryState


class DraftCreateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str


class DraftResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    story_state: StoryState
    title: str | None = None


class DraftCommitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=200)


class DraftCommitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    history_id: str
