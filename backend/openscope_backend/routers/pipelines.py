"""Pipelines router for fetching available pipelines from Scope server."""

import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException
import httpx

from ..config import settings

router = APIRouter()


DEMO_PIPELINES = {
    "passthrough": {
        "pipeline_name": "Passthrough",
        "pipeline_description": "Pass video through unchanged (demo mode)",
        "supported_modes": ["realtime"],
        "default_mode": "realtime",
        "plugin_name": "passthrough",
    },
    "gray": {
        "pipeline_name": "Grayscale",
        "pipeline_description": "Convert video to grayscale (demo mode)",
        "supported_modes": ["realtime"],
        "default_mode": "realtime",
        "plugin_name": "gray",
    },
}


class PipelineInfo(BaseModel):
    """Pipeline information from Scope server."""

    pipeline_id: str
    pipeline_name: str
    pipeline_description: Optional[str] = None
    supported_modes: List[str] = []
    default_mode: Optional[str] = None
    plugin_name: Optional[str] = None


class PipelinesResponse(BaseModel):
    """Response containing available pipelines."""

    pipelines: Dict[str, Any]
    count: int


def is_demo_mode() -> bool:
    """Check if demo mode is enabled."""
    return os.getenv("DEMO_MODE", "false").lower() == "true"


@router.get("/pipelines", response_model=PipelinesResponse)
async def get_pipelines(scope_url: Optional[str] = None):
    """Fetch available pipelines from a Scope server.

    Args:
        scope_url: The URL of the Scope server (defaults to settings.scope_api_url)

    Returns:
        List of available pipelines with their configurations
    """
    if is_demo_mode():
        return PipelinesResponse(pipelines=DEMO_PIPELINES, count=len(DEMO_PIPELINES))

    if scope_url is None:
        scope_url = settings.scope_api_url
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{scope_url.rstrip('/')}/api/v1/pipelines/schemas"
            )
            response.raise_for_status()
            data = response.json()

            return PipelinesResponse(
                pipelines=data.get("pipelines", {}),
                count=len(data.get("pipelines", {})),
            )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Scope server at {scope_url}. Make sure Scope is running.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Error fetching pipelines: {e.response.text}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch pipelines: {str(e)}"
        )


@router.get("/pipelines/list")
async def list_pipelines_simple(
    scope_url: str = None,
) -> List[PipelineInfo]:
    """Get a simplified list of pipelines."""
    if is_demo_mode():
        return [PipelineInfo(pipeline_id=k, **v) for k, v in DEMO_PIPELINES.items()]

    if scope_url is None:
        scope_url = settings.scope_api_url
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{scope_url.rstrip('/')}/api/v1/pipelines/schemas"
            )
            response.raise_for_status()
            data = response.json()

            pipelines = []
            for pipeline_id, schema in data.get("pipelines", {}).items():
                pipelines.append(
                    PipelineInfo(
                        pipeline_id=pipeline_id,
                        pipeline_name=schema.get("pipeline_name", pipeline_id),
                        pipeline_description=schema.get("pipeline_description"),
                        supported_modes=schema.get("supported_modes", []),
                        default_mode=schema.get("default_mode"),
                        plugin_name=schema.get("plugin_name"),
                    )
                )

            return pipelines
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch pipelines: {str(e)}"
        )
