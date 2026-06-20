from sqlmodel import Session, select

from app.schemas.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.exec(select(User).where(User.id == user_id)).first()

    def get_by_email(self, email: str) -> User | None:
        return self.db.exec(select(User).where(User.email == email.lower())).first()

    def list_ids(self) -> list[int]:
        return list(self.db.exec(select(User.id)).all())

    def create(self, email: str, hashed_password: str) -> User:
        user = User(
            email=email.lower(),
            hashed_password=hashed_password,
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    def update_api_key(self, user: User, api_key: str) -> User:
        user.api_key = api_key

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user
