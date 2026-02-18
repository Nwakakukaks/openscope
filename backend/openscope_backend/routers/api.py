"""API routers."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException
import httpx

from ..config import settings

router = APIRouter()


class PipelineLoadRequest(BaseModel):
    """Request to load a pipeline."""

    pipeline_ids: List[str]
    load_params: Optional[Dict[str, Any]] = None
    connection_id: Optional[str] = None
    user_id: Optional[str] = None


class WebRTCOfferRequest(BaseModel):
    """WebRTC offer request."""

    sdp: Optional[str] = None
    type: Optional[str] = None
    initialParameters: Optional[Dict[str, Any]] = Field(
        default=None, description="Initial parameters for the session"
    )
    user_id: Optional[str] = None
    connection_id: Optional[str] = None
    connection_info: Optional[Dict[str, Any]] = None


class CloudConnectRequest(BaseModel):
    """Cloud connect request."""

    app_id: Optional[str] = None
    api_key: Optional[str] = None
    user_id: Optional[str] = None


async def proxy_to_scope(
    endpoint: str, method: str = "GET", data: Optional[Dict] = None
):
    """Proxy request to Scope server."""
    scope_url = settings.scope_api_url.rstrip("/")
    url = f"{scope_url}{endpoint}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                response = await client.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Scope server at {scope_url}. Make sure Scope is running.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Scope server error: {e.response.text}",
        )


@router.get("/info")
async def get_info():
    """Get API info."""
    return {
        "name": "OpenScope API",
        "version": "0.1.0",
        "description": "Visual plugin builder for Daydream Scope",
    }


@router.get("/scope/health")
async def scope_health():
    """Get Scope server health status."""
    return await proxy_to_scope("/health")


@router.get("/scope/pipelines")
async def get_scope_pipelines():
    """Get available pipelines from Scope server."""
    return await proxy_to_scope("/api/v1/pipelines/schemas")


@router.get("/scope/pipeline/status")
async def get_pipeline_status():
    """Get current pipeline status from Scope server."""
    return await proxy_to_scope("/api/v1/pipeline/status")


@router.post("/scope/pipeline/load")
async def load_pipeline(request: PipelineLoadRequest):
    """Load a pipeline on the Scope server."""
    return await proxy_to_scope(
        "/api/v1/pipeline/load",
        method="POST",
        data=request.model_dump(exclude_none=True),
    )


@router.get("/scope/webrtc/ice-servers")
async def get_ice_servers():
    """Get ICE servers for WebRTC."""
    return await proxy_to_scope("/api/v1/webrtc/ice-servers")


@router.post("/scope/webrtc/offer")
async def send_webrtc_offer(request: WebRTCOfferRequest):
    """Send WebRTC offer to Scope server."""
    return await proxy_to_scope(
        "/api/v1/webrtc/offer",
        method="POST",
        data=request.model_dump(exclude_none=True),
    )


@router.post("/scope/webrtc/ice")
async def send_ice_candidates(session_id: str, candidate: Dict):
    """Send ICE candidates to Scope server."""
    return await proxy_to_scope(
        f"/api/v1/webrtc/ice?session_id={session_id}",
        method="POST",
        data=candidate,
    )


@router.get("/scope/cloud/status")
async def get_cloud_status():
    """Get cloud connection status."""
    return await proxy_to_scope("/api/v1/cloud/status")


@router.post("/scope/cloud/connect")
async def connect_to_cloud(request: CloudConnectRequest):
    """Connect to cloud for remote GPU inference.

    Credentials are optional - if not provided, the request is still sent to Scope server
    which will determine if cloud connection is available.
    """
    # Build request data - only include credentials if provided
    data = {}
    if request.app_id:
        data["app_id"] = request.app_id
    if request.api_key:
        data["api_key"] = request.api_key
    # Use provided user_id or fall back to config
    data["user_id"] = request.user_id or settings.scope_cloud_user_id

    try:
        return await proxy_to_scope("/api/v1/cloud/connect", method="POST", data=data)
    except HTTPException as e:
        # If cloud connection fails (e.g., no credentials), that's okay - continue without it
        if e.status_code == 400:
            return {
                "connected": False,
                "connecting": False,
                "webrtc_connected": False,
                "app_id": None,
                "credentials_configured": False,
                "detail": "Cloud credentials not configured - running in local mode",
            }
        raise


@router.post("/scope/cloud/disconnect")
async def disconnect_from_cloud():
    """Disconnect from cloud."""
    return await proxy_to_scope(
        "/api/v1/cloud/disconnect",
        method="POST",
    )
