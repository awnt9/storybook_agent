from __future__ import annotations

from openai import AsyncOpenAI
from pydantic_ai import Agent, BinaryContent

from app.core.prompt_loader import load_prompt
from app.schemas.story_pipeline import ReferenceImageDescription
from app.story_pipeline.agents.common import chat_model
from app.story_pipeline.deps import StoryRunDeps


def _create_reference_image_agent(
    openai_client: AsyncOpenAI,
) -> Agent[None, ReferenceImageDescription]:
    return Agent(
        chat_model(openai_client),
        output_type=ReferenceImageDescription,
        instructions=load_prompt("reference_image.txt"),
    )


async def describe_reference_image(
    openai_client: AsyncOpenAI,
    image_bytes: bytes,
    *,
    content_type: str = "image/jpeg",
) -> str:
    agent = _create_reference_image_agent(openai_client)
    result = await agent.run(
        [
            load_prompt("reference_image_user.txt"),
            BinaryContent(data=image_bytes, media_type=content_type),
        ],
    )
    return result.output.description.strip()


async def enrich_story_deps(deps: StoryRunDeps) -> StoryRunDeps:
    if deps.action.image is None or deps.uploaded_image_bytes is None:
        return deps

    if deps.action.image.description:
        deps.uploaded_image_bytes = None
        return deps

    description = await describe_reference_image(
        deps.openai_client,
        deps.uploaded_image_bytes,
        content_type=deps.uploaded_image_content_type or "image/jpeg",
    )
    updated_image = deps.action.image.model_copy(update={"description": description})
    deps.action = deps.action.model_copy(update={"image": updated_image})
    deps.story_state = deps.state_store.patch_image_description(
        deps.story_state,
        updated_image,
    )
    deps.uploaded_image_bytes = None
    return deps
