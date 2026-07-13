from fastapi import APIRouter

from app.api.v1 import api_keys, auth, drafts, health, stories, users


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

router.include_router(
    api_keys.router,
    prefix="/users/me/api-keys",
    tags=["API Keys"],
)

router.include_router(
    stories.router,
    prefix="/stories",
    tags=["Stories"],
)

router.include_router(
    drafts.router,
    prefix="/drafts",
    tags=["Drafts"],
)
