"""KaleidoScope pipeline configuration."""

from __future__ import annotations

from typing import ClassVar

from pydantic import Field

from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    UsageType,
    ui_field_config,
)


class KaleidoScopeConfig(BasePipelineConfig):
    """Configuration for the kaleido-scope pipeline.
    
    Main generative pipeline
    """
    
    pipeline_id = "kaleido-scope"
    pipeline_name = "Kaleido Scope"
    pipeline_description = "GPU kaleidoscope/mirror effect"
    supports_prompts = true
    usage = []
        modes = {"video": ModeDefaults(default=True)}



