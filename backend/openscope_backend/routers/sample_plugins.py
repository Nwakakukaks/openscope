"""Sample plugins router - serves code from sample-plugins directory."""

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter()

SAMPLE_PLUGINS_DIR = Path(__file__).parent.parent / "sample-plugins"


@router.get("/plugins/{plugin_name}/pipeline.py")
async def get_plugin_pipeline(plugin_name: str) -> PlainTextResponse:
    """Get the pipeline.py code for a sample plugin."""
    plugin_dir = SAMPLE_PLUGINS_DIR / plugin_name

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_name}' not found")

    pipeline_file = plugin_dir / "src" / plugin_name.replace("-", "_") / "pipeline.py"

    if not pipeline_file.exists():
        # Try alternate path structure
        pipeline_file = plugin_dir / "src" / plugin_name / "pipeline.py"

    if not pipeline_file.exists():
        raise HTTPException(
            status_code=404, detail=f"Pipeline file not found for '{plugin_name}'"
        )

    code = pipeline_file.read_text()
    return PlainTextResponse(content=code, media_type="text/plain")


@router.get("/plugins/{plugin_name}/schema.py")
async def get_plugin_schema(plugin_name: str) -> PlainTextResponse:
    """Get the schema.py code for a sample plugin."""
    plugin_dir = SAMPLE_PLUGINS_DIR / plugin_name

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_name}' not found")

    schema_file = plugin_dir / "src" / plugin_name.replace("-", "_") / "schema.py"

    if not schema_file.exists():
        schema_file = plugin_dir / "src" / plugin_name / "schema.py"

    if not schema_file.exists():
        raise HTTPException(
            status_code=404, detail=f"Schema file not found for '{plugin_name}'"
        )

    code = schema_file.read_text()
    return PlainTextResponse(content=code, media_type="text/plain")


@router.get("/plugins/{plugin_name}/effects/{effect_name}.py")
async def get_plugin_effect(plugin_name: str, effect_name: str) -> PlainTextResponse:
    """Get an effect file from a sample plugin."""
    plugin_dir = SAMPLE_PLUGINS_DIR / plugin_name

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_name}' not found")

    effect_file = (
        plugin_dir
        / "src"
        / plugin_name.replace("-", "_")
        / "effects"
        / f"{effect_name}.py"
    )

    if not effect_file.exists():
        effect_file = plugin_dir / "src" / plugin_name / "effects" / f"{effect_name}.py"

    if not effect_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Effect '{effect_name}' not found in '{plugin_name}'",
        )

    code = effect_file.read_text()
    return PlainTextResponse(content=code, media_type="text/plain")


@router.get("/plugins/{plugin_name}/pyproject.toml")
async def get_plugin_pyproject(plugin_name: str) -> PlainTextResponse:
    """Get the pyproject.toml for a sample plugin."""
    plugin_dir = SAMPLE_PLUGINS_DIR / plugin_name

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_name}' not found")

    pyproject_file = plugin_dir / "pyproject.toml"

    if not pyproject_file.exists():
        raise HTTPException(
            status_code=404, detail=f"pyproject.toml not found for '{plugin_name}'"
        )

    code = pyproject_file.read_text()
    return PlainTextResponse(content=code, media_type="text/plain")


@router.get("/plugins")
async def list_plugins():
    """List all available sample plugins."""
    if not SAMPLE_PLUGINS_DIR.exists():
        return {"plugins": []}

    plugins = []
    for item in SAMPLE_PLUGINS_DIR.iterdir():
        if item.is_dir() and not item.name.startswith("."):
            plugins.append(item.name)

    return {"plugins": plugins}
