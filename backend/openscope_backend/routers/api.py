"""API routers."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/info")
async def get_info():
    """Get API info."""
    return {
        "name": "OpenScope API",
        "version": "0.1.0",
        "description": "Visual plugin builder for Daydream Scope",
    }
