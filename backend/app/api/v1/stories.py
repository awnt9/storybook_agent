from __future__ import annotations

import mimetypes

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlmodel import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.user import User
from app.schemas.story_elements import UserAction
from app.services.agent_service import AgentService
from app.services.api_key_service import ApiKeyService


router = APIRouter()


@router.post("/continue-history")
async def continue_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    user_action: str | None = Form(default=None),
    history_id: str | None = Form(default=None),
    title: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
):
    api_key = ApiKeyService(db).get_selected_plaintext(current_user.id)

    image_bytes = await image.read() if image is not None else None
    image_bytes = image_bytes or None

    if user_action:
        action_payload = UserAction.model_validate_json(user_action)
    else:
        action_payload = UserAction(action_type="advance")

    agent_service = AgentService(db)
    clean_title = title.strip() if title else None

    deps = agent_service.prepare_continue_history(
        user_id=current_user.id,
        api_key=api_key,
        action_payload=action_payload,
        history_id=history_id,
        title=clean_title,
        image_bytes=image_bytes,
        image_content_type=image.content_type if image is not None else None,
    )

    return StreamingResponse(
        agent_service.stream_continue_history(deps),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{history_id}/images/{image_id}")
async def get_story_image(
    history_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image, data = AgentService(db).get_story_image(
        current_user.id,
        history_id,
        image_id,
    )
    extension = image.path.rsplit(".", 1)[-1] if image.path else "png"
    media_type = mimetypes.types_map.get(f".{extension}", "application/octet-stream")

    return Response(
        content=data,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )
