"""Pipelines router for fetching available pipelines from Scope server."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()


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


@router.get("/pipelines", response_model=PipelinesResponse)
async def get_pipelines(scope_url: str = "http://localhost:8000"):
    """Fetch available pipelines from a Scope server.

    Args:
        scope_url: The URL of the Scope server (default: http://localhost:8000)

    Returns:
        List of available pipelines with their configurations
    """
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
    scope_url: str = "http://localhost:8000",
) -> List[PipelineInfo]:
    """Get a simplified list of pipelines."""
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
