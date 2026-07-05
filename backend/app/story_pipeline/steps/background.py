from __future__ import annotations

import base64
from urllib.request import urlopen

from app.core.config import settings
from app.core.prompt_loader import load_prompt
from app.schemas.story_elements import Image, Scene
from app.story_pipeline.deps import StoryRunDeps
from app.schemas.story_pipeline import BackgroundScenePlan


def _build_scene_prompt(plan: BackgroundScenePlan) -> str:
    scene_text = plan.scene_description.strip()
    if plan.mood:
        scene_text = f"{scene_text}. Mood: {plan.mood.strip()}"
    if plan.focus:
        scene_text = f"{scene_text}. {plan.focus.strip()}"
    return load_prompt("background_generator.txt", scene=scene_text)


def _carry_reference_images(deps: StoryRunDeps, scene: Scene) -> Scene:
    working_scene = deps.story_state.current_scene
    if working_scene is None:
        return scene

    if working_scene.images and not scene.images:
        scene.images = working_scene.images

    return scene


async def run(deps: StoryRunDeps, plan: BackgroundScenePlan) -> Scene:
    image_prompt = _build_scene_prompt(plan)

    response = await deps.openai_client.images.generate(
        model=settings.bg_image_model,
        prompt=image_prompt,
        n=1,
        size=settings.bg_image_size,
        quality=settings.bg_image_quality,
    )

    image_data = response.data[0]
    if image_data.b64_json:
        photo_bytes = base64.b64decode(image_data.b64_json)
    elif image_data.url:
        with urlopen(image_data.url) as remote_image:
            photo_bytes = remote_image.read()
    else:
        raise ValueError("Image generation returned no data")

    image: Image = deps.image_store.save(
        photo_bytes,
        prompt=plan.scene_description.strip(),
    )
    scene = Scene(background_image=image)
    return _carry_reference_images(deps, scene)
