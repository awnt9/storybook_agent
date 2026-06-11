from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.user import UserRead


router = APIRouter()


@router.get("/me", response_model=UserRead)
def get_me(current_user=Depends(get_current_user)):
    return current_user
