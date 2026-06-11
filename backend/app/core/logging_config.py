from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any


DEFAULT_LOG_FORMAT = "[%(funcName)s] %(message)s"
_CONFIGURED_FILE_HANDLERS: set[str] = set()

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[36m"
GREEN = "\033[32m"
MAGENTA = "\033[35m"
RED = "\033[31m"
BLUE = "\033[34m"

EVENT_COLORS = {
    "agent_loop.iteration.start": f"{BOLD}{CYAN}",
    "agent_loop.start": f"{BOLD}{BLUE}",
    "agent_loop.end": f"{BOLD}{BLUE}",
    "llm.": MAGENTA,
    "tool.": GREEN,
}


class ConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        event_color = _event_color(record.getMessage())

        name = f"{DIM}[{record.funcName}]{RESET}"
        message = f"{event_color}{record.getMessage()}{RESET}" if event_color else record.getMessage()
        formatted = f"{name} {message}"

        if record.exc_info:
            formatted = f"{formatted}\n{self.formatException(record.exc_info)}"

        if record.getMessage().startswith("agent_loop.iteration.start"):
            return f"\n\n{formatted}"

        return formatted


def configure_logging(
    *,
    log_level: str = "INFO",
    log_file: str | None = None,
) -> None:
    root_logger = logging.getLogger()
    level = _resolve_log_level(log_level)
    root_logger.setLevel(level)

    console_formatter = ConsoleFormatter(DEFAULT_LOG_FORMAT)
    file_formatter = logging.Formatter(DEFAULT_LOG_FORMAT)

    if not any(getattr(handler, "_storybook_console_handler", False) for handler in root_logger.handlers):
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(console_formatter)
        console_handler.setLevel(level)
        console_handler._storybook_console_handler = True
        root_logger.addHandler(console_handler)

    for handler in root_logger.handlers:
        handler.setLevel(level)

    if log_file:
        log_path = str(Path(log_file).expanduser())
        if log_path not in _CONFIGURED_FILE_HANDLERS:
            file_path = Path(log_path)
            file_path.parent.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(file_path, encoding="utf-8")
            file_handler.setFormatter(file_formatter)
            file_handler.setLevel(level)
            root_logger.addHandler(file_handler)
            _CONFIGURED_FILE_HANDLERS.add(log_path)


def summarize_for_log(
    value: Any,
    *,
    include_payloads: bool = False,
    max_length: int = 400,
) -> Any:
    sanitized = _sanitize(value, include_payloads=include_payloads)

    try:
        rendered = json.dumps(sanitized, ensure_ascii=False, default=str)
    except TypeError:
        rendered = str(sanitized)

    if len(rendered) <= max_length:
        return sanitized

    return f"{rendered[:max_length]}... [truncated]"


def summarize_text(value: Any, *, max_length: int = 160) -> str | None:
    if value is None:
        return None

    text = str(value).replace("\n", " ").strip()
    if len(text) <= max_length:
        return text

    return f"{text[:max_length]}... [truncated]"


def _resolve_log_level(log_level: str) -> int:
    level_name = log_level.upper()
    level = getattr(logging, level_name, None)
    if not isinstance(level, int):
        raise ValueError(f"Invalid LOG_LEVEL: {log_level}")

    return level


def _event_color(message: str) -> str:
    if "error" in message.lower():
        return RED

    for event_prefix, color in EVENT_COLORS.items():
        if message.startswith(event_prefix):
            return color

    return ""


def _sanitize(value: Any, *, include_payloads: bool) -> Any:
    if hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")

    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            key_lower = str(key).lower()

            if "api_key" in key_lower or "authorization" in key_lower or "secret" in key_lower:
                sanitized[key] = "[redacted]"
            elif key_lower == "url" and isinstance(item, str) and item.startswith("data:"):
                sanitized[key] = "[image data omitted]"
            elif not include_payloads and key_lower in {"prompt", "content", "messages"}:
                sanitized[key] = summarize_text(item)
            else:
                sanitized[key] = _sanitize(item, include_payloads=include_payloads)

        return sanitized

    if isinstance(value, list):
        return [_sanitize(item, include_payloads=include_payloads) for item in value]

    if isinstance(value, tuple):
        return tuple(_sanitize(item, include_payloads=include_payloads) for item in value)

    if isinstance(value, str):
        if value.startswith("data:"):
            return "[image data omitted]"
        return summarize_text(value, max_length=240)

    return value
