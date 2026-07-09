from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel

InteractionComponentType = Literal[
    "text_input",
    "single_choice",
    "image_input",
    "yes_no",
]

UserActionType = Literal[
    "cover_setup",
    "advance",
    "text_input",
    "single_choice",
    "image_input",
    "yes_no",
]


class Image(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_id: str | None = None
    url: str | None = None
    path: str | None = None
    prompt: str | None = None
    description: str | None = None


class InteractionComponent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: InteractionComponentType
    label: str
    options: list[str] | None = None
    placeholder: str | None = None
    yes_label: str = "Sí"
    no_label: str = "No"
    response_text: str | None = None
    response_image: Image | None = None


class Scene(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    background_image: Image | None = None
    texts: str | list[str] = []
    images: Image | list[Image] = []
    interaction_component: InteractionComponent | None = None


class StoryState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    story_id: str | None = None
    current_scene: Scene | None = None
    history: list[Scene] = Field(default_factory=list)


class UserAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_type: UserActionType | None = None
    component_id: str | None = None
    text: str | None = None
    image: Image | None = None


class StoryHistory(SQLModel, table=True):
    __tablename__ = "story_histories"

    id: str = SQLField(primary_key=True, max_length=36)
    user_id: int = SQLField(foreign_key="users.id", ondelete="CASCADE", index=True)
    title: str | None = SQLField(default=None, max_length=200)
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
