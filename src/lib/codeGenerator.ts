import { Node, Edge } from "@xyflow/react";

interface NodeData {
  label: string;
  type: string;
  config: Record<string, unknown>;
}

const EFFECT_NODES = [
  "brightness", "contrast", "blur", "mirror", "kaleido", "blend", "vignette",
  "segmentation", "depthEstimation", "backgroundRemoval",
  "colorGrading", "upscaling", "denoising", "styleTransfer", "mask"
];

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function toTitleCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => " " + c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function generateSchemaFields(nodes: any[]): string {
  const processingNodes = nodes.filter((n) => EFFECT_NODES.includes(n.data.type));

  if (processingNodes.length === 0) {
    return "";
  }

  const fields: string[] = [];
  let order = 100;

  for (const node of processingNodes) {
    const config = node.data.config;
    const type = node.data.type;

    if (type === "brightness") {
      fields.push(`
    brightness_value: float = Field(
        default=${config.value ?? 0},
        ge=-100,
        le=100,
        description="Brightness adjustment value",
        json_schema_extra=ui_field_config(order=${order++}, label="Brightness"),
    )`);
    }
    
    if (type === "contrast") {
      fields.push(`
    contrast_value: float = Field(
        default=${config.value ?? 1},
        ge=0,
        le=3,
        description="Contrast adjustment value",
        json_schema_extra=ui_field_config(order=${order++}, label="Contrast"),
    )`);
    }
    
    if (type === "blur") {
      fields.push(`
    blur_radius: int = Field(
        default=${config.radius ?? 5},
        ge=0,
        le=50,
        description="Blur radius in pixels",
        json_schema_extra=ui_field_config(order=${order++}, label="Radius"),
    )`);
    }
    
    if (type === "mirror") {
      fields.push(`
    mirror_mode: str = Field(
        default="${config.mode ?? 'horizontal'}",
        description="Mirror mode: horizontal, vertical, or both",
        json_schema_extra=ui_field_config(order=${order++}, label="Mode"),
    )`);
    }
    
    if (type === "kaleido") {
      fields.push(`
    kaleido_slices: int = Field(
        default=${config.slices ?? 6},
        ge=2,
        le=24,
        description="Number of kaleidoscope slices",
        json_schema_extra=ui_field_config(order=${order++}, label="Slices"),
    )
    kaleido_rotation: float = Field(
        default=${config.rotation ?? 0},
        ge=0,
        le=360,
        description="Rotation angle in degrees",
        json_schema_extra=ui_field_config(order=${order++}, label="Rotation"),
    )
    kaleido_zoom: float = Field(
        default=${config.zoom ?? 1},
        ge=0.1,
        le=3,
        description="Zoom factor",
        json_schema_extra=ui_field_config(order=${order++}, label="Zoom"),
    )`);
    }
    
    if (type === "vignette") {
      fields.push(`
    vignette_intensity: float = Field(
        default=${config.intensity ?? 0.5},
        ge=0,
        le=1,
        description="Vignette edge darkening intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Intensity"),
    )
    vignette_smoothness: float = Field(
        default=${config.smoothness ?? 0.5},
        ge=0,
        le=1,
        description="Vignette falloff smoothness",
        json_schema_extra=ui_field_config(order=${order++}, label="Smoothness"),
    )`);
    }
    
    if (type === "blend") {
      fields.push(`
    blend_mode: str = Field(
        default="${config.mode ?? 'add'}",
        description="Blend mode: add, multiply, screen, overlay",
        json_schema_extra=ui_field_config(order=${order++}, label="Mode"),
    )
    blend_opacity: float = Field(
        default=${config.opacity ?? 0.5},
        ge=0,
        le=1,
        description="Blend opacity",
        json_schema_extra=ui_field_config(order=${order++}, label="Opacity"),
    )`);
    }
    
    if (type === "mask" || type === "segmentation") {
      fields.push(`
    target_class: str = Field(
        default="${config.targetClass ?? config.target_class ?? 'person'}",
        description="Target object class for segmentation",
        json_schema_extra=ui_field_config(order=${order++}, label="Target Class"),
    )
    confidence_threshold: float = Field(
        default=${config.confidence ?? 0.5},
        ge=0,
        le=1,
        description="Detection confidence threshold",
        json_schema_extra=ui_field_config(order=${order++}, label="Confidence"),
    )`);
    }

    if (type === "depthEstimation") {
      fields.push(`
    depth_model: str = Field(
        default="${config.model ?? 'depth-anything'}",
        description="Depth estimation model",
        json_schema_extra=ui_field_config(order=${order++}, label="Model"),
    )`);
    }

    if (type === "backgroundRemoval") {
      fields.push(`
    bg_model: str = Field(
        default="${config.model ?? 'u2net'}",
        description="Background removal model",
        json_schema_extra=ui_field_config(order=${order++}, label="Model"),
    )`);
    }

    if (type === "colorGrading") {
      fields.push(`
    color_temperature: float = Field(
        default=${config.temperature ?? 0},
        ge=-100,
        le=100,
        description="Color temperature adjustment",
        json_schema_extra=ui_field_config(order=${order++}, label="Temperature"),
    )
    color_tint: float = Field(
        default=${config.tint ?? 0},
        ge=-100,
        le=100,
        description="Green/magenta tint",
        json_schema_extra=ui_field_config(order=${order++}, label="Tint"),
    )
    color_saturation: float = Field(
        default=${config.saturation ?? 0},
        ge=-100,
        le=100,
        description="Color saturation",
        json_schema_extra=ui_field_config(order=${order++}, label="Saturation"),
    )
    color_contrast: float = Field(
        default=${config.contrast ?? 0},
        ge=-100,
        le=100,
        description="Contrast adjustment",
        json_schema_extra=ui_field_config(order=${order++}, label="Contrast"),
    )`);
    }

    if (type === "upscaling") {
      fields.push(`
    upscale_scale: int = Field(
        default=${parseInt(String(config.scale ?? 2))},
        description="Upscale factor (2 or 4)",
        json_schema_extra=ui_field_config(order=${order++}, label="Scale"),
    )
    upscale_model: str = Field(
        default="${config.model ?? 'realesrgan'}",
        description="Upscaling model",
        json_schema_extra=ui_field_config(order=${order++}, label="Model"),
    )`);
    }

    if (type === "denoising") {
      fields.push(`
    denoise_strength: float = Field(
        default=${config.strength ?? 0.5},
        ge=0,
        le=1,
        description="Denoising strength",
        json_schema_extra=ui_field_config(order=${order++}, label="Strength"),
    )
    denoise_method: str = Field(
        default="${config.method ?? 'bm3d'}",
        description="Denoising method",
        json_schema_extra=ui_field_config(order=${order++}, label="Method"),
    )`);
    }

    if (type === "styleTransfer") {
      fields.push(`
    style_type: str = Field(
        default="${config.style ?? 'anime'}",
        description="Art style for transfer",
        json_schema_extra=ui_field_config(order=${order++}, label="Style"),
    )
    style_strength: float = Field(
        default=${config.strength ?? 0.7},
        ge=0,
        le=1,
        description="Style transfer strength",
        json_schema_extra=ui_field_config(order=${order++}, label="Strength"),
    )`);
    }
  }

  return fields.join(",");
}

function generatePipelineInit(nodes: any[]): string {
  const processingNodes = nodes.filter((n) => EFFECT_NODES.includes(n.data.type));

  if (processingNodes.length === 0) {
    return `    # No processing nodes - pass-through
    video = kwargs.get("video")
    if video is None:
        raise ValueError("Input video required")
    return {"video": torch.stack([f.squeeze(0) for f in video], dim=0) / 255.0}`;
  }

  const lines: string[] = [];
  
  for (const node of processingNodes) {
    const config = node.data.config;
    const type = node.data.type;
    
    if (type === "brightness") {
      lines.push(`    # Brightness adjustment
    brightness_value = float(kwargs.get("brightness_value", ${config.value ?? 0}))
    if brightness_value != 0:
        brightness_factor = 1.0 + brightness_value / 100.0
        video = [torch.clamp(v * brightness_factor, 0, 1) for v in video]`);
    }
    
    if (type === "contrast") {
      lines.push(`    # Contrast adjustment
    contrast_value = float(kwargs.get("contrast_value", ${config.value ?? 1}))
    if contrast_value != 1:
        mean = video[0].float().mean()
        video = [torch.clamp((v.float() - mean) * contrast_value + mean, 0, 1) for v in video]`);
    }
    
    if (type === "blur") {
      lines.push(`    # Gaussian blur
    blur_radius = int(kwargs.get("blur_radius", ${config.radius ?? 5}))
    if blur_radius > 0:
        from torch.nn import functional as F
        kernel_size = blur_radius * 2 + 1
        video = [F.avg_pool2d(v.permute(2, 0, 1).unsqueeze(0), kernel_size, stride=1, padding=blur_radius).squeeze(0).permute(1, 2, 0) for v in video]`);
    }
    
    if (type === "mirror") {
      lines.push(`    # Mirror effect
    mirror_mode = kwargs.get("mirror_mode", "${config.mode ?? 'horizontal'}")
    for i, v in enumerate(video):
        if mirror_mode in ("horizontal", "both"):
            v = torch.flip(v, dims=[1])
        if mirror_mode in ("vertical", "both"):
            v = torch.flip(v, dims=[0])
        video[i] = v`);
    }
    
    if (type === "kaleido") {
      lines.push(`    # Kaleidoscope effect
    kaleido_slices = int(kwargs.get("kaleido_slices", ${config.slices ?? 6}))
    kaleido_rotation = float(kwargs.get("kaleido_rotation", ${config.rotation ?? 0}))
    kaleido_zoom = float(kwargs.get("kaleido_zoom", ${config.zoom ?? 1}))
    video = _apply_kaleido(video, slices=kaleido_slices, rotation=kaleido_rotation, zoom=kaleido_zoom)`);
    }

    if (type === "vignette") {
      lines.push(`    # Vignette effect
    intensity = float(kwargs.get("vignette_intensity", ${config.intensity ?? 0.5}))
    smoothness = float(kwargs.get("vignette_smoothness", ${config.smoothness ?? 0.5}))
    video = _apply_vignette(video, intensity=intensity, smoothness=smoothness)`);
    }
    
    if (type === "blend") {
      lines.push(`    # Blend effect
    blend_mode = kwargs.get("blend_mode", "${config.mode ?? 'add'}")
    blend_opacity = float(kwargs.get("blend_opacity", ${config.opacity ?? 0.5}))
    original = kwargs.get("video")
    if original and len(original) == len(video):
        for i in range(len(video)):
            video[i] = video[i] * blend_opacity + original[i] * (1 - blend_opacity)`);
    }
    
    if (type === "mask" || type === "segmentation") {
      lines.push(`    # Segmentation / Mask generation
    target_class = kwargs.get("target_class", "${config.targetClass ?? config.target_class ?? 'person'}")
    confidence_threshold = float(kwargs.get("confidence_threshold", ${config.confidence ?? 0.5}))`);
    }

    if (type === "depthEstimation") {
      lines.push(`    # Depth estimation
    depth_model = kwargs.get("depth_model", "${config.model ?? 'depth-anything'}")`);
    }

    if (type === "backgroundRemoval") {
      lines.push(`    # Background removal
    bg_model = kwargs.get("bg_model", "${config.model ?? 'u2net'}")
    for i, v in enumerate(video):
        alpha = torch.ones((v.shape[0], v.shape[1]), device=v.device)
        video[i] = torch.cat([v[..., :3], alpha.unsqueeze(-1)], dim=-1)`);
    }

    if (type === "colorGrading") {
      lines.push(`    # Color grading
    temperature = float(kwargs.get("color_temperature", ${config.temperature ?? 0}))
    tint = float(kwargs.get("color_tint", ${config.tint ?? 0}))
    saturation = float(kwargs.get("color_saturation", ${config.saturation ?? 0}))
    contrast = float(kwargs.get("color_contrast", ${config.contrast ?? 0}))
    video = _apply_color_grading(video, temperature=temperature/100, tint=tint/100, 
                                   saturation=1+saturation/100, contrast=1+contrast/100)`);
    }

    if (type === "upscaling") {
      lines.push(`    # Upscaling
    scale = int(kwargs.get("upscale_scale", ${parseInt(String(config.scale ?? 2))}))
    from torch.nn import functional as F
    video = [F.interpolate(v.permute(2, 0, 1).unsqueeze(0), scale_factor=scale, mode='bicubic').squeeze(0).permute(1, 2, 0) for v in video]`);
    }

    if (type === "denoising") {
      lines.push(`    # Denoising
    strength = float(kwargs.get("denoise_strength", ${config.strength ?? 0.5}))
    method = kwargs.get("denoise_method", "${config.method ?? 'bm3d'}")`);
    }

    if (type === "styleTransfer") {
      lines.push(`    # Style transfer
    style_type = kwargs.get("style_type", "${config.style ?? 'anime'}")
    strength = float(kwargs.get("style_strength", ${config.strength ?? 0.7}))`);
    }
  }

  return lines.join("\n\n");
}

export function generatePlugin(nodes: any[], edges: any[]): string {
  const configNode = nodes.find((n) => n.data.type === "pluginConfig");
  
  const pluginId = (configNode?.data?.config?.pipelineId as string) || "my_plugin";
  const pluginName = (configNode?.data?.config?.pipelineName as string) || toTitleCase(pluginId);
  const pluginDescription = (configNode?.data?.config?.pipelineDescription as string) || "Generated by OpenScope";
  const usage = (configNode?.data?.config?.usage as string) || "main";
  const mode = (configNode?.data?.config?.mode as string) || "video";
  const supportsPrompts = configNode?.data?.config?.supportsPrompts !== false;

  const schemaFields = generateSchemaFields(nodes);
  const pipelineInit = generatePipelineInit(nodes);
  
  let modesConfig = "";
  if (mode === "video") {
    modesConfig = `    modes = {"video": ModeDefaults(default=True)}`;
  } else if (mode === "text") {
    modesConfig = `    modes = {"text": ModeDefaults(default=True)}`;
  } else if (mode === "image") {
    modesConfig = `    modes = {"image": ModeDefaults(default=True)}`;
  } else {
    modesConfig = `    modes = {"text": ModeDefaults(default=True), "video": ModeDefaults(default=False)}`;
  }

  let usageType: string;
  let usageComment = "";
  if (usage === "preprocessor") {
    usageType = "[UsageType.PREPROCESSOR]";
    usageComment = "This pipeline runs before the main generative model";
  } else if (usage === "postprocessor") {
    usageType = "[UsageType.POSTPROCESSOR]";
    usageComment = "This pipeline runs after the main generative model";
  } else if (usage === "all") {
    usageType = "[UsageType.PREPROCESSOR, UsageType.POSTPROCESSOR]";
    usageComment = "This pipeline can run as both preprocessor and postprocessor";
  } else {
    usageType = "[]";
    usageComment = "Main generative pipeline";
  }

  return `"""${pluginId} - Generated by OpenScope"""

from typing import TYPE_CHECKING

import torch

from scope.core.pipelines.interface import Pipeline, Requirements
from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    UsageType,
    ui_field_config,
)

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class ${toPascalCase(pluginId)}Config(BasePipelineConfig):
    """Configuration for the ${pluginId} pipeline.
    
    ${usageComment}
    """
    
    pipeline_id = "${pluginId}"
    pipeline_name = "${pluginName}"
    pipeline_description = "${pluginDescription}"
    supports_prompts = ${supportsPrompts}
    usage = ${usageType}
    ${modesConfig}${schemaFields}


class ${toPascalCase(pluginId)}Pipeline(Pipeline):
    """Pipeline generated from OpenScope node graph."""
    
    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        return ${toPascalCase(pluginId)}Config

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device if device is not None else torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        video = kwargs.get("video")
        if video is None:
            raise ValueError("${pluginId} requires video input")

        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        video = [frames[i] for i in range(frames.shape[0])]

${pipelineInit}

        out = torch.stack(video, dim=0)
        return {"video": out.clamp(0, 1)}


def _apply_kaleido(video, slices=6, rotation=0, zoom=1.0):
    import math
    import torch.nn.functional as F
    
    H = video[0].shape[1]
    W = video[0].shape[2]
    device = video[0].device
    
    grid_y = torch.linspace(-1, 1, H, device=device)
    grid_x = torch.linspace(-1, 1, W, device=device)
    gy, gx = torch.meshgrid(grid_y, grid_x, indexing='ij')
    
    if zoom != 1.0:
        gx = gx / zoom
        gy = gy / zoom
    
    if slices >= 2:
        r = torch.sqrt(gx * gx + gy * gy + 1e-8)
        theta = torch.atan2(gy, gx)
        theta = theta + math.radians(rotation)
        wedge = 2 * math.pi / slices
        phi = torch.remainder(theta, wedge)
        phi = torch.minimum(phi, wedge - phi)
        gx = r * torch.cos(phi)
        gy = r * torch.sin(phi)
    
    gx = gx.clamp(-1, 1)
    gy = gy.clamp(-1, 1)
    grid = torch.stack((gx, gy), dim=-1).unsqueeze(0)
    
    result = []
    for frame in video:
        frame = frame.float() / 255.0 if frame.max() > 1 else frame.float()
        nchw = frame.permute(0, 3, 1, 2)
        sampled = F.grid_sample(nchw, grid, mode='bilinear', padding_mode='border', align_corners=True)
        out = sampled.permute(0, 2, 3, 1)
        result.append(out)
    return result


def _apply_vignette(video, intensity=0.5, smoothness=0.5):
    result = []
    for frame in video:
        H, W = frame.shape[1], frame.shape[2]
        grid_y = torch.linspace(-1, 1, H, device=frame.device)
        grid_x = torch.linspace(-1, 1, W, device=frame.device)
        gy, gx = torch.meshgrid(grid_y, grid_x, indexing='ij')
        dist = torch.sqrt(gx * gx + gy * gy)
        vignette = torch.clamp((dist - 0.3) / (1 - smoothness + 0.01), 0, 1)
        vignette = 1 - vignette * intensity
        frame = frame * vignette.view(1, H, W, 1)
        result.append(frame)
    return result


def _apply_color_grading(video, temperature=0, tint=0, saturation=1, contrast=1):
    result = []
    for frame in video:
        if temperature != 0:
            if temperature > 0:
                frame[..., 0] = frame[..., 0] * (1 + temperature * 0.1)
                frame[..., 2] = frame[..., 2] * (1 - temperature * 0.1)
            else:
                frame[..., 0] = frame[..., 0] * (1 + temperature * 0.1)
                frame[..., 2] = frame[..., 2] * (1 - temperature * 0.1)
        if tint != 0:
            frame[..., 1] = frame[..., 1] * (1 - tint * 0.1)
        if saturation != 1:
            gray = frame.mean(dim=-1, keepdim=True)
            frame = gray + (frame - gray) * saturation
        if contrast != 1:
            mean = frame.mean()
            frame = mean + (frame - mean) * contrast
        result.append(torch.clamp(frame, 0, 1))
    return result
`;
}

export function generatePluginFiles(nodes: any[], edges: any[]): Record<string, string> {
  const configNode = nodes.find((n) => n.data.type === "pluginConfig");
  const pluginId = ((configNode?.data?.config?.pipelineId as string) || "my-plugin").replace(/[^a-z0-9-]/g, "-").toLowerCase();
  const pascalName = toPascalCase(pluginId);
  
  const pluginCode = generatePlugin(nodes, edges);
  const srcDir = pascalName.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, '');
  
  return {
    "pyproject.toml": `[project]
name = "${pluginId}"
version = "0.1.0"
description = "Generated by OpenScope"
requires-python = ">=3.11"

[project.entry-points."scope"]
${pluginId.replace(/-/g, "_")} = "${pascalName}"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/${srcDir}"]
`,
    [`src/${srcDir}/__init__.py`]: `"""${pascalName} Plugin - Generated by OpenScope."""

from scope.core.plugins.hookspecs import hookimpl


@hookimpl
def register_pipelines(register):
    from .pipeline import ${pascalName}Pipeline
    register(${pascalName}Pipeline)
`,
    [`src/${srcDir}/pipeline.py`]: pluginCode,
  };
}
