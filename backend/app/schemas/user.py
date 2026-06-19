from datetime import datetime

from pydantic import ConfigDict, EmailStr
from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True, index=True)
    email: str = Field(max_length=255, unique=True, index=True, nullable=False)
    hashed_password: str = Field(max_length=255, nullable=False)
    api_key: str = Field(max_length=512, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    is_verified: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
    )

    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    refresh_tokens: list["RefreshToken"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True, index=True)

    user_id: int = Field(
        foreign_key="users.id",
        ondelete="CASCADE",
        index=True,
    )

    token_hash: str = Field(max_length=255, unique=True, nullable=False)
    expires_at: datetime = Field(nullable=False)
    revoked_at: datetime | None = Field(default=None, nullable=True)

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
    )

    user: "User" = Relationship(back_populates="refresh_tokens")


class UserRead(SQLModel):
    id: int
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
