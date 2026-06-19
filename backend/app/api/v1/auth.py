from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import AccessTokenResponse, LoginRequest, RefreshResponse, RegisterRequest
from app.schemas.user import UserRead
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    return AuthService(db).register(
        email=payload.email,
        password=payload.password,
        api_key=payload.api_key,
    )


@router.post("/login", response_model=AccessTokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user, access_token, refresh_token = AuthService(db).login(
        email=payload.email,
        password=payload.password,
    )

    response.set_cookie(
        key=settings.refresh_token_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/refresh", response_model=RefreshResponse)
def refresh(
    refresh_token: str | None = Cookie(default=None, alias=settings.refresh_token_cookie_name),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    access_token = AuthService(db).refresh(refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AuthService(db).logout(user_id=current_user.id)

    response.delete_cookie(
        key=settings.refresh_token_cookie_name,
        path="/api/v1/auth",
    )

    return None
