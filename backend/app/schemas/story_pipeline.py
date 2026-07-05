from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

DEFAULT_STORY_TITLE = "Título del cuento"
CONTINUE_STORY_TEXT = "Continuar la historia con una nueva escena"


class BackgroundPlannerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_text: str | None = None
    user_image_description: str | None = None
    story_title: str | None = None
    scene_number: int = Field(ge=1)
    previous_scenes: list[str] = Field(default_factory=list)
    reference_characters: list[str] = Field(default_factory=list)


class BackgroundScenePlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scene_description: str
    mood: str | None = None
    focus: str = Field(
        default="Wide establishing background shot with environment filling the frame",
    )


class ReferenceImageDescription(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
