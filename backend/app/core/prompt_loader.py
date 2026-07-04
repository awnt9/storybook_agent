from __future__ import annotations

from pathlib import Path
from string import Formatter


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


class _SafePromptValues(dict[str, str]):
    def __missing__(self, key: str) -> str:
        return f"[No aplica: {key}]"


def load_prompt(prompt_name: str, **placeholders: str) -> str:
    prompt_path = PROMPTS_DIR / prompt_name

    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_path}")

    template = prompt_path.read_text(encoding="utf-8")
    return Formatter().vformat(template, (), _SafePromptValues(placeholders))
