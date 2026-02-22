import { Node, Edge } from "@xyflow/react";

interface NodeData {
  label: string;
  type: string;
  config: Record<string, unknown>;
}

const EFFECT_NODES = [
  "brightness", "contrast", "blur", "mirror", "kaleido", "kaleidoscope", "blend", "vignette",
  "segmentation", "depthEstimation", "backgroundRemoval", "yoloMask",
  "colorGrading", "upscaling", "denoising", "styleTransfer", "mask",
  "chromatic", "vhs", "halftone", "bloom", "cosmicVFX", "vfxPack",
  "pipeline_kaleido-scope", "pipeline_yolo_mask", "pipeline_bloom", "pipeline_cosmic-vfx", "pipeline_vfx-pack",
  "pipeline_customPreprocessor", "pipeline_customPostprocessor",
  "custom" // User-defined custom effects
];

const PIPELINE_EFFECT_IDS = [
  "kaleido-scope", "yolo_mask", "bloom", "cosmic-vfx", "vfx-pack", "customPreprocessor", "customPostprocessor"
];

// Sample plugin code for export - KaleidoScope example
const SAMPLE_PLUGIN: Record<string, { pipeline: string; schema: string }> = {};

function getSampleCode(pipelineId: string) {
  if (pipelineId === "kaleido-scope") {
    return {
      pipeline: `"""KaleidoScope - GPU kaleidoscope/mirror effect"""
from typing import TYPE_CHECKING
import torch
from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


def kaleido_effect(frames, enabled=True, mix=1.0, mirror_mode="none", rotational_enabled=True, rotational_slices=6, rotation_deg=0.0, zoom=1.0, warp=0.0):
    import math
    import torch.nn.functional as F
    
    if not enabled:
        return frames
    
    T, H, W, C = frames.shape
    device = frames.device
    
    grid_y = torch.linspace(-1, 1, H, device=device)
    grid_x = torch.linspace(-1, 1, W, device=device)
    gy, gx = torch.meshgrid(grid_y, grid_x, indexing='ij')
    
    if warp != 0:
        r = torch.sqrt(gx * gx + gy * gy + 1e-8)
        theta = torch.atan2(gy, gx)
        r = r + warp * r * r
        gx = r * torch.cos(theta)
        gy = r * torch.sin(theta)
    
    if zoom != 1.0:
        gx = gx / zoom
        gy = gy / zoom
    
    if mirror_mode == "2x":
        gx = torch.abs(gx)
    elif mirror_mode == "4x":
        gx = torch.abs(gx)
        gy = torch.abs(gy)
    
    if rotational_enabled and rotational_slices >= 2:
        r = torch.sqrt(gx * gx + gy * gy + 1e-8)
        theta = torch.atan2(gy, gx)
        theta = theta + math.radians(rotation_deg)
        wedge = 2 * math.pi / rotational_slices
        phi = torch.remainder(theta, wedge)
        phi = torch.minimum(phi, wedge - phi)
        gx = r * torch.cos(phi)
        gy = r * torch.sin(phi)
    
    gx = gx.clamp(-1, 1)
    gy = gy.clamp(-1, 1)
    grid = torch.stack([gx, gy], dim=-1)
    grid = grid.unsqueeze(0).unsqueeze(0).expand(T, -1, -1, -1)
    
    frames_nchw = frames.permute(0, 3, 1, 2)
    sampled = F.grid_sample(frames_nchw, grid, mode='bilinear', padding_mode='border', align_corners=True)
    result = sampled.permute(0, 2, 3, 1)
    
    if mix < 1.0:
        result = frames * (1 - mix) + result * mix
    
    return result.clamp(0, 1)


class KaleidoScopePipeline(Pipeline):
    @classmethod
    def get_config_class(cls):
        from .schema import KaleidoScopeConfig
        return KaleidoScopeConfig

    def __init__(self, device=None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def prepare(self, **kwargs):
        return Requirements(input_size=1)

    def __call__(self, **kwargs):
        video = kwargs.get("video")
        if video is None:
            raise ValueError("KaleidoScope requires video input")
        
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        
        out = kaleido_effect(
            frames=frames,
            enabled=kwargs.get("enabled", True),
            mix=kwargs.get("mix", 1.0),
            mirror_mode=kwargs.get("mirror_mode", "none"),
            rotational_enabled=kwargs.get("rotational_enabled", True),
            rotational_slices=kwargs.get("rotational_slices", 6),
            rotation_deg=kwargs.get("rotation_deg", 0.0),
            zoom=kwargs.get("zoom", 1.0),
            warp=kwargs.get("warp", 0.0),
        )
        return {"video": out.clamp(0, 1)}


def register(register_fn):
    register_fn(KaleidoScopePipeline)
`,
      schema: `"""KaleidoScope Config Schema"""
from pydantic import Field
from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, ui_field_config


class KaleidoScopeConfig(BasePipelineConfig):
    pipeline_id = "kaleido-scope"
    pipeline_name = "Kaleido Scope"
    pipeline_description = "GPU kaleidoscope/mirror effect - 2x/4x, N-fold symmetry, rotation, zoom, warp"
    supports_prompts = False
    modes = {"video": ModeDefaults(default=True)}
    usage = []
    
    enabled: bool = Field(
        default=True,
        description="Enable kaleidoscope effect",
        json_schema_extra=ui_field_config(order=1, label="Enabled"),
    )
    mix: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Blend original (0) to fully effected (1)",
        json_schema_extra=ui_field_config(order=2, label="Mix"),
    )
    mirror_mode: str = Field(
        default="none",
        description="Mirror symmetry mode: none, 2x, 4x",
        json_schema_extra=ui_field_config(order=3, label="Mirror Mode"),
    )
    rotational_enabled: bool = Field(
        default=True,
        description="Enable N-fold rotational symmetry",
        json_schema_extra=ui_field_config(order=4, label="Rotational Symmetry"),
    )
    rotational_slices: int = Field(
        default=6,
        ge=3,
        le=12,
        description="Number of symmetry slices (N)",
        json_schema_extra=ui_field_config(order=5, label="Slices"),
    )
    rotation_deg: float = Field(
        default=0.0,
        ge=0.0,
        le=360.0,
        description="Rotate pattern (degrees)",
        json_schema_extra=ui_field_config(order=6, label="Rotation"),
    )
    zoom: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Zoom into source before symmetry",
        json_schema_extra=ui_field_config(order=7, label="Zoom"),
    )
    warp: float = Field(
        default=0.0,
        ge=-0.5,
        le=0.5,
        description="Radial warp amount",
        json_schema_extra=ui_field_config(order=8, label="Warp"),
    )
`,
    };
  }
  return undefined;
}

const KALEIDO_HELPER = `def _apply_kaleido(video, slices=6, rotation=0, zoom=1.0):
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
    return result`;

const KALEIDOSCOPE_HELPER = `def _apply_kaleidoscope(frames, enabled=True, mix=1.0, mirror_mode="none", rotational_enabled=True, rotational_slices=6, rotation_deg=0.0, zoom=1.0, warp=0.0):
    import math
    import torch.nn.functional as F
    
    if not enabled:
        return frames
    
    T, H, W, C = frames.shape
    device = frames.device
    
    grid_y = torch.linspace(-1, 1, H, device=device)
    grid_x = torch.linspace(-1, 1, W, device=device)
    gy, gx = torch.meshgrid(grid_y, grid_x, indexing='ij')
    
    if warp != 0:
        r = torch.sqrt(gx * gx + gy * gy + 1e-8)
        theta = torch.atan2(gy, gx)
        r = r + warp * r * r
        gx = r * torch.cos(theta)
        gy = r * torch.sin(theta)
    
    if zoom != 1.0:
        gx = gx / zoom
        gy = gy / zoom
    
    if mirror_mode == "2x":
        gx = torch.abs(gx)
    elif mirror_mode == "4x":
        gx = torch.abs(gx)
        gy = torch.abs(gy)
    elif mirror_mode == "kaleido6":
        pass
    
    if rotational_enabled and rotational_slices >= 2:
        r = torch.sqrt(gx * gx + gy * gy + 1e-8)
        theta = torch.atan2(gy, gx)
        theta = theta + math.radians(rotation_deg)
        wedge = 2 * math.pi / rotational_slices
        phi = torch.remainder(theta, wedge)
        phi = torch.minimum(phi, wedge - phi)
        gx = r * torch.cos(phi)
        gy = r * torch.sin(phi)
    
    gx = gx.clamp(-1, 1)
    gy = gy.clamp(-1, 1)
    grid = torch.stack([gx, gy], dim=-1)
    grid = grid.unsqueeze(0).unsqueeze(0).expand(T, -1, -1, -1)
    
    frames_nchw = frames.permute(0, 3, 1, 2)
    sampled = F.grid_sample(frames_nchw, grid, mode='bilinear', padding_mode='border', align_corners=True)
    result = sampled.permute(0, 2, 3, 1)
    
    if mix < 1.0:
        result = frames * (1 - mix) + result * mix
    
    return result.clamp(0, 1)`;

const VIGNETTE_HELPER = `def _apply_vignette(video, intensity=0.5, smoothness=0.5):
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
    return result`;

const COLOR_GRADING_HELPER = `def _apply_color_grading(video, temperature=0, tint=0, saturation=1, contrast=1):
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
    return result`;

const CHROMATIC_HELPER = `def _apply_chromatic(frames, intensity=0.3, angle=0.0):
    import math
    
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
    result[..., 0] = torch.roll(frames[..., 0], shifts=(dy, dx), dims=(1, 2))
    result[..., 2] = torch.roll(frames[..., 2], shifts=(-dy, -dx), dims=(1, 2))
    
    return result`;

const VHS_HELPER = `def _apply_vhs(frames, scan_line_intensity=0.3, scan_line_count=100, noise=0.1, tracking=0.2):
    import torch.nn.functional as F
    
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
        
        grid = torch.stack([gx, gy], dim=-1)
        grid = grid.unsqueeze(0).expand(result.shape[0], -1, -1, -1)
        
        result_nchw = result.permute(0, 3, 1, 2)
        result_nchw = F.grid_sample(result_nchw, grid, mode="bilinear", padding_mode="border", align_corners=True)
        result = result_nchw.permute(0, 2, 3, 1)
    
    return result.clamp(0, 1)`;

const HALFTONE_HELPER = `def _apply_halftone(frames, dot_size=8, sharpness=0.7):
    import torch.nn.functional as F
    
    if dot_size < 2:
        return frames
    
    T, H, W, C = frames.shape
    device = frames.device
    cell = int(dot_size)
    
    # Luminance
    luma = 0.299 * frames[..., 0] + 0.587 * frames[..., 1] + 0.114 * frames[..., 2]
    
    # Cell-averaged luminance
    pad_h = (cell - H % cell) % cell
    pad_w = (cell - W % cell) % cell
    luma_4d = luma.unsqueeze(1)
    luma_padded = F.pad(luma_4d, (0, pad_w, 0, pad_h), mode="reflect")
    cell_luma = F.avg_pool2d(luma_padded, cell, cell)
    cell_luma = F.interpolate(cell_luma, size=(H + pad_h, W + pad_w), mode="nearest")
    cell_luma = cell_luma[:, 0, :H, :W]
    
    # Distance from cell centre
    y = torch.arange(H, device=device, dtype=torch.float32)
    x = torch.arange(W, device=device, dtype=torch.float32)
    gy, gx = torch.meshgrid(y, x, indexing="ij")
    
    local_y = (gy % cell) - (cell - 1) / 2.0
    local_x = (gx % cell) - (cell - 1) / 2.0
    dist = torch.sqrt(local_x * local_x + local_y * local_y)
    
    # Dot radius
    max_r = cell / 2.0
    dot_r = max_r * torch.sqrt((1.0 - cell_luma).clamp(0, 1))
    
    # Soft-edge mask
    edge = max(0.3, (1.0 - sharpness) * max_r)
    mask = torch.sigmoid((dot_r - dist.unsqueeze(0)) / edge * 6.0)
    
    # Composite
    mask = mask.unsqueeze(-1)
    result = frames * mask + (1.0 - mask)
    
    return result`;

const BLOOM_HELPER = `def _apply_bloom(frames, threshold=0.8, soft_knee=0.5, intensity=1.0, radius=8, downsample=1, debug=False):
    import torch.nn.functional as F
    
    T, H, W, C = frames.shape
    device = frames.device
    
    # Downsample for performance
    if downsample > 1:
        H_ds = H // downsample
        W_ds = W // downsample
        frames_ds = F.interpolate(frames.view(-1, H, W, C).permute(0, 3, 1, 2), size=(H_ds, W_ds), mode='bilinear', align_corners=True)
        frames_ds = frames_ds.permute(0, 2, 3, 1).view(T, H_ds, W_ds, C)
    else:
        frames_ds = frames
        H_ds, W_ds = H, W
    
    # Extract bright areas
    luma = 0.299 * frames_ds[..., 0] + 0.587 * frames_ds[..., 1] + 0.114 * frames_ds[..., 2]
    
    # Soft threshold with knee
    soft = threshold + soft_knee
    bright = torch.clamp((luma - threshold) / soft_knee, 0, 1) if soft_knee > 0 else (luma > threshold).float()
    bright = bright.unsqueeze(-1)
    
    # Blur the bright areas
    kernel_size = radius * 2 + 1
    bright_blurred = F.avg_pool2d(bright.view(-1, 1, H_ds, W_ds).permute(0, 3, 1, 2), kernel_size, stride=1, padding=radius)
    bright_blurred = bright_blurred.permute(0, 2, 3, 1).view(T, H_ds, W_ds, 1)
    
    # Upsample back
    if downsample > 1:
        bright_blurred = F.interpolate(bright_blurred.view(-1, H_ds, W_ds, 1).permute(0, 3, 1, 2), size=(H, W), mode='bilinear', align_corners=True)
        bright_blurred = bright_blurred.permute(0, 2, 3, 1)
    else:
        bright_blurred = bright_blurred.expand(-1, -1, -1, C)
    
    # Apply bloom
    result = frames + bright_blurred * intensity
    
    if debug:
        return bright_blurred
    
    return result.clamp(0, 1)`;

const COSMIC_VFX_HELPER = `def _apply_cosmic_vfx(frames, enable_glitch=False, glitch_shader="basic", glitch_intensity=1.0, enable_retro=False, retro_shader="vhs", retro_intensity=1.0, enable_distortion=False, distortion_shader="wave", distortion_intensity=1.0, enable_color=False, color_shader="hueshift", color_intensity=1.0, enable_edge=False, edge_shader="sobel", edge_intensity=1.0, enable_blur=False, blur_shader="gaussian", blur_intensity=1.0, intensity=1.0, speed=1.0, hue_shift=0.0, saturation=1.0, brightness=1.0, blend_mode="normal"):
    import torch.nn.functional as F
    
    T, H, W, C = frames.shape
    device = frames.device
    result = frames.clone()
    
    # Color adjustments
    if hue_shift != 0 or saturation != 1.0 or brightness != 1.0:
        # Hue shift
        if hue_shift != 0:
            hsv = result
            h = (hsv[..., 0] + hue_shift) % 1.0
            result = torch.cat([h.unsqueeze(-1), hsv[..., 1:]], dim=-1)
        
        # Saturation
        if saturation != 1.0:
            gray = result[..., 0:1] * 0.299 + result[..., 1:2] * 0.587 + result[..., 2:3] * 0.114
            result = gray + (result - gray) * saturation
        
        # Brightness
        if brightness != 1.0:
            result = result * brightness
    
    # Glitch effect
    if enable_glitch and glitch_intensity > 0:
        if glitch_shader == "basic":
            # Random horizontal shifts
            shift_amount = (torch.rand(T, device=device) * glitch_intensity * 20).long()
            for t in range(T):
                if shift_amount[t] > 0:
                    result[t] = torch.roll(result[t], shifts=shift_amount[t].item(), dims=1)
    
    # Retro effect (VHS-style)
    if enable_retro and retro_intensity > 0:
        if retro_shader == "vhs":
            # Scan lines
            rows = torch.arange(H, device=device, dtype=torch.float32)
            wave = torch.sin(rows * 0.1 * speed)
            mask = 1.0 - retro_intensity * 0.3 * (1.0 - wave)
            result = result * mask.view(1, H, 1, 1)
            
            # Analog noise
            grain = torch.randn_like(result) * (retro_intensity * 0.1)
            result = result + grain
    
    # Distortion effect
    if enable_distortion and distortion_intensity > 0:
        if distortion_shader == "wave":
            grid_y = torch.linspace(-1, 1, H, device=device)
            grid_x = torch.linspace(-1, 1, W, device=device)
            gy, gx = torch.meshgrid(grid_y, grid_x, indexing='ij')
            
            offset = torch.sin(gy * 10 * speed) * distortion_intensity * 0.1
            gx = gx + offset
            
            grid = torch.stack([gx, gy], dim=-1).unsqueeze(0).expand(T, -1, -1, -1)
            result_nchw = result.permute(0, 3, 1, 2)
            result = F.grid_sample(result_nchw, grid, mode='bilinear', padding_mode='border', align_corners=True)
            result = result.permute(0, 2, 3, 1)
    
    # Edge detection
    if enable_edge and edge_intensity > 0:
        if edge_shader == "sobel":
            gray = 0.299 * result[..., 0] + 0.587 * result[..., 1] + 0.114 * result[..., 2]
            # Sobel kernels
            kx = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=torch.float32, device=device).view(1, 1, 3, 3)
            ky = torch.tensor([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=torch.float32, device=device).view(1, 1, 3, 3)
            
            gray_t = gray.unsqueeze(1)
            gx = F.conv2d(gray_t.permute(0, 1, 2, 3).squeeze(0).unsqueeze(0), kx, padding=1).squeeze(0)
            gy = F.conv2d(gray_t.permute(0, 1, 2, 3).squeeze(0).unsqueeze(0), ky, padding=1).squeeze(0)
            edges = torch.sqrt(gx * gx + gy * gy)
            
            edges_norm = edges / (edges.max() + 1e-8)
            edges_rgb = edges_norm.unsqueeze(-1).expand(-1, -1, -1, 3)
            result = result * (1 - edges_rgb * edge_intensity) + edges_rgb * edge_intensity
    
    # Blur effect
    if enable_blur and blur_intensity > 0:
        if blur_shader == "gaussian":
            radius = int(blur_intensity * 10)
            if radius > 0:
                kernel_size = radius * 2 + 1
                result_nchw = result.permute(0, 3, 1, 2)
                result = F.avg_pool2d(result_nchw, kernel_size, stride=1, padding=radius)
                result = result.permute(0, 2, 3, 1)
    
    # Apply intensity and blend
    result = frames * (1 - intensity) + result * intensity
    
    # Blend mode
    if blend_mode == "screen":
        result = 1 - (1 - frames) * (1 - result)
    elif blend_mode == "multiply":
        result = frames * result
    elif blend_mode == "overlay":
        result = torch.where(frames < 0.5, 2 * frames * result, 1 - 2 * (1 - frames) * (1 - result))
    
    return result.clamp(0, 1)`;

const VFX_PACK_HELPER = `def _apply_vfx_pack(frames, chromatic_enabled=True, chromatic_intensity=0.3, chromatic_angle=0.0, vhs_enabled=False, scan_line_intensity=0.3, scan_line_count=100, vhs_noise=0.1, tracking_distortion=0.2, halftone_enabled=False, halftone_dot_size=8, halftone_sharpness=0.7):
    import math
    import torch.nn.functional as F
    
    T, H, W, C = frames.shape
    device = frames.device
    result = frames.clone()
    
    # Chromatic aberration
    if chromatic_enabled and chromatic_intensity > 0:
        max_shift = int(chromatic_intensity * 20)
        if max_shift > 0:
            rad = math.radians(chromatic_angle)
            dx = int(round(max_shift * math.cos(rad)))
            dy = int(round(max_shift * math.sin(rad)))
            
            if dx != 0 or dy != 0:
                result[..., 0] = torch.roll(frames[..., 0], shifts=(dy, dx), dims=(1, 2))
                result[..., 2] = torch.roll(frames[..., 2], shifts=(-dy, -dx), dims=(1, 2))
    
    # VHS effect
    if vhs_enabled:
        # Scan lines
        if scan_line_intensity > 0 and scan_line_count > 0:
            rows = torch.arange(H, device=device, dtype=torch.float32)
            wave = torch.sin(rows * (scan_line_count * 3.14159 / H))
            mask = 1.0 - scan_line_intensity * 0.5 * (1.0 - wave)
            result = result * mask.view(1, H, 1, 1)
        
        # Analog noise
        if vhs_noise > 0:
            grain = torch.randn_like(result) * (vhs_noise * 0.15)
            result = result + grain
        
        # Tracking distortion
        if tracking_distortion > 0:
            max_shift = tracking_distortion * 0.05
            rows_norm = torch.linspace(-1.0, 1.0, H, device=device)
            offsets = max_shift * torch.sin(rows_norm * 6.2832 * 3.0)
            
            grid_y = torch.linspace(-1.0, 1.0, H, device=device)
            grid_x = torch.linspace(-1.0, 1.0, W, device=device)
            gy, gx = torch.meshgrid(grid_y, grid_x, indexing="ij")
            
            gx = gx + offsets.view(H, 1)
            
            grid = torch.stack([gx, gy], dim=-1)
            grid = grid.unsqueeze(0).expand(T, -1, -1, -1)
            
            result_nchw = result.permute(0, 3, 1, 2)
            result_nchw = F.grid_sample(result_nchw, grid, mode="bilinear", padding_mode="border", align_corners=True)
            result = result_nchw.permute(0, 2, 3, 1)
    
    # Halftone effect
    if halftone_enabled and halftone_dot_size >= 2:
        cell = int(halftone_dot_size)
        
        # Luminance
        luma = 0.299 * result[..., 0] + 0.587 * result[..., 1] + 0.114 * result[..., 2]
        
        # Cell-averaged luminance
        pad_h = (cell - H % cell) % cell
        pad_w = (cell - W % cell) % cell
        luma_4d = luma.unsqueeze(1)
        luma_padded = F.pad(luma_4d, (0, pad_w, 0, pad_h), mode="reflect")
        cell_luma = F.avg_pool2d(luma_padded, cell, cell)
        cell_luma = F.interpolate(cell_luma, size=(H + pad_h, W + pad_w), mode="nearest")
        cell_luma = cell_luma[:, 0, :H, :W]
        
        # Distance from cell centre
        y = torch.arange(H, device=device, dtype=torch.float32)
        x = torch.arange(W, device=device, dtype=torch.float32)
        gy, gx = torch.meshgrid(y, x, indexing="ij")
        
        local_y = (gy % cell) - (cell - 1) / 2.0
        local_x = (gx % cell) - (cell - 1) / 2.0
        dist = torch.sqrt(local_x * local_x + local_y * local_y)
        
        # Dot radius
        max_r = cell / 2.0
        dot_r = max_r * torch.sqrt((1.0 - cell_luma).clamp(0, 1))
        
        # Soft-edge mask
        edge = max(0.3, (1.0 - halftone_sharpness) * max_r)
        mask = torch.sigmoid((dot_r - dist.unsqueeze(0)) / edge * 6.0)
        
        # Composite
        mask = mask.unsqueeze(-1)
        result = result * mask + (1.0 - mask)
    
    return result.clamp(0, 1)`;

const SETTINGS_NODES = [
  "noiseSettings", "vaceSettings", "resolutionSettings", "advancedSettings", "loraSettings"
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

function generateSchemaFields(nodes: any[], edges: any[]): string {
  const processingNodes = getNodeOrder(nodes, edges);
  const settingsNodes = nodes.filter((n) => SETTINGS_NODES.includes(n.data.type));

  if (processingNodes.length === 0 && settingsNodes.length === 0) {
    return "";
  }

  const fields: string[] = [];
  let order = 100;

  // Generate fields for settings nodes
  for (const node of settingsNodes) {
    const config = node.data.config;
    const type = node.data.type;

    if (type === "noiseSettings") {
      fields.push(`
    noise_scale: float = Field(
        default=${config.noiseScale ?? 0.7},
        ge=0,
        le=2,
        description="Noise scale for generation",
        json_schema_extra=ui_field_config(order=${order++}, component="noise", is_load_param=True),
    )
    noise_controller: bool = Field(
        default=${config.noiseController !== false},
        description="Enable noise controller",
        json_schema_extra=ui_field_config(order=${order++}, component="noise", is_load_param=True),
    )`);
    }

    if (type === "vaceSettings") {
      fields.push(`
    vace_enabled: bool = Field(
        default=${config.vaceEnabled === true},
        description="Enable VACE context guidance",
        json_schema_extra=ui_field_config(order=${order++}, component="vace", is_load_param=True),
    )
    vace_context_scale: float = Field(
        default=${config.vaceContextScale ?? 1.0},
        ge=0,
        le=2,
        description="VACE context scale",
        json_schema_extra=ui_field_config(order=${order++}, component="vace", is_load_param=True),
    )`);
    }

    if (type === "resolutionSettings") {
      fields.push(`
    width: int = Field(
        default=${config.width ?? 512},
        ge=256,
        le=2048,
        description="Output width",
        json_schema_extra=ui_field_config(order=${order++}, component="resolution"),
    )
    height: int = Field(
        default=${config.height ?? 512},
        ge=256,
        le=2048,
        description="Output height",
        json_schema_extra=ui_field_config(order=${order++}, component="resolution"),
    )`);
    }

    if (type === "advancedSettings") {
      fields.push(`
    denoising_steps: int = Field(
        default=${config.denoisingSteps ?? 30},
        ge=1,
        le=100,
        description="Number of denoising steps",
        json_schema_extra=ui_field_config(order=${order++}, component="denoising_steps", is_load_param=True),
    )
    quantization: str = Field(
        default="${config.quantization ?? ''}",
        description="Quantization method",
        json_schema_extra=ui_field_config(order=${order++}, component="quantization", is_load_param=True),
    )
    kv_cache_attention_bias: float = Field(
        default=${config.kvCacheAttentionBias ?? 0.0},
        ge=-1,
        le=1,
        description="KV cache attention bias",
        json_schema_extra=ui_field_config(order=${order++}, is_load_param=True),
    )`);
    }

    if (type === "loraSettings") {
      fields.push(`
    loras: list = Field(
        default=[],
        description="LoRA adapters",
        json_schema_extra=ui_field_config(order=${order++}, component="lora", is_load_param=True),
    )`);
    }
  }

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

    if (type === "kaleidoscope") {
      fields.push(`
    kaleidoscope_enabled: bool = Field(
        default=${config.enabled !== false},
        description="Enable kaleidoscope effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Enabled"),
    )
    kaleidoscope_mix: float = Field(
        default=${config.mix ?? 1.0},
        ge=0,
        le=1,
        description="Blend original (0) to fully effected (1)",
        json_schema_extra=ui_field_config(order=${order++}, label="Mix"),
    )
    kaleidoscope_mirror_mode: str = Field(
        default="${config.mirrorMode ?? 'none'}",
        description="Mirror symmetry mode: none, 2x, 4x, kaleido6",
        json_schema_extra=ui_field_config(order=${order++}, label="Mirror Mode"),
    )
    kaleidoscope_rotational_enabled: bool = Field(
        default=${config.rotationalEnabled !== false},
        description="Enable N-fold rotational symmetry",
        json_schema_extra=ui_field_config(order=${order++}, label="Rotational Symmetry"),
    )
    kaleidoscope_slices: int = Field(
        default=${config.rotationalSlices ?? 6},
        ge=3,
        le=12,
        description="Number of symmetry slices (N)",
        json_schema_extra=ui_field_config(order=${order++}, label="Slices"),
    )
    kaleidoscope_rotation: float = Field(
        default=${config.rotationDeg ?? 0.0},
        ge=0,
        le=360,
        description="Rotate pattern (degrees)",
        json_schema_extra=ui_field_config(order=${order++}, label="Rotation"),
    )
    kaleidoscope_zoom: float = Field(
        default=${config.zoom ?? 1.0},
        ge=0.5,
        le=2,
        description="Zoom into source before symmetry",
        json_schema_extra=ui_field_config(order=${order++}, label="Zoom"),
    )
    kaleidoscope_warp: float = Field(
        default=${config.warp ?? 0.0},
        ge=-0.5,
        le=0.5,
        description="Radial warp amount",
        json_schema_extra=ui_field_config(order=${order++}, label="Warp"),
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

    if (type === "yoloMask") {
      fields.push(`
    yolo_model_size: str = Field(
        default="${config.modelSize ?? 'nano'}",
        description="YOLO model variant: nano, small, medium, large, xlarge",
        json_schema_extra=ui_field_config(order=${order++}, label="Model Size"),
    )
    yolo_output_mode: str = Field(
        default="${config.outputMode ?? 'mask'}",
        description="Output mode: mask=binary, overlay=blended",
        json_schema_extra=ui_field_config(order=${order++}, label="Output Mode"),
    )
    yolo_target_class: str = Field(
        default="${config.targetClass ?? 'person'}",
        description="Object class to segment",
        json_schema_extra=ui_field_config(order=${order++}, label="Target Class"),
    )
    yolo_confidence: float = Field(
        default=${config.confidenceThreshold ?? 0.5},
        ge=0,
        le=1,
        description="Detection confidence threshold",
        json_schema_extra=ui_field_config(order=${order++}, label="Confidence"),
    )
    yolo_invert_mask: bool = Field(
        default=${config.invertMask === true},
        description="Invert the mask (segment background)",
        json_schema_extra=ui_field_config(order=${order++}, label="Invert Mask"),
    )`);
    }

    if (type === "bloom") {
      fields.push(`
    bloom_threshold: float = Field(
        default=${config.threshold ?? 0.8},
        ge=0,
        le=1,
        description="Brightness threshold for bloom extraction",
        json_schema_extra=ui_field_config(order=${order++}, label="Threshold"),
    )
    bloom_soft_knee: float = Field(
        default=${config.softKnee ?? 0.5},
        ge=0,
        le=1,
        description="Softness of threshold transition",
        json_schema_extra=ui_field_config(order=${order++}, label="Soft Knee"),
    )
    bloom_intensity: float = Field(
        default=${config.intensity ?? 1.0},
        ge=0,
        le=2,
        description="Bloom intensity multiplier",
        json_schema_extra=ui_field_config(order=${order++}, label="Intensity"),
    )
    bloom_radius: int = Field(
        default=${config.radius ?? 8},
        ge=1,
        le=48,
        description="Blur radius for bloom effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Radius"),
    )
    bloom_downsample: int = Field(
        default=${config.downsample ?? 1},
        ge=1,
        le=4,
        description="Downsample factor (higher=faster)",
        json_schema_extra=ui_field_config(order=${order++}, label="Downsample"),
    )
    bloom_debug: bool = Field(
        default=${config.debug === true},
        description="Enable debug logging",
        json_schema_extra=ui_field_config(order=${order++}, label="Debug"),
    )`);
    }

    if (type === "cosmicVFX") {
      fields.push(`
    # Glitch
    cosmic_enable_glitch: bool = Field(
        default=${config.enableGlitch === true},
        description="Enable glitch effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Glitch"),
    )
    cosmic_glitch_shader: str = Field(
        default="${config.glitchShader ?? 'basic'}",
        description="Glitch shader type",
        json_schema_extra=ui_field_config(order=${order++}, label="Glitch Shader"),
    )
    cosmic_glitch_intensity: float = Field(
        default=${config.glitchIntensity ?? 1.0},
        ge=0,
        le=2,
        description="Glitch intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Glitch Intensity"),
    )
    # Retro
    cosmic_enable_retro: bool = Field(
        default=${config.enableRetro === true},
        description="Enable retro effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Retro"),
    )
    cosmic_retro_shader: str = Field(
        default="${config.retroShader ?? 'vhs'}",
        description="Retro shader type",
        json_schema_extra=ui_field_config(order=${order++}, label="Retro Shader"),
    )
    cosmic_retro_intensity: float = Field(
        default=${config.retroIntensity ?? 1.0},
        ge=0,
        le=2,
        description="Retro intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Retro Intensity"),
    )
    # Distortion
    cosmic_enable_distortion: bool = Field(
        default=${config.enableDistortion === true},
        description="Enable distortion effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Distortion"),
    )
    cosmic_distortion_shader: str = Field(
        default="${config.distortionShader ?? 'wave'}",
        description="Distortion shader type",
        json_schema_extra=ui_field_config(order=${order++}, label="Distortion Shader"),
    )
    cosmic_distortion_intensity: float = Field(
        default=${config.distortionIntensity ?? 1.0},
        ge=0,
        le=2,
        description="Distortion intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Distortion Intensity"),
    )
    # Color
    cosmic_enable_color: bool = Field(
        default=${config.enableColor === true},
        description="Enable color effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Color"),
    )
    cosmic_color_shader: str = Field(
        default="${config.colorShader ?? 'hueshift'}",
        description="Color shader type",
        json_schema_extra=ui_field_config(order=${order++}, label="Color Shader"),
    )
    cosmic_color_intensity: float = Field(
        default=${config.colorIntensity ?? 1.0},
        ge=0,
        le=2,
        description="Color intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Color Intensity"),
    )
    # Edge
    cosmic_enable_edge: bool = Field(
        default=${config.enableEdge === true},
        description="Enable edge detection",
        json_schema_extra=ui_field_config(order=${order++}, label="Edge"),
    )
    cosmic_edge_shader: str = Field(
        default="${config.edgeShader ?? 'sobel'}",
        description="Edge detection type",
        json_schema_extra=ui_field_config(order=${order++}, label="Edge Shader"),
    )
    cosmic_edge_intensity: float = Field(
        default=${config.edgeIntensity ?? 1.0},
        ge=0,
        le=2,
        description="Edge intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Edge Intensity"),
    )
    # Blur
    cosmic_enable_blur: bool = Field(
        default=${config.enableBlur === true},
        description="Enable blur effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Blur"),
    )
    cosmic_blur_shader: str = Field(
        default="${config.blurShader ?? 'gaussian'}",
        description="Blur shader type",
        json_schema_extra=ui_field_config(order=${order++}, label="Blur Shader"),
    )
    cosmic_blur_intensity: float = Field(
        default=${config.blurIntensity ?? 1.0},
        ge=0,
        le=2,
        description="Blur intensity",
        json_schema_extra=ui_field_config(order=${order++}, label="Blur Intensity"),
    )
    # Global
    cosmic_intensity: float = Field(
        default=${config.intensity ?? 1.0},
        ge=0,
        le=2,
        description="Master intensity multiplier",
        json_schema_extra=ui_field_config(order=${order++}, label="Intensity"),
    )
    cosmic_speed: float = Field(
        default=${config.speed ?? 1.0},
        ge=0,
        le=3,
        description="Animation speed",
        json_schema_extra=ui_field_config(order=${order++}, label="Speed"),
    )
    cosmic_hue_shift: float = Field(
        default=${config.hueShift ?? 0.0},
        ge=-1,
        le=1,
        description="Rotate color wheel",
        json_schema_extra=ui_field_config(order=${order++}, label="Hue Shift"),
    )
    cosmic_saturation: float = Field(
        default=${config.saturation ?? 1.0},
        ge=0,
        le=2,
        description="Color richness",
        json_schema_extra=ui_field_config(order=${order++}, label="Saturation"),
    )
    cosmic_brightness: float = Field(
        default=${config.brightness ?? 1.0},
        ge=0,
        le=2,
        description="Final brightness",
        json_schema_extra=ui_field_config(order=${order++}, label="Brightness"),
    )
    cosmic_blend_mode: str = Field(
        default="${config.blendMode ?? 'normal'}",
        description="Blend mode with original",
        json_schema_extra=ui_field_config(order=${order++}, label="Blend Mode"),
    )`);
    }

    if (type === "vfxPack") {
      fields.push(`
    vfx_chromatic_enabled: bool = Field(
        default=${config.chromaticEnabled !== false},
        description="Enable chromatic aberration",
        json_schema_extra=ui_field_config(order=${order++}, label="Chromatic Aberration"),
    )
    vfx_chromatic_intensity: float = Field(
        default=${config.chromaticIntensity ?? 0.3},
        ge=0,
        le=1,
        description="RGB channel displacement strength",
        json_schema_extra=ui_field_config(order=${order++}, label="Chromatic Intensity"),
    )
    vfx_chromatic_angle: float = Field(
        default=${config.chromaticAngle ?? 0.0},
        ge=0,
        le=360,
        description="Displacement direction (degrees)",
        json_schema_extra=ui_field_config(order=${order++}, label="Chromatic Angle"),
    )
    vfx_vhs_enabled: bool = Field(
        default=${config.vhsEnabled === true},
        description="Enable VHS / retro CRT effect",
        json_schema_extra=ui_field_config(order=${order++}, label="VHS / Retro CRT"),
    )
    vfx_scan_line_intensity: float = Field(
        default=${config.scanLineIntensity ?? 0.3},
        ge=0,
        le=1,
        description="Scan line darkness",
        json_schema_extra=ui_field_config(order=${order++}, label="Scan Lines"),
    )
    vfx_scan_line_count: int = Field(
        default=${config.scanLineCount ?? 100},
        ge=10,
        le=500,
        description="Number of scan lines",
        json_schema_extra=ui_field_config(order=${order++}, label="Line Count"),
    )
    vfx_noise: float = Field(
        default=${config.vhsNoise ?? 0.1},
        ge=0,
        le=1,
        description="Analog noise/grain amount",
        json_schema_extra=ui_field_config(order=${order++}, label="Noise"),
    )
    vfx_tracking: float = Field(
        default=${config.trackingDistortion ?? 0.2},
        ge=0,
        le=1,
        description="Horizontal tracking distortion",
        json_schema_extra=ui_field_config(order=${order++}, label="Tracking"),
    )
    vfx_halftone_enabled: bool = Field(
        default=${config.halftoneEnabled === true},
        description="Enable halftone effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Halftone"),
    )
    vfx_halftone_dot_size: int = Field(
        default=${config.halftoneDotSize ?? 8},
        ge=4,
        le=20,
        description="Halftone dot size (pixels)",
        json_schema_extra=ui_field_config(order=${order++}, label="Dot Size"),
    )
    vfx_halftone_sharpness: float = Field(
        default=${config.halftoneSharpness ?? 0.7},
        ge=0,
        le=1,
        description="Edge sharpness of dots",
        json_schema_extra=ui_field_config(order=${order++}, label="Sharpness"),
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

    if (type === "chromatic") {
      fields.push(`
    chromatic_enabled: bool = Field(
        default=${config.enabled !== false},
        description="Enable chromatic aberration",
        json_schema_extra=ui_field_config(order=${order++}, label="Chromatic Aberration"),
    )
    chromatic_intensity: float = Field(
        default=${config.intensity ?? 0.3},
        ge=0,
        le=1,
        description="RGB channel displacement strength",
        json_schema_extra=ui_field_config(order=${order++}, label="Intensity"),
    )
    chromatic_angle: float = Field(
        default=${config.angle ?? 0},
        ge=0,
        le=360,
        description="Displacement direction in degrees",
        json_schema_extra=ui_field_config(order=${order++}, label="Angle"),
    )`);
    }

    if (type === "vhs") {
      fields.push(`
    vhs_enabled: bool = Field(
        default=${config.enabled === true},
        description="Enable VHS / retro CRT effect",
        json_schema_extra=ui_field_config(order=${order++}, label="VHS / Retro CRT"),
    )
    scan_line_intensity: float = Field(
        default=${config.scanLineIntensity ?? 0.3},
        ge=0,
        le=1,
        description="Darkness of scan lines",
        json_schema_extra=ui_field_config(order=${order++}, label="Scan Lines"),
    )
    scan_line_count: int = Field(
        default=${config.scanLineCount ?? 100},
        ge=10,
        le=500,
        description="Number of scan lines",
        json_schema_extra=ui_field_config(order=${order++}, label="Line Count"),
    )
    vhs_noise: float = Field(
        default=${config.noise ?? 0.1},
        ge=0,
        le=1,
        description="Analog grain amount",
        json_schema_extra=ui_field_config(order=${order++}, label="Noise"),
    )
    tracking_distortion: float = Field(
        default=${config.tracking ?? 0.2},
        ge=0,
        le=1,
        description="Horizontal tracking distortion",
        json_schema_extra=ui_field_config(order=${order++}, label="Tracking"),
    )`);
    }

    if (type === "halftone") {
      fields.push(`
    halftone_enabled: bool = Field(
        default=${config.enabled === true},
        description="Enable halftone effect",
        json_schema_extra=ui_field_config(order=${order++}, label="Halftone"),
    )
    halftone_dot_size: int = Field(
        default=${config.dotSize ?? 8},
        ge=4,
        le=20,
        description="Halftone dot size in pixels",
        json_schema_extra=ui_field_config(order=${order++}, label="Dot Size"),
    )
    halftone_sharpness: float = Field(
        default=${config.sharpness ?? 0.7},
        ge=0,
        le=1,
        description="Edge sharpness of dots",
        json_schema_extra=ui_field_config(order=${order++}, label="Sharpness"),
    )`);
    }

    // Custom effect node - user-defined parameters and code
    if (type === "custom") {
      const customConfig = config;
      const params = (customConfig && customConfig.params as Array<{name: string, type: string, default: any, min?: number, max?: number, description?: string}>) || [];
      
      for (const param of params) {
        const paramName = param.name.replace(/[^a-zA-Z0-9_]/g, '_');
        const defaultVal = param.default ?? 0;
        
        if (param.type === "float" || param.type === "number") {
          fields.push(`
    ${paramName}: float = Field(
        default=${defaultVal},
        ${param.min !== undefined ? `ge=${param.min},` : ''}
        ${param.max !== undefined ? `le=${param.max},` : ''}
        description="${param.description || param.name}",
        json_schema_extra=ui_field_config(order=${order++}, label="${param.name}"),
    )`);
        } else if (param.type === "int" || param.type === "integer") {
          fields.push(`
    ${paramName}: int = Field(
        default=${defaultVal},
        ${param.min !== undefined ? `ge=${param.min},` : ''}
        ${param.max !== undefined ? `le=${param.max},` : ''}
        description="${param.description || param.name}",
        json_schema_extra=ui_field_config(order=${order++}, label="${param.name}"),
    )`);
        } else if (param.type === "bool" || param.type === "boolean") {
          fields.push(`
    ${paramName}: bool = Field(
        default=${defaultVal === true},
        description="${param.description || param.name}",
        json_schema_extra=ui_field_config(order=${order++}, label="${param.name}"),
    )`);
        } else {
          fields.push(`
    ${paramName}: str = Field(
        default="${defaultVal}",
        description="${param.description || param.name}",
        json_schema_extra=ui_field_config(order=${order++}, label="${param.name}"),
    )`);
        }
      }
    }
  }

  return fields.join(",");
}

function getNodeOrder(nodes: any[], edges: any[]): any[] {
  const outputNode = nodes.find(n => n.data.type === "pipelineOutput");
  
  const isEffectNode = (type: string) => {
    if (EFFECT_NODES.includes(type)) return true;
    // Handle pipeline_ prefixed types
    if (type.startsWith("pipeline_")) {
      const pipelineId = type.replace("pipeline_", "");
      return PIPELINE_EFFECT_IDS.includes(pipelineId);
    }
    return false;
  };
  
  if (!outputNode) return nodes.filter(n => isEffectNode(n.data.type));
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const order: any[] = [];
  const visited = new Set<string>();
  
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const incoming = edges.filter(e => e.target === nodeId);
    for (const edge of incoming) {
      visit(edge.source);
    }
    
    const node = nodeMap.get(nodeId);
    if (node && isEffectNode(node.data.type)) {
      order.push(node);
    }
  }
  
  visit(outputNode.id);
  
  return order;
}

function generatePipelineInit(nodes: any[], edges: any[]): string {
  const processingNodes = getNodeOrder(nodes, edges);

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

    if (type === "kaleidoscope") {
      lines.push(`    # Full kaleidoscope effect
    if kwargs.get("kaleidoscope_enabled", ${config.enabled !== false}):
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        frames = _apply_kaleidoscope(
            frames,
            enabled=True,
            mix=kwargs.get("kaleidoscope_mix", ${config.mix ?? 1.0}),
            mirror_mode=kwargs.get("kaleidoscope_mirror_mode", "${config.mirrorMode ?? 'none'}"),
            rotational_enabled=kwargs.get("kaleidoscope_rotational_enabled", ${config.rotationalEnabled !== false}),
            rotational_slices=kwargs.get("kaleidoscope_slices", ${config.rotationalSlices ?? 6}),
            rotation_deg=kwargs.get("kaleidoscope_rotation", ${config.rotationDeg ?? 0.0}),
            zoom=kwargs.get("kaleidoscope_zoom", ${config.zoom ?? 1.0}),
            warp=kwargs.get("kaleidoscope_warp", ${config.warp ?? 0.0}),
        )
        video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "pipeline_kaleido-scope") {
      lines.push(`    # Kaleidoscope pipeline
    if kwargs.get("kaleidoscope_enabled", True):
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        frames = _apply_kaleidoscope(
            frames,
            enabled=True,
            mix=kwargs.get("kaleidoscope_mix", 1.0),
            mirror_mode=kwargs.get("kaleidoscope_mirror_mode", "radial"),
            rotational_enabled=kwargs.get("kaleidoscope_rotational_enabled", True),
            rotational_slices=kwargs.get("kaleidoscope_slices", 6),
            rotation_deg=kwargs.get("kaleidoscope_rotation", 0.0),
            zoom=kwargs.get("kaleidoscope_zoom", 1.0),
            warp=kwargs.get("kaleidoscope_warp", 0.0),
        )
        video = [frames[i] for i in range(frames.shape[0])]`);
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

    if (type === "yoloMask") {
      lines.push(`    # YOLO26 segmentation
    yolo_model_size = kwargs.get("yolo_model_size", "${config.modelSize ?? 'nano'}")
    yolo_output_mode = kwargs.get("yolo_output_mode", "${config.outputMode ?? 'mask'}")
    yolo_target_class = kwargs.get("yolo_target_class", "${config.targetClass ?? 'person'}")
    yolo_confidence = float(kwargs.get("yolo_confidence", ${config.confidenceThreshold ?? 0.5}))
    yolo_invert_mask = kwargs.get("yolo_invert_mask", ${config.invertMask === true})
    # YOLO segmentation requires model loading - placeholder for actual implementation
    # In real Scope plugins, this would use the YOLO model to generate masks
    `);
    }

    if (type === "bloom") {
      lines.push(`    # Bloom effect
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    frames = _apply_bloom(
        frames,
        threshold=kwargs.get("bloom_threshold", ${config.threshold ?? 0.8}),
        soft_knee=kwargs.get("bloom_soft_knee", ${config.softKnee ?? 0.5}),
        intensity=kwargs.get("bloom_intensity", ${config.intensity ?? 1.0}),
        radius=kwargs.get("bloom_radius", ${config.radius ?? 8}),
        downsample=kwargs.get("bloom_downsample", ${config.downsample ?? 1}),
        debug=kwargs.get("bloom_debug", ${config.debug === true}),
    )
    video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "pipeline_bloom") {
      lines.push(`    # Bloom pipeline
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    frames = _apply_bloom(
        frames,
        threshold=kwargs.get("bloom_threshold", 0.8),
        soft_knee=kwargs.get("bloom_soft_knee", 0.5),
        intensity=kwargs.get("bloom_intensity", 1.0),
        radius=kwargs.get("bloom_radius", 8),
        downsample=kwargs.get("bloom_downsample", 1),
        debug=kwargs.get("bloom_debug", False),
    )
    video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "cosmicVFX") {
      lines.push(`    # Cosmic VFX effect
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    frames = _apply_cosmic_vfx(
        frames,
        enable_glitch=kwargs.get("cosmic_enable_glitch", ${config.enableGlitch === true}),
        glitch_shader=kwargs.get("cosmic_glitch_shader", "${config.glitchShader ?? 'basic'}"),
        glitch_intensity=kwargs.get("cosmic_glitch_intensity", ${config.glitchIntensity ?? 1.0}),
        enable_retro=kwargs.get("cosmic_enable_retro", ${config.enableRetro === true}),
        retro_shader=kwargs.get("cosmic_retro_shader", "${config.retroShader ?? 'vhs'}"),
        retro_intensity=kwargs.get("cosmic_retro_intensity", ${config.retroIntensity ?? 1.0}),
        enable_distortion=kwargs.get("cosmic_enable_distortion", ${config.enableDistortion === true}),
        distortion_shader=kwargs.get("cosmic_distortion_shader", "${config.distortionShader ?? 'wave'}"),
        distortion_intensity=kwargs.get("cosmic_distortion_intensity", ${config.distortionIntensity ?? 1.0}),
        enable_color=kwargs.get("cosmic_enable_color", ${config.enableColor === true}),
        color_shader=kwargs.get("cosmic_color_shader", "${config.colorShader ?? 'hueshift'}"),
        color_intensity=kwargs.get("cosmic_color_intensity", ${config.colorIntensity ?? 1.0}),
        enable_edge=kwargs.get("cosmic_enable_edge", ${config.enableEdge === true}),
        edge_shader=kwargs.get("cosmic_edge_shader", "${config.edgeShader ?? 'sobel'}"),
        edge_intensity=kwargs.get("cosmic_edge_intensity", ${config.edgeIntensity ?? 1.0}),
        enable_blur=kwargs.get("cosmic_enable_blur", ${config.enableBlur === true}),
        blur_shader=kwargs.get("cosmic_blur_shader", "${config.blurShader ?? 'gaussian'}"),
        blur_intensity=kwargs.get("cosmic_blur_intensity", ${config.blurIntensity ?? 1.0}),
        intensity=kwargs.get("cosmic_intensity", ${config.intensity ?? 1.0}),
        speed=kwargs.get("cosmic_speed", ${config.speed ?? 1.0}),
        hue_shift=kwargs.get("cosmic_hue_shift", ${config.hueShift ?? 0.0}),
        saturation=kwargs.get("cosmic_saturation", ${config.saturation ?? 1.0}),
        brightness=kwargs.get("cosmic_brightness", ${config.brightness ?? 1.0}),
        blend_mode=kwargs.get("cosmic_blend_mode", "${config.blendMode ?? 'normal'}"),
    )
    video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "pipeline_cosmic-vfx") {
      lines.push(`    # Cosmic VFX pipeline
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    frames = _apply_cosmic_vfx(
        frames,
        enable_glitch=kwargs.get("cosmic_enable_glitch", True),
        glitch_shader=kwargs.get("cosmic_glitch_shader", "basic"),
        glitch_intensity=kwargs.get("cosmic_glitch_intensity", 1.0),
        enable_retro=kwargs.get("cosmic_enable_retro", True),
        retro_shader=kwargs.get("cosmic_retro_shader", "vhs"),
        retro_intensity=kwargs.get("cosmic_retro_intensity", 1.0),
        enable_distortion=kwargs.get("cosmic_enable_distortion", True),
        distortion_shader=kwargs.get("cosmic_distortion_shader", "wave"),
        distortion_intensity=kwargs.get("cosmic_distortion_intensity", 1.0),
        enable_color=kwargs.get("cosmic_enable_color", True),
        color_shader=kwargs.get("cosmic_color_shader", "hueshift"),
        color_intensity=kwargs.get("cosmic_color_intensity", 1.0),
        enable_edge=kwargs.get("cosmic_enable_edge", True),
        edge_shader=kwargs.get("cosmic_edge_shader", "sobel"),
        edge_intensity=kwargs.get("cosmic_edge_intensity", 1.0),
        enable_blur=kwargs.get("cosmic_enable_blur", True),
        blur_shader=kwargs.get("cosmic_blur_shader", "gaussian"),
        blur_intensity=kwargs.get("cosmic_blur_intensity", 1.0),
        intensity=kwargs.get("cosmic_intensity", 1.0),
        speed=kwargs.get("cosmic_speed", 1.0),
        hue_shift=kwargs.get("cosmic_hue_shift", 0.0),
        saturation=kwargs.get("cosmic_saturation", 1.0),
        brightness=kwargs.get("cosmic_brightness", 1.0),
        blend_mode=kwargs.get("cosmic_blend_mode", "normal"),
    )
    video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "vfxPack") {
      lines.push(`    # VFX Pack effect
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    frames = _apply_vfx_pack(
        frames,
        chromatic_enabled=kwargs.get("vfx_chromatic_enabled", ${config.chromaticEnabled !== false}),
        chromatic_intensity=kwargs.get("vfx_chromatic_intensity", ${config.chromaticIntensity ?? 0.3}),
        chromatic_angle=kwargs.get("vfx_chromatic_angle", ${config.chromaticAngle ?? 0.0}),
        vhs_enabled=kwargs.get("vfx_vhs_enabled", ${config.vhsEnabled === true}),
        scan_line_intensity=kwargs.get("vfx_scan_line_intensity", ${config.scanLineIntensity ?? 0.3}),
        scan_line_count=kwargs.get("vfx_scan_line_count", ${config.scanLineCount ?? 100}),
        vhs_noise=kwargs.get("vfx_noise", ${config.vhsNoise ?? 0.1}),
        tracking_distortion=kwargs.get("vfx_tracking", ${config.trackingDistortion ?? 0.2}),
        halftone_enabled=kwargs.get("vfx_halftone_enabled", ${config.halftoneEnabled === true}),
        halftone_dot_size=kwargs.get("vfx_halftone_dot_size", ${config.halftoneDotSize ?? 8}),
        halftone_sharpness=kwargs.get("vfx_halftone_sharpness", ${config.halftoneSharpness ?? 0.7}),
    )
    video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "pipeline_vfx-pack") {
      lines.push(`    # VFX Pack pipeline
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    frames = _apply_vfx_pack(
        frames,
        chromatic_enabled=kwargs.get("vfx_chromatic_enabled", True),
        chromatic_intensity=kwargs.get("vfx_chromatic_intensity", 0.3),
        chromatic_angle=kwargs.get("vfx_chromatic_angle", 0.0),
        vhs_enabled=kwargs.get("vfx_vhs_enabled", True),
        scan_line_intensity=kwargs.get("vfx_scan_line_intensity", 0.3),
        scan_line_count=kwargs.get("vfx_scan_line_count", 100),
        vhs_noise=kwargs.get("vfx_noise", 0.1),
        tracking_distortion=kwargs.get("vfx_tracking", 0.2),
        halftone_enabled=kwargs.get("vfx_halftone_enabled", True),
        halftone_dot_size=kwargs.get("vfx_halftone_dot_size", 8),
        halftone_sharpness=kwargs.get("vfx_halftone_sharpness", 0.7),
    )
    video = [frames[i] for i in range(frames.shape[0])]`);
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

    if (type === "chromatic") {
      lines.push(`    # Chromatic aberration
    if kwargs.get("chromatic_enabled", ${config.enabled !== false}):
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        frames = _apply_chromatic(
            frames,
            intensity=kwargs.get("chromatic_intensity", ${config.intensity ?? 0.3}),
            angle=kwargs.get("chromatic_angle", ${config.angle ?? 0}),
        )
        video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "vhs") {
      lines.push(`    # VHS / retro CRT
    if kwargs.get("vhs_enabled", ${config.enabled === true}):
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        frames = _apply_vhs(
            frames,
            scan_line_intensity=kwargs.get("scan_line_intensity", ${config.scanLineIntensity ?? 0.3}),
            scan_line_count=kwargs.get("scan_line_count", ${config.scanLineCount ?? 100}),
            noise=kwargs.get("vhs_noise", ${config.noise ?? 0.1}),
            tracking=kwargs.get("tracking_distortion", ${config.tracking ?? 0.2}),
        )
        video = [frames[i] for i in range(frames.shape[0])]`);
    }

    if (type === "halftone") {
      lines.push(`    # Halftone effect
    if kwargs.get("halftone_enabled", ${config.enabled === true}):
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        frames = _apply_halftone(
            frames,
            dot_size=kwargs.get("halftone_dot_size", ${config.dotSize ?? 8}),
            sharpness=kwargs.get("halftone_sharpness", ${config.sharpness ?? 0.7}),
        )
        video = [frames[i] for i in range(frames.shape[0])]`);
    }

    // Custom effect - user's own code
    if (type === "custom") {
      const customCode = (config.code as string) || "# Custom effect code\nreturn frames";
      const effectName = ((config.name as string) || "custom").replace(/[^a-zA-Z0-9]/g, "_");
      
      lines.push(`    # Custom effect: ${effectName}
    frames = torch.stack([f.squeeze(0) for f in video], dim=0)
    frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
    # User-defined processing
${customCode.split('\n').map(line => '    ' + line).join('\n')}
    video = [frames[i] for i in range(frames.shape[0])]`);
    }
  }

  return lines.join("\n\n");
}

export function generatePlugin(nodes: any[], edges: any[]): string {
  const configNode = nodes.find((n) => n.data.type === "pluginConfig");
  
  const pluginId = (configNode?.data?.config?.pipelineId as string) || "my_plugin";
  const pluginName = (configNode?.data?.config?.pluginName as string) || toTitleCase(pluginId);
  const pluginDescription = (configNode?.data?.config?.pluginDescription as string) || "Generated by OpenScope";
  const usage = (configNode?.data?.config?.usage as string) || "main";
  const mode = (configNode?.data?.config?.mode as string) || "video";
  const supportsPrompts = configNode?.data?.config?.supportsPrompts !== false;

  const schemaFields = generateSchemaFields(nodes, edges);
  const pipelineInit = generatePipelineInit(nodes, edges);
  
  const hasPipelinePrefix = (type: string) => type.startsWith("pipeline_");
  const processingNodes = nodes.filter((n) => EFFECT_NODES.includes(n.data.type) || hasPipelinePrefix(n.data.type));
  const needsKaleido = processingNodes.some(n => n.data.type === "kaleido");
  const needsKaleidoscope = processingNodes.some(n => n.data.type === "kaleidoscope" || n.data.type === "pipeline_kaleido-scope");
  const needsYoloMask = processingNodes.some(n => n.data.type === "yoloMask" || n.data.type === "pipeline_yolo_mask");
  const needsVignette = processingNodes.some(n => n.data.type === "vignette");
  const needsColorGrading = processingNodes.some(n => n.data.type === "colorGrading");
  const needsChromatic = processingNodes.some(n => n.data.type === "chromatic");
  const needsVHS = processingNodes.some(n => n.data.type === "vhs");
  const needsHalftone = processingNodes.some(n => n.data.type === "halftone");
  const needsBloom = processingNodes.some(n => n.data.type === "bloom" || n.data.type === "pipeline_bloom");
  const needsCosmicVFX = processingNodes.some(n => n.data.type === "cosmicVFX" || n.data.type === "pipeline_cosmic-vfx");
  const needsVfxPack = processingNodes.some(n => n.data.type === "vfxPack" || n.data.type === "pipeline_vfx-pack");

  let modesConfig = "";
  if (mode === "video") {
    modesConfig = "\n    modes: ClassVar[dict] = {\"video\": ModeDefaults(default=True)}";
  } else if (mode === "text") {
    modesConfig = "\n    modes: ClassVar[dict] = {\"text\": ModeDefaults(default=True)}";
  } else if (mode === "image") {
    modesConfig = "\n    modes: ClassVar[dict] = {\"image\": ModeDefaults(default=True)}";
  } else {
    modesConfig = "\n    modes: ClassVar[dict] = {\"text\": ModeDefaults(default=True), \"video\": ModeDefaults(default=False)}";
  }

  let usageType: string;
  let usageComment = "";
  if (usage === "preprocessor") {
    usageType = "\n    usage: ClassVar[list] = [UsageType.PREPROCESSOR]";
    usageComment = "This pipeline runs before the main generative model";
  } else if (usage === "postprocessor") {
    usageType = "\n    usage: ClassVar[list] = [UsageType.POSTPROCESSOR]";
    usageComment = "This pipeline runs after the main generative model";
  } else if (usage === "all") {
    usageType = "\n    usage: ClassVar[list] = [UsageType.PREPROCESSOR, UsageType.POSTPROCESSOR]";
    usageComment = "This pipeline can run as both preprocessor and postprocessor";
  } else {
    usageType = "\n    usage: ClassVar[list] = []";
    usageComment = "Main generative pipeline";
  }

  // Convert JS boolean to Python boolean
  const pythonSupportsPrompts = supportsPrompts ? "True" : "False";

  const helpers: string[] = [];
  if (needsKaleido) {
    helpers.push(KALEIDO_HELPER);
  }
  if (needsKaleidoscope) {
    helpers.push(KALEIDOSCOPE_HELPER);
  }
  if (needsVignette) {
    helpers.push(VIGNETTE_HELPER);
  }
  if (needsColorGrading) {
    helpers.push(COLOR_GRADING_HELPER);
  }
  if (needsChromatic) {
    helpers.push(CHROMATIC_HELPER);
  }
  if (needsVHS) {
    helpers.push(VHS_HELPER);
  }
  if (needsHalftone) {
    helpers.push(HALFTONE_HELPER);
  }
  if (needsBloom) {
    helpers.push(BLOOM_HELPER);
  }
  if (needsCosmicVFX) {
    helpers.push(COSMIC_VFX_HELPER);
  }
  if (needsVfxPack) {
    helpers.push(VFX_PACK_HELPER);
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
    
    pipeline_id: ClassVar[str] = "${pluginId}"
    pipeline_name: ClassVar[str] = "${pluginName}"
    pipeline_description: ClassVar[str] = "${pluginDescription}"
    supports_prompts: ClassVar[bool] = ${pythonSupportsPrompts}${usageType}${modesConfig}${schemaFields}


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


${helpers.join("\n\n")}

def register_pipelines(register):
    """Hook to register this pipeline with Scope."""
    register(${toPascalCase(pluginId)}Pipeline)
`;
}

export function generatePluginFiles(nodes: any[], edges: any[]): Record<string, string> {
  const configNode = nodes.find((n) => n.data.type === "pluginConfig");
  const pluginId = ((configNode?.data?.config?.pipelineId as string) || "my-plugin").replace(/[^a-z0-9-]/g, "-").toLowerCase();
  const pascalName = toPascalCase(pluginId);
  const snakeName = pluginId.replace(/-/g, "_");
  
  // Check for embedded sample code
  const sampleCode = getSampleCode(pluginId);
  
  let pluginCode: string;
  let schemaCode: string;
  
  if (sampleCode) {
    pluginCode = sampleCode.pipeline;
    schemaCode = sampleCode.schema;
  } else {
    pluginCode = generatePlugin(nodes, edges);
    schemaCode = extractSchemaFromPlugin(pluginCode, pascalName);
  }
  
  return {
    "pyproject.toml": generatePyprojectToml(pluginId, snakeName),
    [`src/${snakeName}/__init__.py`]: generateInitPy(pascalName),
    [`src/${snakeName}/pipelines/__init__.py`]: "",
    [`src/${snakeName}/pipelines/schema.py`]: schemaCode,
    [`src/${snakeName}/pipelines/pipeline.py`]: pluginCode,
    ["tests/__init__.py"]: "",
    ["tests/conftest.py"]: generateConftest(),
    [`tests/test_${snakeName}_pipeline.py`]: generateTestFile(pascalName, snakeName),
    [".gitignore"]: generateGitignore(),
    ["README.md"]: generateReadme(pascalName, pluginId),
  };
}

function generatePyprojectToml(pluginId: string, snakeName: string): string {
  return `[project]
name = "${pluginId}"
version = "0.1.0"
description = "Generated by OpenScope"
requires-python = ">=3.12"

[project.optional-dependencies]
dev = ["pytest"]

[project.entry-points."scope"]
${snakeName} = "src.${snakeName}"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/${snakeName}"]
`;
}

function generateInitPy(pascalName: string): string {
  return `"""${pascalName} Plugin - Generated by OpenScope."""

from scope.core.plugins.hookspecs import hookimpl


@hookimpl
def register_pipelines(register):
    from .pipelines.pipeline import ${pascalName}Pipeline

    register(${pascalName}Pipeline)
`;
}

function generateConftest(): string {
  return `import pytest


@pytest.fixture
def dummy_frames():
    """Provide dummy video frames for testing."""
    import torch
    # Returns a list of dummy frames (1, H, W, C) in [0, 255]
    return [torch.randint(0, 256, (1, 256, 256, 3), dtype=torch.uint8)]
`;
}

function generateTestFile(pascalName: string, snakeName: string): string {
  return `"""Tests for ${pascalName} pipeline."""

import pytest
import torch


class Test${pascalName}Pipeline:
    """Test cases for ${pascalName}Pipeline."""

    def test_pipeline_init(self):
        """Test pipeline can be initialized."""
        from src.${snakeName}.pipelines.pipeline import ${pascalName}Pipeline
        
        pipeline = ${pascalName}Pipeline()
        assert pipeline is not None

    def test_pipeline_prepare(self):
        """Test pipeline prepare method."""
        from src.${snakeName}.pipelines.pipeline import ${pascalName}Pipeline
        
        pipeline = ${pascalName}Pipeline()
        requirements = pipeline.prepare()
        assert requirements is not None

    def test_pipeline_call(self):
        """Test pipeline can process frames."""
        from src.${snakeName}.pipelines.pipeline import ${pascalName}Pipeline
        
        pipeline = ${pascalName}Pipeline()
        
        # Create dummy input frames
        frames = [torch.randint(0, 256, (1, 256, 256, 3), dtype=torch.uint8) for _ in range(2)]
        
        # Process frames
        result = pipeline(video=frames)
        
        assert "video" in result
        assert result["video"] is not None

    def test_config_class(self):
        """Test pipeline config class exists."""
        from src.${snakeName}.pipelines.pipeline import ${pascalName}Pipeline
        from src.${snakeName}.pipelines.schema import ${pascalName}Config
        
        assert ${pascalName}Pipeline.get_config_class() == ${pascalName}Config
`;
}

function generateGitignore(): string {
  return `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# Virtual environments
venv/
.venv/

# Distribution / packaging
*.egg-info/
dist/
build/

# IDE
.vscode/
.idea/

# Testing
.pytest_cache/
.coverage
htmlcov/

# Logs
*.log

# OS
.DS_Store
Thumbs.db
`;
}

function generateReadme(pascalName: string, pluginId: string): string {
  return `# ${pascalName}

Generated by OpenScope

## Installation

\`\`\`bash
# From Git
uv run daydream-scope install https://github.com/yourusername/${pluginId}

# Or local development
uv run daydream-scope install -e /path/to/${pluginId}
\`\`\`

## Development

\`\`\`bash
# Install in editable mode
uv pip install -e .

# Run tests
pytest
\`\`\`
`;
}

// Extract schema class from the generated plugin code
function extractSchemaFromPlugin(pluginCode: string, pascalName: string): string {
  // Find the Config class in the generated code - look for the entire class definition
  const configMatch = pluginCode.match(/class (\w+Config)\(BasePipelineConfig\):[\s\S]*?(?=\nclass \w+Pipeline|Pipeline\(Pipeline\):)/);
  
  if (configMatch) {
    // Extract and fix the config class
    let schemaCode = configMatch[0];
    
    // Fix common issues:
    // 1. Add ClassVar type annotations to class variables that don't have them
    schemaCode = schemaCode.replace(/^(\s+)(pipeline_id|pipeline_name|pipeline_description|supports_prompts|usage|modes)(\s*=)/gm, '$1$2: ClassVar[str]$3');
    schemaCode = schemaCode.replace(/^(\s+)(supports_prompts)(\s*=\s*)(true|false)/gm, '$1$2: ClassVar[bool] = $4');
    schemaCode = schemaCode.replace(/^(\s+)(supports_prompts)(\s*=\s*)(true|false)/gm, (match, indent, name, eq, val) => {
      return `${indent}${name}: ClassVar[bool] = ${val === 'true' ? 'True' : 'False'}`;
    });
    
    // 2. Fix JS booleans to Python
    schemaCode = schemaCode.replace(/= true\b/g, '= True');
    schemaCode = schemaCode.replace(/= false\b/g, '= False');
    
    // 3. Fix string representations of lists/dicts
    schemaCode = schemaCode.replace(/: ClassVar\[list\]\s*=\s*"\[(.*?)\]"/g, ': ClassVar[list] = [$1]');
    schemaCode = schemaCode.replace(/: ClassVar\[dict\]\s*=\s*"\{(.*?)\}"/g, ': ClassVar[dict] = {$1}');
    
    return `"""${pascalName} pipeline configuration."""

from __future__ import annotations

from typing import ClassVar

from pydantic import Field

from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    UsageType,
    ui_field_config,
)

${schemaCode}
`;
  }
  
  // Default schema if none found
  const lowerName = pascalName.toLowerCase();
  return `"""${pascalName} pipeline configuration."""

from __future__ import annotations

from typing import ClassVar

from pydantic import Field

from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    UsageType,
    ui_field_config,
)


class ${pascalName}Config(BasePipelineConfig):
    """Configuration for the ${pascalName} pipeline."""

    pipeline_id: ClassVar[str] = "${lowerName}"
    pipeline_name: ClassVar[str] = "${pascalName}"
    pipeline_description: ClassVar[str] = "Generated by OpenScope"
    supports_prompts: ClassVar[bool] = False
    usage: ClassVar[list] = []
    modes: ClassVar[dict] = {"video": ModeDefaults(default=True)}
`;
}

export function generateNodeCode(nodeType: string, config: Record<string, unknown>): string {
  const EFFECT_TEMPLATES: Record<string, (config: Record<string, unknown>) => string> = {
    brightness: (cfg) => `import torch
import cv2

def process_frames(frames, **kwargs):
    """Adjust brightness of video frames"""
    value = kwargs.get("brightness_value", ${cfg.value ?? 0})
    alpha = 1.0 + (value / 100)
    result = []
    for frame in frames:
        # frame is (H, W, C) in [0, 255] range
        adjusted = cv2.convertScaleAbs(frame, alpha=alpha, beta=0)
        result.append(adjusted)
    return result`,
    
    contrast: (cfg) => `import torch
import cv2

def process_frames(frames, **kwargs):
    """Adjust contrast of video frames"""
    value = kwargs.get("contrast_value", ${cfg.value ?? 1})
    result = []
    for frame in frames:
        adjusted = cv2.convertScaleAbs(frame, alpha=value, beta=0)
        result.append(adjusted)
    return result`,
    
    blur: (cfg) => `import torch
import cv2

def process_frames(frames, **kwargs):
    """Apply Gaussian blur to video frames"""
    radius = kwargs.get("blur_radius", ${cfg.radius ?? 5})
    radius = radius if radius % 2 == 1 else radius + 1
    result = []
    for frame in frames:
        blurred = cv2.GaussianBlur(frame, (radius, radius), 0)
        result.append(blurred)
    return result`,
    
    mirror: (cfg) => `import torch
import cv2

def process_frames(frames, **kwargs):
    """Flip video frames horizontally, vertically, or both"""
    mode = kwargs.get("mirror_mode", "${cfg.mode ?? 'horizontal'}")
    flip_code = {"horizontal": 1, "vertical": 0, "both": -1}.get(mode, 1)
    result = []
    for frame in frames:
        flipped = cv2.flip(frame, flip_code)
        result.append(flipped)
    return result`,
    
    kaleidoscope: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """Kaleidoscope/mirror symmetry effect"""
    slices = kwargs.get("kaleidoscope_slices", ${cfg.rotationalSlices ?? 6})
    rotation = kwargs.get("kaleidoscope_rotation", ${cfg.rotationDeg ?? 0})
    zoom = kwargs.get("kaleidoscope_zoom", ${cfg.zoom ?? 1.0})
    mix = kwargs.get("kaleidoscope_mix", ${cfg.mix ?? 1.0})
    # Implementation uses torch for GPU acceleration
    return frames  # Placeholder`,
    
    chromatic: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """RGB channel displacement effect"""
    enabled = kwargs.get("chromatic_enabled", ${cfg.enabled !== false})
    if not enabled:
        return frames
    intensity = kwargs.get("chromatic_intensity", ${cfg.intensity ?? 0.3})
    angle = kwargs.get("chromatic_angle", ${cfg.angle ?? 0}) * np.pi / 180
    h, w = frames[0].shape[:2]
    dx = int(intensity * 20 * np.cos(angle))
    dy = int(intensity * 20 * np.sin(angle))
    result = []
    for frame in frames:
        b = frame[:, :, 0]
        g = frame[:, :, 1]
        r = frame[:, :, 2]
        b_shift = np.clip(np.pad(b, ((abs(dy), 0), (abs(dx), 0)), mode='edge')[:h, :w], 0, 255).astype(np.uint8)
        r_shift = np.clip(np.pad(r, ((abs(dy), 0), (abs(dx), 0)), mode='edge')[:h, :w], 0, 255).astype(np.uint8)
        result.append(np.stack([b_shift, g, r_shift], axis=-1))
    return result`,
    
    vhs: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """Retro VHS / CRT effect"""
    enabled = kwargs.get("vhs_enabled", ${cfg.enabled === true})
    if not enabled:
        return frames
    scan_intensity = kwargs.get("scan_line_intensity", ${cfg.scanLineIntensity ?? 0.3})
    scan_count = kwargs.get("scan_line_count", ${cfg.scanLineCount ?? 100})
    noise = kwargs.get("vhs_noise", ${cfg.noise ?? 0.1})
    tracking = kwargs.get("tracking_distortion", ${cfg.tracking ?? 0.2})
    result = []
    for frame in frames:
        # Scanlines
        for i in range(0, frame.shape[0], scan_count):
            frame[i:i+1, :, :] = frame[i:i+1, :, :] * (1 - scan_intensity)
        # Noise
        if noise > 0:
            noise_frame = np.random.normal(0, noise * 255, frame.shape).astype(np.uint8)
            frame = cv2.add(frame, noise_frame)
        result.append(frame)
    return result`,
    
    halftone: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """Newspaper dot pattern effect"""
    enabled = kwargs.get("halftone_enabled", ${cfg.enabled === true})
    if not enabled:
        return frames
    dot_size = kwargs.get("halftone_dot_size", ${cfg.dotSize ?? 8})
    sharpness = kwargs.get("halftone_sharpness", ${cfg.sharpness ?? 0.7})
    # Implementation uses torch for GPU acceleration
    return frames  # Placeholder`,
    
    vignette: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """Darken edges of frames for cinematic look"""
    intensity = kwargs.get("vignette_intensity", ${cfg.intensity ?? 0.5})
    smoothness = kwargs.get("vignette_smoothness", ${cfg.smoothness ?? 0.5})
    result = []
    for frame in frames:
        rows, cols = frame.shape[:2]
        kernel_x = cv2.getGaussianKernel(cols, cols * smoothness)
        kernel_y = cv2.getGaussianKernel(rows, rows * smoothness)
        kernel = kernel_y * kernel_x.T
        mask = kernel / kernel.max()
        mask = cv2.resize(mask, (cols, rows))
        vignetted = (frame * mask[..., np.newaxis] * (1 - intensity) + frame * intensity).astype(np.uint8)
        result.append(vignetted)
    return result`,
    
    bloom: (cfg) => `import torch
import torch.nn.functional as F

def process_frames(frames, **kwargs):
    """Bloom/glow effect"""
    threshold = kwargs.get("bloom_threshold", ${cfg.threshold ?? 0.8})
    intensity = kwargs.get("bloom_intensity", ${cfg.intensity ?? 1.0})
    radius = kwargs.get("bloom_radius", ${cfg.radius ?? 8})
    # Implementation uses torch for GPU acceleration
    return frames  # Placeholder`,
    
    colorGrading: (cfg) => `import torch
import cv2

def process_frames(frames, **kwargs):
    """Professional color correction"""
    temp = kwargs.get("color_temperature", ${cfg.temperature ?? 0})
    tint = kwargs.get("color_tint", ${cfg.tint ?? 0})
    sat = kwargs.get("color_saturation", ${cfg.saturation ?? 0})
    contrast = kwargs.get("color_contrast", ${cfg.contrast ?? 0})
    result = []
    for frame in frames:
        # Temperature (red/blue shift)
        if temp != 0:
            frame = frame.astype(np.float32)
            frame[:, :, 0] = frame[:, :, 0] * (1 + temp * 0.01)
            frame[:, :, 2] = frame[:, :, 2] * (1 - temp * 0.01)
            frame = np.clip(frame, 0, 255).astype(np.uint8)
        result.append(frame)
    return result`,
    
    custom: (cfg) => {
      const code = cfg.code as string;
      if (code) return code;

      const createNewKind = cfg.createNewKind as string;
      const isPreprocessor = createNewKind === "preprocessor";
      const kindLabel = isPreprocessor ? "Preprocessor" : "Postprocessor";

      return `# Custom ${kindLabel}
# Define your processing logic below.
# The frames parameter is a list of video frames in (H, W, C) format.
# Return the processed frames.

import torch
import numpy as np

def process_frames(frames, **kwargs):
    """
    Custom ${kindLabel} processing function.
    - frames: list of video frames in [0, 255] range
    - kwargs: additional parameters passed at runtime
    """
    # Your processing code here
    # Example: apply a simple filter to each frame
    # for i, frame in enumerate(frames):
    #     # process frame
    #     pass
    
    return frames
`;
    },

    // Pipeline-prefixed nodes (from plugins)
    "pipeline_kaleido-scope": (cfg) => `import torch
import numpy as np
from scope.cloud import cloud_proxy

@cloud_proxy
class KaleidoScopePipeline:
    """Kaleidoscope/mirror symmetry effect from kaleido-scope plugin"""
    
    def __init__(self):
        pass
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        # Parameters from config:
        enabled = kwargs.get("kaleidoscope_enabled", True)
        mix = kwargs.get("kaleidoscope_mix", 1.0)
        mirror_mode = kwargs.get("kaleidoscope_mirror_mode", "none")
        rotational_enabled = kwargs.get("kaleidoscope_rotational_enabled", True)
        rotational_slices = kwargs.get("kaleidoscope_slices", 6)
        rotation = kwargs.get("kaleidoscope_rotation", 0.0)
        zoom = kwargs.get("kaleidoscope_zoom", 1.0)
        warp = kwargs.get("kaleidoscope_warp", 0.0)
        
        # Implementation in kaleido_scope/effects/kaleido.py
        return frames`,

    "pipeline_bloom": (cfg) => `import torch
import numpy as np
from scope.cloud import cloud_proxy

@cloud_proxy
class BloomPipeline:
    """Bloom/glow post-processing effect from scope-bloom plugin"""
    
    def __init__(self):
        pass
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        # Parameters from config:
        threshold = kwargs.get("bloom_threshold", 0.8)
        soft_knee = kwargs.get("bloom_soft_knee", 0.5)
        intensity = kwargs.get("bloom_intensity", 1.0)
        radius = kwargs.get("bloom_radius", 8)
        downsample = kwargs.get("bloom_downsample", 1)
        
        # Implementation in scope-bloom/my_scope_plugin/pipelines/bloom_pipeline.py
        return frames`,

    "pipeline_cosmic-vfx": (cfg) => `import torch
import numpy as np
from scope.cloud import cloud_proxy

@cloud_proxy
class CosmicVFXPipeline:
    """30+ visual effects from scope-cosmic-vfx plugin"""
    
    def __init__(self):
        pass
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        # Parameters from config:
        enable_glitch = kwargs.get("cosmic_enable_glitch", True)
        glitch_intensity = kwargs.get("cosmic_glitch_intensity", 1.0)
        enable_retro = kwargs.get("cosmic_enable_retro", True)
        retro_intensity = kwargs.get("cosmic_retro_intensity", 1.0)
        enable_distortion = kwargs.get("cosmic_enable_distortion", True)
        distortion_intensity = kwargs.get("cosmic_distortion_intensity", 1.0)
        enable_color = kwargs.get("cosmic_enable_color", False)
        color_intensity = kwargs.get("cosmic_color_intensity", 1.0)
        intensity = kwargs.get("cosmic_intensity", 1.0)
        
        # Implementation in scope-cosmic-vfx/src/scope_cosmic_vfx/pipeline.py
        return frames`,

    "pipeline_vfx-pack": (cfg) => `import torch
import numpy as np
from scope.cloud import cloud_proxy

@cloud_proxy
class VFXPackPipeline:
    """VFX pack: Chromatic, VHS, Halftone from scope-vfx plugin"""
    
    def __init__(self):
        pass
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        # Parameters from config:
        chromatic_enabled = kwargs.get("vfx_chromatic_enabled", True)
        chromatic_intensity = kwargs.get("vfx_chromatic_intensity", 0.3)
        vhs_enabled = kwargs.get("vfx_vhs_enabled", False)
        halftone_enabled = kwargs.get("vfx_halftone_enabled", False)
        
        # Implementation in scope-vfx/src/scope_vfx/pipeline.py
        return frames`,

    "pipeline_yolo_mask": (cfg) => `import torch
import numpy as np
from scope.cloud import cloud_proxy

@cloud_proxy
class YOLOMaskPipeline:
    """YOLO segmentation from scope_yolo_mask plugin"""
    
    def __init__(self):
        pass
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        # Parameters from config:
        model_size = kwargs.get("yolo_model_size", "nano")
        target_class = kwargs.get("yolo_target_class", "person")
        confidence = kwargs.get("yolo_confidence", 0.5)
        
        # Implementation in scope_yolo_mask/src/scope_yolo_mask/pipeline.py
        return frames`,

    // Additional built-in node types
    kaleido: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """Kaleidoscope/symmetry effect"""
    slices = kwargs.get("kaleido_slices", ${cfg.slices ?? 6})
    rotation = kwargs.get("kaleido_rotation", ${cfg.rotation ?? 0})
    zoom = kwargs.get("kaleido_zoom", ${cfg.zoom ?? 1.0})
    # Implementation using torch for GPU acceleration
    return frames`,

    blend: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """Blend two video sources"""
    mode = kwargs.get("blend_mode", "${cfg.mode ?? 'add'}")
    opacity = kwargs.get("blend_opacity", ${cfg.opacity ?? 0.5})
    # Requires second input frames
    return frames`,

    segmentation: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """AI segmentation for object detection/masking"""
    model = kwargs.get("segmentation_model", "${cfg.model ?? 'sam'}")
    target_class = kwargs.get("target_class", "${cfg.targetClass ?? 'person'}")
    confidence = kwargs.get("confidence_threshold", ${cfg.confidence ?? 0.5})
    # Returns frames and masks
    return frames, None`,

    depthEstimation: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """Generate depth maps for VACE structural guidance"""
    model = kwargs.get("depth_model", "${cfg.model ?? 'depth-anything'}")
    # Returns frames and depth maps
    return frames, None`,

    backgroundRemoval: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """Remove background with transparent alpha"""
    model = kwargs.get("bg_model", "${cfg.model ?? 'u2net'}")
    # Returns RGBA frames
    return frames`,

    upscaling: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """AI-powered video resolution upscaling"""
    scale = kwargs.get("upscale_scale", ${parseInt(String(cfg.scale ?? 2))})
    model = kwargs.get("upscale_model", "${cfg.model ?? 'realesrgan'}")
    # Implementation using AI upscaling model
    return frames`,

    denoising: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """AI video denoising"""
    strength = kwargs.get("denoise_strength", ${cfg.strength ?? 0.5})
    method = kwargs.get("denoise_method", "${cfg.method ?? 'bm3d'}")
    # Implementation using denoising model
    return frames`,

    styleTransfer: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """Apply artistic styles to video"""
    style = kwargs.get("style_type", "${cfg.style ?? 'anime'}")
    strength = kwargs.get("style_strength", ${cfg.strength ?? 0.7})
    # Implementation using style transfer model
    return frames`,

    yoloMask: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """YOLO segmentation for object detection/masking"""
    model_size = kwargs.get("yolo_model_size", "${cfg.modelSize ?? 'nano'}")
    target_class = kwargs.get("yolo_target_class", "${cfg.targetClass ?? 'person'}")
    confidence = kwargs.get("yolo_confidence", ${cfg.confidenceThreshold ?? 0.5})
    # Returns frames and masks
    return frames, None`,

    cosmicVFX: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """30+ visual effects"""
    enable_glitch = kwargs.get("cosmic_enable_glitch", True)
    glitch_intensity = kwargs.get("cosmic_glitch_intensity", 1.0)
    enable_retro = kwargs.get("cosmic_enable_retro", True)
    retro_intensity = kwargs.get("cosmic_retro_intensity", 1.0)
    enable_distortion = kwargs.get("cosmic_enable_distortion", True)
    distortion_intensity = kwargs.get("cosmic_distortion_intensity", 1.0)
    enable_color = kwargs.get("cosmic_enable_color", False)
    color_intensity = kwargs.get("cosmic_color_intensity", 1.0)
    intensity = kwargs.get("cosmic_intensity", 1.0)
    # Implementation in scope-cosmic-vfx
    return frames`,

    vfxPack: (cfg) => `import torch
import numpy as np

def process_frames(frames, **kwargs):
    """VFX pack: Chromatic, VHS, Halftone"""
    chromatic_enabled = kwargs.get("vfx_chromatic_enabled", True)
    chromatic_intensity = kwargs.get("vfx_chromatic_intensity", 0.3)
    vhs_enabled = kwargs.get("vfx_vhs_enabled", False)
    halftone_enabled = kwargs.get("vfx_halftone_enabled", False)
    # Implementation in scope-vfx
    return frames`,

    mask: (cfg) => `import torch

def process_frames(frames, **kwargs):
    """Generate masks for specific objects"""
    target_class = kwargs.get("target_class", "${cfg.targetClass ?? 'person'}")
    confidence = kwargs.get("confidence_threshold", ${cfg.confidence ?? 0.5})
    return frames, None`,

    videoInput: (cfg) => `import cv2

def process_frames(**kwargs):
    """Video input node - captures frames from camera or file"""
    frames = kwargs.get("frames", 1)
    # Frame capture implementation
    return []`,

    textPrompt: (cfg) => `def process_frames(**kwargs):
    """Text prompt input with optional weight for AI generation"""
    text = kwargs.get("text", "")
    weight = kwargs.get("weight", 1.0)
    return {"text": text, "weight": weight}`,

    imageInput: (cfg) => `from PIL import Image
import numpy as np

def process_frames(**kwargs):
    """Image reference input for image-to-video pipelines"""
    path = kwargs.get("path", "")
    # Load image and convert to array
    return None`,

    parameters: (cfg) => `def process_frames(**kwargs):
    """Key-value parameter storage for runtime configuration"""
    key = kwargs.get("key", "")
    value = kwargs.get("value", "")
    return {key: value}`,

    pipelineOutput: (cfg) => `def process_frames(frames, **kwargs):
    """Main pipeline output marker"""
    usage = kwargs.get("usage", "main")
    return frames`,

    noteGuide: (cfg) => `def process_frames(**kwargs):
    """Note/guide node"""
    return None`,

    pluginConfig: (cfg) => `from scope.core.pipeline import BasePipeline, BasePipelineConfig

class PluginConfig(BasePipelineConfig):
    pipeline_id: str = "${cfg.pipelineId ?? 'my_plugin'}"
    pipeline_name: str = "${cfg.pluginName ?? 'My Plugin'}"
    usage: str = "${cfg.usage ?? 'main'}"
    mode: str = "${cfg.mode ?? 'video'}"
    supports_prompts: bool = ${cfg.supportsPrompts !== false}`,

    pipeline: (cfg) => `from scope.cloud import cloud_proxy

@cloud_proxy
class Pipeline:
    """Main pipeline from Scope server"""
    
    def __init__(self):
        pass
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        pipeline_id = "${cfg.pipelineId ?? 'passthrough'}"
        return frames`,
  };

  // Check for pipeline_ prefix first
  if (nodeType.startsWith("pipeline_")) {
    const pipelineId = nodeType.replace("pipeline_", "");
    if (EFFECT_TEMPLATES[`pipeline_${pipelineId}`]) {
      return EFFECT_TEMPLATES[`pipeline_${pipelineId}`](config);
    }
  }

  if (EFFECT_TEMPLATES[nodeType]) {
    return EFFECT_TEMPLATES[nodeType](config);
  }
  
  return `# No template for ${nodeType}
# This node type does not have a code template yet.
# Use the visual mode to configure this node.

def process_frames(frames, **kwargs):
    return frames`;
}
