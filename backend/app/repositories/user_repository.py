from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def create(self, email: str, hashed_password: str, api_key: str) -> User:
        user = User(
            email=email.lower(),
            hashed_password=hashed_password,
            api_key=api_key,
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
