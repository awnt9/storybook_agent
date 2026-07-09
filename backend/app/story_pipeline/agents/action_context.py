from __future__ import annotations

from app.schemas.story_elements import UserAction
from app.schemas.story_pipeline import CONTINUE_STORY_TEXT, DEFAULT_STORY_TITLE


def format_user_action_for_planner(action: UserAction) -> str | None:
    action_type = action.action_type

    if action_type in {None, "advance"}:
        return CONTINUE_STORY_TEXT

    if action_type == "cover_setup":
        if action.text and action.text.strip() not in {DEFAULT_STORY_TITLE}:
            return f"Start the story titled \"{action.text.strip()}\"."
        if action.image is not None:
            return "Start the story with the uploaded cover character."
        return "Start a new illustrated story."

    if action_type == "yes_no":
        choice = "yes" if action.text == "yes" else "no"
        return f"The player answered: {choice}."

    if action_type == "single_choice":
        return f"The player chose: {action.text.strip()}."

    if action_type == "text_input":
        return f"The player wrote: {action.text.strip()}."

    if action_type == "image_input":
        if action.image and action.image.description:
            return (
                "The player uploaded an image described as: "
                f"{action.image.description}"
            )
        return "The player uploaded a new reference image."

    if action.text:
        return action.text.strip()

    return CONTINUE_STORY_TEXT
