from __future__ import annotations

import logging
from time import perf_counter

from app.core.client_factory import create_llm_client
from app.core.config import get_agent_api_key, settings
from app.core.logging_config import configure_logging, summarize_text
from app.core.prompt_loader import load_prompt
from app.schemas.tool_args import GenerateTextArgs


configure_logging(log_level=settings.log_level, log_file=settings.log_file)
logger = logging.getLogger(__name__)


def generate_text(
    *,
    args: GenerateTextArgs,
) -> dict:
    start = perf_counter()
    logger.info(
        "tool.generate_text.start brief=%s tone=%s",
        summarize_text(args.brief),
        summarize_text(args.tone),
    )

    client = create_llm_client(
        api_key=get_agent_api_key(),
        base_url=settings.base_url,
    )

    prompt = load_prompt(
        "generate_text.txt",
        brief=args.brief,
        tone=args.tone,
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
                "content": "Escribe el siguiente fragmento del cuento.",
            },
        ],
    )

    content = response.choices[0].message.content
    logger.info(
        "tool.generate_text.end duration_ms=%s content_length=%s",
        int((perf_counter() - start) * 1_000),
        len(content or ""),
    )

    return {
        "type": "text",
        "content": content
    }
