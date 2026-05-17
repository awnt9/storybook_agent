from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    api_key: str = Field(min_length=1, max_length=512)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    api_key: str = Field(min_length=1, max_length=512)


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
