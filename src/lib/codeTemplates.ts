export const generatePluginConfigCode = (config: Record<string, unknown>): string => {
  const pipelineId = String(config.pipelineId || "my-plugin");
  const pluginName = String(config.pluginName || "My Plugin");
  const pluginDescription = String(config.pluginDescription || "A custom Scope plugin for video processing");
  const usage = String(config.usage || "main");
  const mode = String(config.mode || "video");
  const supportsPrompts = config.supportsPrompts !== false;

  const usageType = usage === "all" 
    ? "[UsageType.MAIN, UsageType.PREPROCESSOR, UsageType.POSTPROCESSOR]" 
    : usage === "preprocessor" 
      ? "[UsageType.PREPROCESSOR]" 
      : usage === "postprocessor" 
        ? "[UsageType.POSTPROCESSOR]" 
        : "[]";

  const modesConfig = mode === "text"
    ? `    modes = {"text": ModeDefaults(default=True)}`
    : mode === "all"
      ? `    modes = {
        "video": ModeDefaults(default=True),
        "text": ModeDefaults(),
    }`
      : `    modes = {"video": ModeDefaults(default=True)}`;

  return `"""Configuration schema for ${pluginName}."""

from pydantic import Field

from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    UsageType,
    ui_field_config,
)


class ${toPascalCase(pipelineId)}Config(BasePipelineConfig):
    """Configuration for ${pluginName}.
    
    ${pluginDescription}
    """

    pipeline_id = "${pipelineId}"
    pipeline_name = "${pluginName}"
    pipeline_description = "${pluginDescription}"

    usage = ${usageType}

${modesConfig}

    supports_prompts = ${supportsPrompts}
    supports_lora = False
    supports_vace = False

    # Add your custom parameters below
    # Example:
    # intensity: float = Field(
    #     default=0.8,
    #     ge=0.0,
    #     le=1.0,
    #     description="Effect intensity",
    #     json_schema_extra=ui_field_config(order=1),
    # )
`;
};

export const generatePipelineCode = (config: Record<string, unknown>, usage?: string, styleNodes?: Array<{type: string, config: Record<string, unknown>}>): string => {
  const pipelineId = String(config.pipelineId || "my-pipeline");
  const pipelineName = String(config.pipelineName || "My Pipeline");
  const pipelineDescription = String(config.pipelineDescription || "Custom video processing pipeline");
  
  const isPreprocessor = usage === "preprocessor";
  const isPostprocessor = usage === "postprocessor";

  if (isPreprocessor) {
    return generatePreprocessorCode(config, styleNodes);
  }
  
  if (isPostprocessor) {
    return generatePostprocessorCode(config, styleNodes);
  }

  const effectImports = styleNodes && styleNodes.length > 0 
    ? styleNodes.map(s => {
        const effectName = getEffectFunctionName(s.type, s.config);
        return `from .effects import ${effectName}`;
      }).join("\n")
    : "# from .effects import your_effect";

  const effectChain = styleNodes && styleNodes.length > 0
    ? styleNodes.map(s => {
        const effectName = getEffectFunctionName(s.type, s.config);
        return `        # Apply ${effectName}\n        frames = ${effectName}(frames, **kwargs)`;
      }).join("\n\n")
    : `        # Apply your effect\n        # frames = your_effect(frames, **kwargs)\n        processed = frames`;

  return `"""${pipelineName} - Main video processing pipeline."""

from typing import TYPE_CHECKING

import torch

from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class ${toPascalCase(pipelineId)}Pipeline(Pipeline):
    """${pipelineDescription}"""

    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        from .schema import ${toPascalCase(pipelineId)}Config
        return ${toPascalCase(pipelineId)}Config

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def prepare(self, **kwargs) -> Requirements | None:
        video = kwargs.get("video", False)
        if video:
            return Requirements(input_size=1)
        return None

    def __call__(self, **kwargs) -> dict:
        """Process video frames and return results."""
        video = kwargs.get("video")
        if video is None:
            raise ValueError("Video input required for this pipeline")

        # Stack frames into tensor: (T, H, W, C) in [0, 255] range
        frames = torch.stack([frame.squeeze(0) for frame in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0

${effectImports}

${effectChain}

        return {"video": processed.clamp(0, 1).cpu() if 'processed' in dir() else frames.clamp(0, 1).cpu()}
`;
};

function getEffectFunctionName(type: string, config: Record<string, unknown>): string {
  if (type === "style_chromatic") return "chromatic_aberration";
  if (type === "style_vhs") return "vhs_retro";
  if (type === "style_bloom") return "bloom_effect";
  if (type === "style_glitch") return "glitch_effect";
  if (type === "style_kaleidoscope") return "kaleido_effect";
  if (type === "style_halftone") return "halftone_effect";
  return String(config.effectName || "custom_effect");
}

export const generatePreprocessorCode = (config: Record<string, unknown>, styleNodes?: Array<{type: string, config: Record<string, unknown>}>): string => {
  const pipelineId = String(config.pipelineId || "my-preprocessor");
  const pipelineName = String(config.pipelineName || "My Preprocessor");
  const pipelineDescription = String(config.pipelineDescription || "Preprocess input video before main pipeline");

  return `"""${pipelineName} - Preprocessor pipeline."""

from typing import TYPE_CHECKING

import torch
from pydantic import Field

from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, UsageType, ui_field_config
from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class ${toPascalCase(pipelineId)}PreConfig(BasePipelineConfig):
    """Configuration for ${pipelineName} preprocessor."""

    pipeline_id = "${pipelineId}"
    pipeline_name = "${pipelineName} (Pre)"
    pipeline_description = "${pipelineDescription}"
    
    usage = [UsageType.PREPROCESSOR]
    modes = {"video": ModeDefaults(default=True)}
    supports_prompts = False

    # Add parameters
    intensity: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Effect intensity",
        json_schema_extra=ui_field_config(order=1),
    )


class ${toPascalCase(pipelineId)}PrePipeline(Pipeline):
    """Preprocessor pipeline - transforms input video before main pipeline."""

    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        return ${toPascalCase(pipelineId)}PreConfig

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        video = kwargs.get("video")
        if video is None:
            raise ValueError("Input video required for preprocessor")

        frames = torch.stack([frame.squeeze(0) for frame in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0

        intensity = kwargs.get("intensity", 1.0)
        processed = frames * intensity

        return {"video": processed.clamp(0, 1).cpu()}


def register_pipelines(register):
    register(${toPascalCase(pipelineId)}PrePipeline)
`;
};

export const generatePostprocessorCode = (config: Record<string, unknown>, styleNodes?: Array<{type: string, config: Record<string, unknown>}>): string => {
  const pipelineId = String(config.pipelineId || "my-postprocessor");
  const pipelineName = String(config.pipelineName || "My Postprocessor");
  const pipelineDescription = String(config.pipelineDescription || "Postprocess output video after main pipeline");

  return `"""${pipelineName} - Postprocessor pipeline."""

from typing import TYPE_CHECKING

import torch
from pydantic import Field

from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, UsageType, ui_field_config
from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class ${toPascalCase(pipelineId)}PostConfig(BasePipelineConfig):
    """Configuration for ${pipelineName} postprocessor."""

    pipeline_id = "${pipelineId}"
    pipeline_name = "${pipelineName} (Post)"
    pipeline_description = "${pipelineDescription}"
    
    usage = [UsageType.POSTPROCESSOR]
    modes = {"video": ModeDefaults(default=True)}
    supports_prompts = False

    # Add parameters
    intensity: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Effect intensity",
        json_schema_extra=ui_field_config(order=1),
    )


class ${toPascalCase(pipelineId)}PostPipeline(Pipeline):
    """Postprocessor pipeline - transforms output video after main pipeline."""

    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        return ${toPascalCase(pipelineId)}PostConfig

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        video = kwargs.get("video")
        if video is None:
            raise ValueError("Input video required for postprocessor")

        frames = torch.stack([frame.squeeze(0) for frame in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0

        intensity = kwargs.get("intensity", 1.0)
        processed = frames * intensity

        return {"video": processed.clamp(0, 1).cpu()}


def register_pipelines(register):
    register(${toPascalCase(pipelineId)}PostPipeline)
`;
};

export const generateStyleCode = (styleType: string, config: Record<string, unknown>): string => {
  switch (styleType) {
    case "style_chromatic":
      return generateChromaticEffect(config);
    case "style_vhs":
      return generateVHSEffect(config);
    case "style_bloom":
      return generateBloomEffect(config);
    case "style_glitch":
      return generateGlitchEffect(config);
    case "style_kaleidoscope":
      return generateKaleidoscopeEffect(config);
    case "style_halftone":
      return generateHalftoneEffect(config);
    case "style_custom":
    default:
      return generateCustomEffect(config);
  }
};

const generateChromaticEffect = (config: Record<string, unknown>): string => {
  const intensity = Number(config.intensity || 0.3);
  const angle = Number(config.angle || 0.0);

  return `"""Chromatic aberration effect - RGB channel displacement."""

import math

import torch


def chromatic_aberration(
    frames: torch.Tensor,
    intensity: float = ${intensity},
    angle: float = ${angle},
) -> torch.Tensor:
    """Displace RGB channels in opposite directions for a chromatic aberration look.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        intensity: Displacement strength (0-1, maps to 0-20 pixels).
        angle: Direction of displacement in degrees (0 = horizontal right).
        
    Returns:
        (T, H, W, C) tensor with displaced R and B channels.
    """
    if intensity <= 0:
        return frames

    max_shift = int(intensity * 20)
    if max_shift == 0:
        return frames

    rad = math.radians(angle)
    dx = int(round(max_shift * math.cos(rad)))
    dy = int(round(max_shift * math.sin(rad)))

    if dx == 0 and dy == 0:
        return frames

    result = frames.clone()

    # Red channel shifts one direction
    result[..., 0] = torch.roll(frames[..., 0], shifts=(dy, dx), dims=(1, 2))
    # Blue channel shifts the opposite direction
    result[..., 2] = torch.roll(frames[..., 2], shifts=(-dy, -dx), dims=(1, 2))
    # Green channel stays centred

    return result
`;
};

const generateVHSEffect = (config: Record<string, unknown>): string => {
  return `"""VHS / retro CRT effect."""

import torch


def vhs_retro(
    frames: torch.Tensor,
    scan_line_intensity: float = 0.3,
    scan_line_count: int = 100,
    noise: float = 0.1,
    tracking: float = 0.2,
) -> torch.Tensor:
    """Apply a VHS / retro CRT look.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        scan_line_intensity: Darkness of scan lines (0-1).
        scan_line_count: Number of scan lines.
        noise: Amount of analog noise/grain (0-1).
        tracking: Horizontal tracking distortion (0-1).
        
    Returns:
        Processed frames as (T, H, W, C) tensor in [0, 1] range.
    """
    T, H, W, C = frames.shape
    result = frames.clone()

    # Scan lines
    if scan_line_intensity > 0 and scan_line_count > 0:
        rows = torch.arange(H, device=frames.device, dtype=torch.float32)
        wave = torch.sin(rows * (scan_line_count * 3.14159 / H))
        mask = 1.0 - scan_line_intensity * 0.5 * (1.0 - wave)
        result = result * mask.view(1, H, 1, 1)

    # Analog noise
    if noise > 0:
        grain = torch.randn_like(result) * (noise * 0.15)
        result = result + grain

    # Tracking distortion
    if tracking > 0:
        max_shift = tracking * 0.05
        rows_norm = torch.linspace(-1.0, 1.0, H, device=frames.device)
        offsets = max_shift * torch.sin(rows_norm * 6.2832 * 3.0)

        grid_y = torch.linspace(-1.0, 1.0, H, device=frames.device)
        grid_x = torch.linspace(-1.0, 1.0, W, device=frames.device)
        gy, gx = torch.meshgrid(grid_y, grid_x, indexing="ij")

        gx = gx + offsets.view(H, 1)

        grid = torch.stack([gx, gy], dim=-1).unsqueeze(0).expand(T, -1, -1, -1)

        result_nchw = result.permute(0, 3, 1, 2)
        result_nchw = torch.nn.functional.grid_sample(
            result_nchw, grid, mode="bilinear", padding_mode="border", align_corners=True
        )
        result = result_nchw.permute(0, 2, 3, 1)

    return result.clamp(0, 1)
`;
};

const generateBloomEffect = (config: Record<string, unknown>): string => {
  return `"""Bloom/glow effect."""

import torch
import torch.nn.functional as F


def bloom_effect(
    frames: torch.Tensor,
    threshold: float = 0.8,
    intensity: float = 1.0,
    radius: int = 8,
) -> torch.Tensor:
    """Add soft glow around bright areas.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        threshold: Brightness threshold for bloom extraction (0-1).
        intensity: Bloom intensity multiplier (0-2).
        radius: Blur radius (1-48).
        
    Returns:
        Processed frames as (T, H, W, C) tensor in [0, 1] range.
    """
    # Extract bright areas
    brightness = frames.max(dim=-1, keepdim=True)[0]
    mask = (brightness > threshold).float()
    
    # Apply blur to bright areas
    blurred = F.avg_pool2d(
        frames.permute(0, 3, 1, 2),
        kernel_size=radius * 2 + 1,
        stride=1,
        padding=radius,
    )
    blurred = blurred.permute(0, 2, 3, 1)
    
    # Combine original with bloom
    result = frames + blurred * mask * intensity
    
    return result.clamp(0, 1)
`;
};

const generateGlitchEffect = (config: Record<string, unknown>): string => {
  return `"""Glitch/digital corruption effect."""

import torch


def glitch_effect(
    frames: torch.Tensor,
    intensity: float = 0.5,
    block_size: int = 16,
) -> torch.Tensor:
    """Apply digital glitch/corruption effect.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        intensity: Glitch intensity (0-1).
        block_size: Size of glitch blocks.
        
    Returns:
        Processed frames as (T, H, W, C) tensor in [0, 1] range.
    """
    if intensity <= 0:
        return frames

    T, H, W, C = frames.shape
    result = frames.clone()

    # Random block displacement
    num_glitches = int(intensity * 5)
    for _ in range(num_glitches):
        y = torch.randint(0, max(1, H - block_size), (1,)).item()
        x = torch.randint(0, max(1, W - block_size), (1,)).item()
        
        # Copy a random region
        src_y = torch.randint(0, max(1, H - block_size), (1,)).item()
        src_x = torch.randint(0, max(1, W - block_size), (1,)).item()
        
        result[:, y:y+block_size, x:x+block_size, :] = \
            frames[:, src_y:src_y+block_size, src_x:src_x+block_size, :]

    # RGB channel split
    if intensity > 0.3:
        shift = int(intensity * 10)
        result[..., 0] = torch.roll(frames[..., 0], shifts=shift, dims=2)
        result[..., 2] = torch.roll(frames[..., 2], shifts=-shift, dims=2)

    return result.clamp(0, 1)
`;
};

const generateKaleidoscopeEffect = (config: Record<string, unknown>): string => {
  return `"""Kaleidoscope/mirror symmetry effect."""

import math

import torch


def kaleido_effect(
    frames: torch.Tensor,
    slices: int = 6,
    rotation: float = 0.0,
    zoom: float = 1.0,
) -> torch.Tensor:
    """Apply kaleidoscope/mirror symmetry with rotational patterns.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        slices: Number of symmetry slices (3-12).
        rotation: Rotation angle in degrees (0-360).
        zoom: Zoom factor (0.5-2.0).
        
    Returns:
        Processed frames as (T, H, W, C) tensor in [0, 1] range.
    """
    T, H, W, C = frames.shape
    result = torch.zeros_like(frames)

    angle_step = 360.0 / slices
    rad_offset = math.radians(rotation)

    for i in range(slices):
        angle = math.radians(i * angle_step) + rad_offset
        
        # Create rotation transform
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        
        # Create coordinate grid
        grid_y = torch.linspace(-1.0, 1.0, H, device=frames.device)
        grid_x = torch.linspace(-1.0, 1.0, W, device=frames.device)
        gy, gx = torch.meshgrid(grid_y, grid_x, indexing="ij")
        
        # Apply rotation and zoom
        new_gx = (gx * cos_a - gy * sin_a) / zoom
        new_gy = (gx * sin_a + gy * cos_a) / zoom
        
        grid = torch.stack([new_gy, new_gx], dim=-1).unsqueeze(0).expand(T, -1, -1, -1)
        
        # Sample with grid
        warped = torch.nn.functional.grid_sample(
            frames.permute(0, 3, 1, 2),
            grid,
            mode="bilinear",
            padding_mode="border",
            align_corners=True,
        )
        warped = warped.permute(0, 2, 3, 1)
        
        result += warped

    return (result / slices).clamp(0, 1)
`;
};

const generateHalftoneEffect = (config: Record<string, unknown>): string => {
  return `"""Halftone/newspaper dot pattern effect."""

import torch
import torch.nn.functional as F


def halftone_effect(
    frames: torch.Tensor,
    dot_size: int = 8,
    sharpness: float = 0.7,
) -> torch.Tensor:
    """Apply halftone/newspaper dot pattern effect.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        dot_size: Size of halftone dots in pixels (4-20).
        sharpness: Edge sharpness of dots (0-1).
        
    Returns:
        Processed frames as (T, H, W, C) tensor in [0, 1] range.
    """
    T, H, W, C = frames.shape
    
    # Downsample
    small_h, small_w = max(1, H // dot_size), max(1, W // dot_size)
    
    nchw = frames.permute(0, 3, 1, 2)
    small = F.interpolate(nchw, size=(small_h, small_w), mode="area")
    
    # Apply threshold based on brightness
    brightness = small.mean(dim=1, keepdim=True)
    threshold = (brightness - 0.5) * sharpness + 0.5
    threshold = threshold.clamp(0, 1)
    
    # Upsample with nearest neighbor
    big = F.interpolate(small, size=(H, W), mode="nearest")
    
    # Create dot pattern
    result = (big > threshold).float()
    
    return result.permute(0, 2, 3, 1).clamp(0, 1).repeat(1, 1, 1, C)
`;
};

const generateCustomEffect = (config: Record<string, unknown>): string => {
  return `"""Custom effect function - modify this to create your own effect."""

import torch


def custom_effect(
    frames: torch.Tensor,
    intensity: float = 1.0,
    **kwargs,
) -> torch.Tensor:
    """Your custom effect.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range.
        intensity: Effect intensity (0-1).
        **kwargs: Additional parameters from config.
        
    Returns:
        Processed frames as (T, H, W, C) tensor in [0, 1] range.
    """
    # Add your effect logic here
    # Example: invert colors
    # processed = 1.0 - frames * intensity
    
    processed = frames
    
    return processed.clamp(0, 1)
`;
};

export const generateCustomProcessorCode = (): string => {
  return `"""Custom processor effect - for standalone custom processors."""

import torch


def custom_processor(frames: torch.Tensor, **kwargs) -> torch.Tensor:
    """Custom processor effect.
    
    Args:
        frames: Tensor of shape (T, H, W, C) in [0, 1] range
        **kwargs: Runtime parameters from config
        
    Returns:
        Processed frames as tensor of shape (T, H, W, C) in [0, 1] range
    """
    intensity = kwargs.get("intensity", 1.0)
    
    # Add your effect logic here
    processed = frames
    
    return processed.clamp(0, 1)
`;
};

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1$2')
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export const getCodeForNodeType = (
  nodeType: string,
  config: Record<string, unknown>,
  createNewKind?: string
): string => {
  const usage = config.usage as string | undefined;

  if (nodeType === "pluginConfig") {
    return generatePluginConfigCode(config);
  }

  if (nodeType.startsWith("style_")) {
    return generateStyleCode(nodeType, config);
  }

  if (nodeType === "pipeline" || nodeType.startsWith("pipeline_")) {
    if (usage === "preprocessor") {
      return generatePreprocessorCode(config);
    }
    if (usage === "postprocessor") {
      return generatePostprocessorCode(config);
    }
    return generatePipelineCode(config, usage);
  }

  if (nodeType === "custom" || nodeType.startsWith("pipeline_custom")) {
    if (createNewKind === "preprocessor" || usage === "preprocessor") {
      return generatePreprocessorCode(config);
    }
    if (createNewKind === "postprocessor" || usage === "postprocessor") {
      return generatePostprocessorCode(config);
    }
    return generateCustomProcessorCode();
  }

  return generateCustomProcessorCode();
};
