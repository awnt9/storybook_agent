from fastapi import APIRouter

from app.api.v1 import auth, health, users


router = APIRouter()

router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Auth"],
)

router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)
