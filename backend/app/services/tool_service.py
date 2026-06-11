from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings
from app.core.logging_config import configure_logging, summarize_text
from app.schemas.tool_args import (
    AnalyzeImageArgs,
    EndLoopArgs,
    GenerateImageArgs,
    GenerateTextArgs,
)
from app.services.image_service import analyze_image, generate_image
from app.services.text_service import generate_text


configure_logging(log_level=settings.log_level, log_file=settings.log_file)
logger = logging.getLogger(__name__)


AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_text",
            "description": "Escribe un fragmento narrativo para el siguiente turno del cuento.",
            "parameters": GenerateTextArgs.model_json_schema(),
            "strict": False,
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_image",
            "description": "Analiza una imagen disponible en la historia o subida por el usuario.",
            "parameters": AnalyzeImageArgs.model_json_schema(),
            "strict": False,
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_image",
            "description": "Genera una imagen o ilustración basada en una descripción.",
            "parameters": GenerateImageArgs.model_json_schema(),
            "strict": False,
        },
    },
    {
        "type": "function",
        "function": {
            "name": "end_loop",
            "description": "Finaliza el bucle del agente cuando ya hay suficiente material.",
            "parameters": EndLoopArgs.model_json_schema(),
            "strict": False,
        },
    },
]


def execute_tool(
    *,
    tool_name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    match tool_name:
        case "generate_text":
            args = GenerateTextArgs.model_validate(arguments)
            return generate_text(args=args)

        case "analyze_image":
            args = AnalyzeImageArgs.model_validate(arguments)
            return analyze_image(args=args)

        case "generate_image":
            args = GenerateImageArgs.model_validate(arguments)
            return generate_image(args=args)

        case "end_loop":
            args = EndLoopArgs.model_validate(arguments)
            return end_loop(args=args)

        case _:
            raise ValueError(f"Unknown tool: {tool_name}")


def end_loop(*, args: EndLoopArgs) -> dict:
    logger.info("tool.end_loop reason=%s", summarize_text(args.reason))

    return {
        "type": "end_loop",
        "reason": args.reason,
    }
