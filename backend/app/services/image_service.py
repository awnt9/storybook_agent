from __future__ import annotations

import base64
import logging
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from app.core.client_factory import create_llm_client
from app.core.config import get_agent_api_key, settings
from app.core.image_resolver import image_to_photo
from app.core.logging_config import configure_logging, summarize_for_log, summarize_text
from app.core.prompt_loader import load_prompt
from app.schemas.story_elements import Image
from app.schemas.tool_args import AnalyzeImageArgs, GenerateImageArgs


configure_logging(log_level=settings.log_level, log_file=settings.log_file)
logger = logging.getLogger(__name__)


def build_image_content(
    *,
    image: Image,
    image_bytes: bytes,
) -> dict:
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = guess_mime_type(image)

    return {
        "type": "image_url",
        "image_url": {
            "url": f"data:{mime_type};base64,{encoded}",
        },
    }


def guess_mime_type(image: Image) -> str:
    if image.path is None:
        return "image/png"

    suffix = Path(image.path).suffix.lower()

    match suffix:
        case ".jpg" | ".jpeg":
            return "image/jpeg"
        case ".png":
            return "image/png"
        case ".webp":
            return "image/webp"
        case _:
            raise ValueError(f"Unsupported image extension: {suffix}")


def analyze_image(
    *,
    args: AnalyzeImageArgs,
) -> dict:
    start = perf_counter()
    logger.info(
        "tool.analyze_image.start image=%s question=%s",
        summarize_for_log(args.image),
        summarize_text(getattr(args, "question", None)),
    )

    image_bytes = image_to_photo(image=args.image)
    image_content = build_image_content(image=args.image, image_bytes=image_bytes)
    mime_type = guess_mime_type(args.image)

    client = create_llm_client(
        api_key=get_agent_api_key(),
        base_url=settings.base_url,
    )

    prompt = load_prompt(
        "analyze_image.txt",
        question=args.question,
    )

    response = client.chat.completions.create(
        model=settings.model_name,
        messages=[
            {
                "role": "system",
                "content": prompt,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": args.question,
                    },
                    image_content,
                ],
            },
        ],
    )

    description = response.choices[0].message.content

    if not description:
        raise RuntimeError("analyze_image returned empty content.")

    args.image.description = description
    logger.info(
        "tool.analyze_image.end duration_ms=%s mime_type=%s description_length=%s",
        int((perf_counter() - start) * 1_000),
        mime_type,
        len(description),
    )

    return {
        "type": "image_analysis",
        "image": args.image.model_dump(mode="json"),
        "description": description,
    }


def generate_image(
    *,
    args: GenerateImageArgs,
) -> dict:
    start = perf_counter()
    logger.info(
        "tool.generate_image.start prompt=%s scene_text=%s",
        summarize_text(args.prompt),
        summarize_text(args.scene_text),
    )

    final_prompt = load_prompt(
        "generate_image.txt",
        prompt=args.prompt,
        scene_text=args.scene_text or "",
    )

    image = Image(
        image_id=f"img_{uuid4().hex}",
        url=None,
        path=None,
        prompt=final_prompt,
        description=args.prompt,
    )

    logger.info(
        "tool.generate_image.end duration_ms=%s image_id=%s prompt_length=%s",
        int((perf_counter() - start) * 1_000),
        image.image_id,
        len(final_prompt),
    )

    return {
        "type": "image",
        "image": image.model_dump(mode="json"),
    }
