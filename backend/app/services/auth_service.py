from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.models.user import User
from app.repositories.token_repository import TokenRepository
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self, db: Session):
        self.user_repository = UserRepository(db)
        self.token_repository = TokenRepository(db)

    def register(self, email: str, password: str, api_key: str) -> User:
        existing_user = self.user_repository.get_by_email(email)

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        hashed_password = hash_password(password)

        return self.user_repository.create(
            email=email,
            hashed_password=hashed_password,
            api_key=self._clean_api_key(api_key),
        )

    def login(self, email: str, password: str, api_key: str) -> tuple[User, str, str]:
        user = self.user_repository.get_by_email(email)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user",
            )

        clean_api_key = self._clean_api_key(api_key)

        if user.api_key != clean_api_key:
            user = self.user_repository.update_api_key(user=user, api_key=clean_api_key)

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token()

        expires_at = datetime.utcnow() + timedelta(
            days=settings.refresh_token_expire_days
        )

        self.token_repository.create(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=expires_at,
        )

        return user, access_token, refresh_token

    def refresh(self, refresh_token: str) -> str:
        users_tokens = []

        for user_id in self._get_candidate_user_ids():
            valid_tokens = self.token_repository.list_valid_by_user(user_id)
            users_tokens.extend(valid_tokens)

        for stored_token in users_tokens:
            if verify_refresh_token(refresh_token, stored_token.token_hash):
                return create_access_token(subject=str(stored_token.user_id))

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    def logout(self, user_id: int) -> None:
        self.token_repository.revoke_all_for_user(user_id)

    def _get_candidate_user_ids(self) -> list[int]:
        db = self.user_repository.db
        rows = db.query(User.id).all()
        return [row[0] for row in rows]

    def _clean_api_key(self, api_key: str) -> str:
        clean_api_key = api_key.strip()

        if not clean_api_key:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="API key is required",
            )

        return clean_api_key
