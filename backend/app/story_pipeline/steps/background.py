from __future__ import annotations

import base64
from urllib.request import urlopen

from pydantic_graph import StepContext

from app.core.config import settings
from app.core.prompt_loader import load_prompt
from app.schemas.story_elements import Image
from app.story_pipeline.deps import StoryRunDeps


async def run(ctx: StepContext[None, None, StoryRunDeps]) -> Image:
    prompt = ctx.inputs.action.text
    if not prompt:
        raise ValueError("Background generation requires a text prompt")

    response = await ctx.inputs.openai_client.images.generate(
        model=settings.bg_image_model,
        prompt=load_prompt("background_generator.txt", scene=prompt.strip()),
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

    return ctx.inputs.image_store.save(photo_bytes, prompt=prompt)
