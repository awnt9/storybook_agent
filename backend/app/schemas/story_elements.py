from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel


class Image(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_id: str | None = None
    url: str | None = None
    path: str | None = None
    prompt: str | None = None
    description: str | None = None


class Scene(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    background_image: Image | None = None
    texts: str | list[str] = []
    images: Image | list[Image] = []


class StoryState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    story_id: str | None = None
    current_scene: Scene | None = None
    history: list[Scene] = Field(default_factory=list)


class UserAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str | None = None
    image: Image | None = None


class StoryHistory(SQLModel, table=True):
    __tablename__ = "story_histories"

    id: str = SQLField(primary_key=True, max_length=36)
    user_id: int = SQLField(foreign_key="users.id", ondelete="CASCADE", index=True)
    state: dict = SQLField(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False),
    )
    created_at: datetime = SQLField(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = SQLField(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
