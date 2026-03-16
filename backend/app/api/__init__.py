from fastapi import APIRouter
from . import apis

router = APIRouter()

router.include_router(apis.router)

@router.get("/")
async def read_root():
    return {"message": "API root"}
