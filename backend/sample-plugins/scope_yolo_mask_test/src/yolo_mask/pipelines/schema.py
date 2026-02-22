"""YoloMask pipeline configuration."""

from __future__ import annotations

from typing import ClassVar

from pydantic import Field

from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    UsageType,
    ui_field_config,
)


class YoloMaskConfig(BasePipelineConfig):
    """Configuration for the yolo_mask pipeline.
    
    Main generative pipeline
    """
    
    pipeline_id = "yolo_mask"
    pipeline_name = "YOLO Mask"
    pipeline_description = "YOLO26 segmentation for VACE inpainting"
    supports_prompts = true
    usage = []
        modes = {"video": ModeDefaults(default=True)}



