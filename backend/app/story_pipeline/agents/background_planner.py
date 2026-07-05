from __future__ import annotations

from openai import AsyncOpenAI
from pydantic_ai import Agent, RunContext

from app.core.prompt_loader import load_prompt
from app.schemas.story_elements import Image, Scene, StoryState
from app.schemas.story_pipeline import (
    CONTINUE_STORY_TEXT,
    DEFAULT_STORY_TITLE,
    BackgroundPlannerInput,
    BackgroundScenePlan,
)
from app.story_pipeline.agents.common import chat_model
from app.story_pipeline.deps import StoryRunDeps


def _iter_scene_images(scene: Scene) -> list[Image]:
    images = scene.images
    if isinstance(images, list):
        return [image for image in images if image is not None]
    if images is not None:
        return [images]
    return []


def _collect_reference_characters(state: StoryState) -> list[str]:
    characters: list[str] = []
    seen: set[str] = set()

    scenes = [*state.history]
    if state.current_scene is not None:
        scenes.append(state.current_scene)

    for scene in scenes:
        for image in _iter_scene_images(scene):
            for candidate in (image.description, image.prompt):
                if not candidate or candidate in seen:
                    continue
                seen.add(candidate)
                characters.append(candidate)

    return characters


def _scene_summary(scene: Scene) -> str | None:
    parts: list[str] = []

    texts = scene.texts
    if isinstance(texts, list):
        parts.extend(text for text in texts if text)
    elif texts:
        parts.append(texts)

    if scene.background_image and scene.background_image.prompt:
        parts.append(f"Illustration brief: {scene.background_image.prompt}")

    if not parts:
        return None

    return " | ".join(parts)


def build_planner_input(deps: StoryRunDeps) -> BackgroundPlannerInput:
    history = deps.story_state.history
    previous_scenes = [
        summary
        for scene in history[-3:]
        if (summary := _scene_summary(scene)) is not None
    ]

    user_image_description = None
    if deps.action.image is not None:
        user_image_description = (
            deps.action.image.description or deps.action.image.prompt
        )

    story_title = None
    if deps.action.text and deps.action.text.strip() not in {
        CONTINUE_STORY_TEXT,
        DEFAULT_STORY_TITLE,
    }:
        story_title = deps.action.text.strip()

    reference_characters = _collect_reference_characters(deps.story_state)
    if user_image_description and user_image_description not in reference_characters:
        reference_characters.insert(0, user_image_description)

    return BackgroundPlannerInput(
        user_text=deps.action.text,
        user_image_description=user_image_description,
        story_title=story_title,
        scene_number=len(history) + 1,
        previous_scenes=previous_scenes,
        reference_characters=reference_characters,
    )


def _create_planner_agent(
    openai_client: AsyncOpenAI,
) -> Agent[BackgroundPlannerInput, BackgroundScenePlan]:
    agent: Agent[BackgroundPlannerInput, BackgroundScenePlan] = Agent(
        chat_model(openai_client),
        deps_type=BackgroundPlannerInput,
        output_type=BackgroundScenePlan,
        instructions=load_prompt("background_planner.txt"),
    )

    @agent.instructions
    def add_story_context(ctx: RunContext[BackgroundPlannerInput]) -> str:
        planner_input = ctx.deps
        lines = [f"Scene number: {planner_input.scene_number}"]

        if planner_input.story_title:
            lines.append(f"Story title: {planner_input.story_title}")

        if planner_input.user_text:
            lines.append(f"User text: {planner_input.user_text}")

        if planner_input.user_image_description:
            lines.append(
                "Uploaded reference subject (must match exactly): "
                f"{planner_input.user_image_description}"
            )

        if planner_input.reference_characters:
            lines.append("Established characters (keep consistent):")
            lines.extend(f"- {character}" for character in planner_input.reference_characters)

        if planner_input.previous_scenes:
            lines.append("Previous scenes:")
            lines.extend(f"- {scene}" for scene in planner_input.previous_scenes)
        else:
            lines.append("Previous scenes: none (this is the opening scene)")

        return "\n".join(lines)

    return agent


async def plan_background(deps: StoryRunDeps) -> BackgroundScenePlan:
    agent = _create_planner_agent(deps.openai_client)
    result = await agent.run(
        "Plan the next illustrated scene for this children's story.",
        deps=build_planner_input(deps),
    )
    return result.output
