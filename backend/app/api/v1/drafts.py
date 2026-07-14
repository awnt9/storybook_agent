from __future__ import annotations

import mimetypes

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response, StreamingResponse
from redis import Redis
from sqlmodel import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.redis_client import get_redis_client
from app.schemas.draft import (
    DraftCommitRequest,
    DraftCommitResponse,
    DraftCreateResponse,
    DraftResponse,
)
from app.schemas.story_elements import UserAction
from app.schemas.user import User
from app.services.api_key_service import ApiKeyService
from app.services.draft_service import DraftService


router = APIRouter()


def get_draft_service(
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis_client),
) -> DraftService:
    return DraftService(db, redis_client)


@router.post("", response_model=DraftCreateResponse)
def create_draft(
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
):
    draft_id = draft_service.create_draft(current_user.id)
    return DraftCreateResponse(draft_id=draft_id)


@router.get("/{draft_id}", response_model=DraftResponse)
def get_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
):
    return DraftResponse(
        **draft_service.build_draft_response(current_user.id, draft_id),
    )


@router.patch("/{draft_id}", response_model=DraftResponse)
async def update_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
    title: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
):
    image_bytes = await image.read() if image is not None else None
    image_bytes = image_bytes or None
    clean_title = title.strip() if title else None

    story_state, draft_title = draft_service.update_draft_setup(
        current_user.id,
        draft_id,
        title=clean_title,
        image_bytes=image_bytes,
        image_content_type=image.content_type if image is not None else None,
    )

    return DraftResponse(
        **draft_service.build_draft_response(
            current_user.id,
            draft_id,
            story_state=story_state,
            title=draft_title,
        ),
    )


@router.patch("/{draft_id}/interactions/{component_id}", response_model=DraftResponse)
async def update_draft_interaction(
    draft_id: str,
    component_id: str,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
    text: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
):
    image_bytes = await image.read() if image is not None else None
    image_bytes = image_bytes or None
    clean_text = text.strip() if text else None

    story_state = draft_service.update_interaction_response(
        current_user.id,
        draft_id,
        component_id=component_id,
        text=clean_text,
        image_bytes=image_bytes,
        image_content_type=image.content_type if image is not None else None,
    )

    return DraftResponse(
        **draft_service.build_draft_response(
            current_user.id,
            draft_id,
            story_state=story_state,
        ),
    )


@router.post("/{draft_id}/continue")
async def continue_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
    user_action: str | None = Form(default=None),
    title: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
):
    api_key = ApiKeyService(draft_service.db).get_selected_plaintext(current_user.id)

    image_bytes = await image.read() if image is not None else None
    image_bytes = image_bytes or None

    if user_action:
        action_payload = UserAction.model_validate_json(user_action)
    else:
        action_payload = UserAction(action_type="advance")

    clean_title = title.strip() if title else None

    deps = draft_service.prepare_continue_draft(
        user_id=current_user.id,
        api_key=api_key,
        draft_id=draft_id,
        action_payload=action_payload,
        title=clean_title,
        image_bytes=image_bytes,
        image_content_type=image.content_type if image is not None else None,
    )

    return StreamingResponse(
        draft_service.stream_continue_draft(deps, title=clean_title),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{draft_id}/commit", response_model=DraftCommitResponse)
def commit_draft(
    draft_id: str,
    payload: DraftCommitRequest,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
):
    history_id = draft_service.commit_draft(
        current_user.id,
        draft_id,
        title=payload.title,
    )
    return DraftCommitResponse(history_id=history_id)


@router.delete("/{draft_id}", status_code=204)
def discard_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
):
    draft_service.discard_draft(current_user.id, draft_id)
    return Response(status_code=204)


@router.get("/{draft_id}/images/{image_id}")
def get_draft_image(
    draft_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    draft_service: DraftService = Depends(get_draft_service),
):
    image, data = draft_service.get_draft_image(
        current_user.id,
        draft_id,
        image_id,
    )
    extension = image.path.rsplit(".", 1)[-1] if image.path else "png"
    media_type = mimetypes.types_map.get(f".{extension}", "application/octet-stream")

    return Response(
        content=data,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )
