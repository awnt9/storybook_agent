from __future__ import annotations

import json
import logging
from typing import Any

from app.core.client_factory import create_llm_client
from app.core.config import get_agent_api_key, settings
from app.core.logging_config import configure_logging, summarize_for_log, summarize_text
from app.core.prompt_loader import load_prompt
from app.schemas.story_elements import (
    Image,
    Scene,
    StoryState,
    ToolCallRecord,
    ToolHistory,
    UserAction,
)
from app.services.tool_service import AGENT_TOOLS, execute_tool


configure_logging(log_level=settings.log_level, log_file=settings.log_file)
logger = logging.getLogger(__name__)


def run_agent_loop(state: StoryState, action: UserAction) -> Scene:
    iteration = 0
    selected_tool_name: str | None = None

    logger.info(
        "agent_loop.start story_id=%s model=%s action=%s",
        state.story_id,
        settings.model_name,
        _summarize_user_action(action),
    )

    try:
        client = create_llm_client(
            api_key=get_agent_api_key(),
            base_url=settings.base_url,
        )

        working_scene = Scene()
        tool_history = ToolHistory()

        while True:
            iteration += 1
            selected_tool_name = None
            logger.info(
                "agent_loop.iteration.start iteration=%s history_calls=%s scene_texts=%s scene_images=%s",
                iteration,
                len(tool_history.calls),
                _count_items(working_scene.texts),
                _count_items(working_scene.images),
            )

            messages: list[dict[str, Any]] = [
                {
                    "role": "system",
                    "content": load_prompt("system_prompt.txt"),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "task": "Prepara el siguiente turno de la historia.",
                            "state": state.model_dump(mode="json"),
                            "user_action": action.model_dump(mode="json"),
                            "tool_history": tool_history.model_dump(mode="json") if tool_history else None,
                        },
                        ensure_ascii=False,
                    ),
                },
            ]

            response = client.chat.completions.create(
                model=settings.model_name,
                messages=messages,
                tools=AGENT_TOOLS,
                tool_choice="required",
                parallel_tool_calls=False,
            )

            assistant_message = response.choices[0].message
            tool_calls = assistant_message.tool_calls

            if tool_calls:
                tool_call = tool_calls[0]
                selected_tool_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
            else:
                parsed_tool_call = _extract_tool_call_from_content(
                    getattr(assistant_message, "content", None)
                )

                if parsed_tool_call is not None:
                    selected_tool_name, arguments = parsed_tool_call
                    logger.warning(
                        "agent_loop.content_tool_call_parsed iteration=%s tool=%s",
                        iteration,
                        selected_tool_name,
                    )
                else:
                    logger.warning(
                        "agent_loop.no_tool_call iteration=%s content=%s",
                        iteration,
                        summarize_text(getattr(assistant_message, "content", None)),
                    )
                    raise RuntimeError("Agent did not return a tool call.")

            if not selected_tool_name:
                raise RuntimeError("Agent did not return a tool call.")

            logger.info(
                "tool.selected iteration=%s tool=%s arguments=%s",
                iteration,
                selected_tool_name,
                summarize_for_log(
                    arguments,
                    include_payloads=settings.log_llm_payloads,
                ),
            )

            logger.info("tool.execution.start iteration=%s tool=%s", iteration, selected_tool_name)
            try:
                output_payload = execute_tool(tool_name=selected_tool_name, arguments=arguments)
            except Exception:
                logger.exception(
                    "tool.execution.error iteration=%s tool=%s arguments=%s",
                    iteration,
                    selected_tool_name,
                    summarize_for_log(
                        arguments,
                        include_payloads=settings.log_llm_payloads,
                    ),
                )
                raise

            tool_history.calls.append(
                ToolCallRecord(
                    tool_name=selected_tool_name,
                    arguments=arguments,
                    output=output_payload,
                )
            )

            output_type = output_payload.get("type")
            should_stop = False

            match output_type:
                case "text" | "image_analysis":
                    working_scene.texts.append(output_payload)
                case "image":
                    working_scene.images.append(output_payload)
                case "end_loop":
                    should_stop = True

            logger.info(
                "tool.execution.end iteration=%s tool=%s output_type=%s scene_texts=%s scene_images=%s",
                iteration,
                selected_tool_name,
                output_type,
                _count_items(working_scene.texts),
                _count_items(working_scene.images),
            )

            if should_stop:
                logger.info(
                    "agent_loop.end_loop_selected iteration=%s reason=%s",
                    iteration,
                    summarize_text(output_payload.get("reason")),
                )
                break

            if iteration >= settings.agent_max_iterations:
                if _scene_has_material(working_scene):
                    logger.warning(
                        "agent_loop.max_iterations_finish iteration=%s max_iterations=%s scene_texts=%s scene_images=%s",
                        iteration,
                        settings.agent_max_iterations,
                        _count_items(working_scene.texts),
                        _count_items(working_scene.images),
                    )
                    break

                raise RuntimeError(
                    f"Agent reached max iterations ({settings.agent_max_iterations}) without generated material."
                )

        logger.info(
            "agent_loop.end story_id=%s iterations=%s scene_texts=%s scene_images=%s",
            state.story_id,
            iteration,
            _count_items(working_scene.texts),
            _count_items(working_scene.images),
        )
        return working_scene
    except Exception:
        logger.exception(
            "agent_loop.error story_id=%s iteration=%s selected_tool=%s",
            state.story_id,
            iteration,
            selected_tool_name,
        )
        raise


def _count_items(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, list):
        return len(value)

    return 1


def _scene_has_material(scene: Scene) -> bool:
    return _count_items(scene.texts) > 0 or _count_items(scene.images) > 0


def _extract_tool_call_from_content(content: str | None) -> tuple[str, dict[str, Any]] | None:
    if not content:
        return None

    payload = content.strip()

    if payload.startswith("<tool_call>"):
        start = len("<tool_call>")
        end = payload.find("</tool_call>", start)
        payload = payload[start:end if end != -1 else None].strip()

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return None

    if not isinstance(parsed, dict):
        return None

    tool_name = parsed.get("name") or parsed.get("tool_name")
    arguments = parsed.get("arguments") or parsed.get("args") or {}

    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except json.JSONDecodeError:
            return None

    if not isinstance(tool_name, str) or not isinstance(arguments, dict):
        return None

    return tool_name, arguments


def _summarize_user_action(action: UserAction) -> Any:
    return summarize_for_log(
        action.model_dump(mode="json"),
        include_payloads=settings.log_llm_payloads,
    )
