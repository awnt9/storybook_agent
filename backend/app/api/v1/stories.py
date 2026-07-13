from __future__ import annotations

import mimetypes

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlmodel import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.user import User
from app.services.agent_service import AgentService


router = APIRouter()


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
