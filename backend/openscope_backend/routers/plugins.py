"""Plugin management router - handles installing/uninstalling Scope plugins."""

import httpx
from fastapi import APIRouter, HTTPException

from pydantic import BaseModel

router = APIRouter()

SCOPE_API_URL = "http://localhost:8000"


class InstallPluginRequest(BaseModel):
    package: str


class PluginInfo(BaseModel):
    name: str
    version: str | None = None
    pipelines: list = []


class PluginListResponse(BaseModel):
    plugins: list[PluginInfo]
    total: int


@router.get("/plugins", response_model=PluginListResponse)
async def list_plugins():
    """List all installed plugins from Scope server."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{SCOPE_API_URL}/api/v1/plugins")
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, detail="Failed to fetch plugins"
                )
            data = response.json()

            plugins = []
            for p in data.get("plugins", []):
                pipelines = [pl["pipeline_id"] for pl in p.get("pipelines", [])]
                plugins.append(
                    PluginInfo(
                        name=p["name"],
                        version=p.get("version"),
                        pipelines=pipelines,
                    )
                )

            return PluginListResponse(plugins=plugins, total=data.get("total", 0))
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Scope server not available")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/plugins")
async def install_plugin(request: InstallPluginRequest):
    """Install a plugin on the Scope server."""
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{SCOPE_API_URL}/api/v1/plugins",
                json={"package": request.package},
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to install plugin: {response.text}",
                )
            return response.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Scope server not available")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/plugins/{plugin_name}")
async def uninstall_plugin(plugin_name: str):
    """Uninstall a plugin from the Scope server."""
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.delete(
                f"{SCOPE_API_URL}/api/v1/plugins/{plugin_name}"
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to uninstall plugin: {response.text}",
                )
            return response.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Scope server not available")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# Map of processor types to their GitHub package URLs
PLUGIN_PACKAGES = {
    "kaleidoscope": "git+https://github.com/sharkymarky/kaleido-scope",
    "yoloMask": "git+https://github.com/daydreamlive/scope_yolo_mask",
    "bloom": "git+https://github.com/jamesdawsonWD/scope-bloom",
    "cosmicVFX": "git+https://github.com/theCosmicCrafter/scope-cosmic-vfx",
    "vfxPack": "git+https://github.com/viborc/scope-vfx",
}

# Map of processor types to their pipeline IDs in Scope
PLUGIN_PIPELINES = {
    "kaleidoscope": "kaleido-scope-pre",
    "yoloMask": "yolo-mask",
    "bloom": "bloom",
    "cosmicVFX": "cosmic-vfx",
    "vfxPack": "vfx-pack",
}


@router.get("/plugins/check/{processor_type}")
async def check_plugin(processor_type: str):
    """Check if the required plugin is installed for a processor type."""
    if processor_type not in PLUGIN_PACKAGES:
        raise HTTPException(
            status_code=400, detail=f"Unknown processor type: {processor_type}"
        )

    required_pipeline = PLUGIN_PIPELINES[processor_type]

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{SCOPE_API_URL}/api/v1/plugins")
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, detail="Failed to fetch plugins"
                )

            data = response.json()
            for plugin in data.get("plugins", []):
                for pipeline in plugin.get("pipelines", []):
                    if pipeline["pipeline_id"] == required_pipeline:
                        return {
                            "installed": True,
                            "plugin_name": plugin["name"],
                            "pipeline_id": required_pipeline,
                        }

            return {
                "installed": False,
                "plugin_name": None,
                "pipeline_id": required_pipeline,
                "package_url": PLUGIN_PACKAGES[processor_type],
            }
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Scope server not available")


@router.post("/plugins/install/{processor_type}")
async def install_processor_plugin(processor_type: str):
    """Install the required plugin for a processor type if not already installed."""
    if processor_type not in PLUGIN_PACKAGES:
        raise HTTPException(
            status_code=400, detail=f"Unknown processor type: {processor_type}"
        )

    required_pipeline = PLUGIN_PIPELINES[processor_type]
    package_url = PLUGIN_PACKAGES[processor_type]

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            # First check if already installed
            response = await client.get(f"{SCOPE_API_URL}/api/v1/plugins")
            if response.status_code == 200:
                data = response.json()
                for plugin in data.get("plugins", []):
                    for pipeline in plugin.get("pipelines", []):
                        if pipeline["pipeline_id"] == required_pipeline:
                            return {
                                "installed": True,
                                "message": f"Plugin already installed for {processor_type}",
                                "pipeline_id": required_pipeline,
                            }

            # Install the plugin
            install_response = await client.post(
                f"{SCOPE_API_URL}/api/v1/plugins",
                json={"package": package_url},
            )

            if install_response.status_code != 200:
                raise HTTPException(
                    status_code=install_response.status_code,
                    detail=f"Failed to install plugin: {install_response.text}",
                )

            return {
                "installed": True,
                "message": f"Successfully installed plugin for {processor_type}",
                "pipeline_id": required_pipeline,
            }
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Scope server not available")
