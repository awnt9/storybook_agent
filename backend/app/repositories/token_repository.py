from datetime import datetime

from sqlmodel import Session, select

from app.schemas.user import RefreshToken


class TokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)

        return token

    def list_valid_by_user(self, user_id: int) -> list[RefreshToken]:
        return list(
            self.db.exec(
                select(RefreshToken).where(
                    RefreshToken.user_id == user_id,
                    RefreshToken.revoked_at.is_(None),
                    RefreshToken.expires_at > datetime.utcnow(),
                )
            ).all()
        )

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.utcnow()
        self.db.add(token)
        self.db.commit()

    def revoke_all_for_user(self, user_id: int) -> None:
        tokens = self.db.exec(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        ).all()

        for token in tokens:
            token.revoked_at = datetime.utcnow()

        self.db.commit()
