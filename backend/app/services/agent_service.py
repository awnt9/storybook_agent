from __future__ import annotations

from sqlmodel import Session

from app.repositories.agent_repository import AgentRepository
from app.schemas.story_elements import Image


class AgentService:
    def __init__(self, db: Session):
        self.repository = AgentRepository(db)

    def get_story_image(
        self,
        user_id: int,
        history_id: str,
        image_id: str,
    ) -> tuple[Image, bytes]:
        return self.repository.get_image_for_history(user_id, history_id, image_id)
