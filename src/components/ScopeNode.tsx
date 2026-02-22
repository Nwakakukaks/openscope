"use client";

import { memo, useRef, useEffect, useState, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Video,
  Type,
  Image as ImageIcon,
  Settings,
  SunMedium,
  Contrast,
  CircleDashed,
  Maximize2,
  Hexagon,
  Layers,
  EyeOff,
  Play,
  Square,
  Trash2,
  FileUp,
  StickyNote,
  Zap,
  Code,
  Eye,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Cpu,
  Layers2,
  Wand2,
  Sparkles,
  Tv,
  Loader2,
  Webcam,
  MessageSquare,
  Send,
  BrainCog,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { usePipelineSchemas } from "@/context/PipelineSchemasContext";
import CodeEditor from "./CodeEditor";
import { generateNodeCode } from "@/lib/codeGenerator";
import { parsePythonConfig } from "@/lib/pythonConfigParser";
import { showSuccess, showError } from "@/lib/toast";

const DEFAULT_CODE_TEMPLATES: Record<string, string> = {
  pluginConfig: `from scope.core.plugins import hookimpl
from scope.core.pipeline import BasePipeline, BasePipelineConfig

class {{class_name}}Config(BasePipelineConfig):
    pipeline_id: str = "{{pipeline_id}}"
    pipeline_name: str = "{{pipeline_name}}"
    usage: str = "{{usage}}"  # main, preprocessor, postprocessor, all
    mode: str = "{{mode}}"  # text or video
    supports_prompts: bool = {{supports_prompts}}

class {{class_name}}(BasePipeline):
    config_class = {{class_name}}Config
    
    def process(self, frames, prompts=None, **kwargs):
        # Your processing logic here
        return frames
`,
  videoInput: `from scope.core.pipeline import BasePipeline, FrameInput

class VideoInput:
    """Video input node - captures frames from camera or file"""
    
    def __init__(self, frames: int = 1):
        self.frames = frames
    
    def process(self, input_source=None, **kwargs):
        # Get video frames
        # frames = FrameInput.read(input_source, self.frames)
        frames = []  # TODO: Implement frame capture
        return frames
`,
  textPrompt: `from scope.core.pipeline import BasePipeline

class TextPrompt:
    """Text prompt input with optional weight for AI generation"""
    
    def __init__(self, text: str = "", weight: float = 1.0):
        self.text = text
        self.weight = weight
    
    def process(self, **kwargs):
        return {
            "text": self.text,
            "weight": self.weight,
            "tokens": None  # TODO: Tokenize if needed
        }
`,
  imageInput: `from scope.core.pipeline import BasePipeline
from PIL import Image
import numpy as np

class ImageInput:
    """Image reference input for image-to-video pipelines"""
    
    def __init__(self, path: str = ""):
        self.path = path
    
    def process(self, **kwargs):
        if self.path:
            # img = Image.open(self.path)
            # arr = np.array(img)
            pass
        return None  # TODO: Load and return image array
`,
  parameters: `from scope.core.pipeline import BasePipeline

class Parameters:
    """Key-value parameter storage for runtime configuration"""
    
    def __init__(self, key: str = "", value: str = ""):
        self.key = key
        self.value = value
    
    def process(self, **kwargs):
        return {self.key: self.value}
`,
  brightness: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Brightness:
    """Adjust brightness of video frames"""
    
    def __init__(self, value: int = 0):
        # Range: -100 to 100
        self.value = value
    
    def process(self, frames, **kwargs):
        # alpha = 1.0 + (self.value / 100)
        # adjusted = cv2.convertScaleAbs(frames, alpha=alpha, beta=0)
        return frames  # TODO: Implement brightness adjustment
`,
  contrast: `from scope.core.pipeline import BasePipeline
import cv2

class Contrast:
    """Adjust contrast of video frames"""
    
    def __init__(self, value: float = 1.0):
        # Range: 0 to 3
        self.value = value
    
    def process(self, frames, **kwargs):
        # adjusted = cv2.convertScaleAbs(frames, alpha=self.value, beta=0)
        return frames  # TODO: Implement contrast adjustment
`,
  blur: `from scope.core.pipeline import BasePipeline
import cv2

class Blur:
    """Apply Gaussian blur to video frames"""
    
    def __init__(self, radius: int = 5):
        self.radius = radius if radius % 2 == 1 else radius + 1
    
    def process(self, frames, **kwargs):
        # blurred = cv2.GaussianBlur(frames, (self.radius, self.radius), 0)
        return frames  # TODO: Implement blur
`,
  mirror: `from scope.core.pipeline import BasePipeline
import cv2

class Mirror:
    """Flip video frames horizontally, vertically, or both"""
    
    def __init__(self, mode: str = "horizontal"):
        self.mode = mode  # horizontal, vertical, both
    
    def process(self, frames, **kwargs):
        # if self.mode == "horizontal":
        #     flipped = cv2.flip(frames, 1)
        # elif self.mode == "vertical":
        #     flipped = cv2.flip(frames, 0)
        # else:
        #     flipped = cv2.flip(frames, -1)
        return frames  # TODO: Implement mirror
`,
  kaleido: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Kaleido:
    """Kaleidoscope / mirror symmetry effect"""
    
    def __init__(self, slices: int = 6, rotation: float = 0, zoom: float = 1.0):
        self.slices = slices
        self.rotation = rotation
        self.zoom = zoom
    
    def process(self, frames, **kwargs):
        # Create symmetric kaleido effect
        # h, w = frames.shape[:2]
        # center = (w // 2, h // 2)
        # Apply radial symmetry
        return frames  # TODO: Implement kaleido
`,
  vignette: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Vignette:
    """Darken edges of frames for cinematic look"""
    
    def __init__(self, intensity: float = 0.5, smoothness: float = 0.5):
        self.intensity = intensity
        self.smoothness = smoothness
    
    def process(self, frames, **kwargs):
        # Create vignette mask and apply
        return frames  # TODO: Implement vignette
`,
  custom: `# Custom Effect
# Define parameters in the params field as JSON:
# [{"name": "intensity", "type": "float", "default": 0.5, "min": 0, "max": 1, "description": "Effect strength"}]

import torch

def process(frames, **kwargs):
    # frames: tensor of shape (T, H, W, C) in [0, 1] range
    # Access your parameters via kwargs, e.g.:
    # intensity = kwargs.get("intensity", 0.5)
    
    # Your processing code here
    return frames
`,
  blend: `from scope.core.pipeline import BasePipeline
import cv2

class Blend:
    """Blend two video sources together"""
    
    def __init__(self, mode: str = "add", opacity: float = 0.5):
        self.mode = mode  # add, multiply, screen, overlay
        self.opacity = opacity
    
    def process(self, frames, frames2=None, **kwargs):
        if frames2 is not None:
            # Blend frames with frames2 based on mode and opacity
            pass
        return frames  # TODO: Implement blend
`,
  segmentation: `from scope.core.pipeline import BasePipeline

class Segmentation:
    """AI segmentation for object detection/masking"""
    
    def __init__(self, model: str = "sam", target_class: str = "person", confidence: float = 0.5):
        self.model = model
        self.target_class = target_class
        self.confidence = confidence
    
    def process(self, frames, **kwargs):
        # Run segmentation model
        # masks = model.predict(frames, classes=[self.target_class])
        return frames, None  # TODO: Return frames + masks
`,
  depthEstimation: `from scope.core.pipeline import BasePipeline

class DepthEstimation:
    """Generate depth maps for VACE structural guidance"""
    
    def __init__(self, model: str = "depth-anything"):
        self.model = model
    
    def process(self, frames, **kwargs):
        # Run depth estimation model
        # depth_maps = model.predict(frames)
        return frames, None  # TODO: Return frames + depth maps
`,
  backgroundRemoval: `from scope.core.pipeline import BasePipeline

class BackgroundRemoval:
    """Remove background with transparent alpha"""
    
    def __init__(self, model: str = "u2net"):
        self.model = model
    
    def process(self, frames, **kwargs):
        # Run background removal
        # rgba_frames = model.predict(frames)
        return frames  # TODO: Return RGBA frames
`,
  colorGrading: `from scope.core.pipeline import BasePipeline
import cv2

class ColorGrading:
    """Professional color correction"""
    
    def __init__(self, temperature: int = 0, tint: int = 0, saturation: int = 0, contrast: int = 0):
        self.temperature = temperature
        self.tint = tint
        self.saturation = saturation
        self.contrast = contrast
    
    def process(self, frames, **kwargs):
        # Apply color grading adjustments
        return frames  # TODO: Implement color grading
`,
  upscaling: `from scope.core.pipeline import BasePipeline

class Upscaling:
    """AI-powered video resolution upscaling"""
    
    def __init__(self, scale: int = 2, model: str = "realesrgan"):
        self.scale = scale
        self.model = model
    
    def process(self, frames, **kwargs):
        # Run upscaling model
        # upscaled = model.predict(frames, scale=self.scale)
        return frames  # TODO: Implement upscaling
`,
  denoising: `from scope.core.pipeline import BasePipeline

class Denoising:
    """AI video denoising"""
    
    def __init__(self, strength: float = 0.5, method: str = "bm3d"):
        self.strength = strength
        self.method = method
    
    def process(self, frames, **kwargs):
        # Run denoising
        # denoised = model.predict(frames, strength=self.strength)
        return frames  # TODO: Implement denoising
`,
  styleTransfer: `from scope.core.pipeline import BasePipeline

class StyleTransfer:
    """Apply artistic styles to video"""
    
    def __init__(self, style: str = "anime", strength: float = 0.7):
        self.style = style
        self.strength = strength
    
    def process(self, frames, **kwargs):
        # Run style transfer model
        # styled = model.predict(frames, style=self.style)
        return frames  # TODO: Implement style transfer
`,
  pipelineOutput: `from scope.core.pipeline import BasePipeline

class PipelineOutput:
    """Main pipeline output marker"""
    
    def __init__(self, usage: str = "main"):
        self.usage = usage  # main, preprocessor, postprocessor
    
    def process(self, frames, **kwargs):
        # This is the final output
        return frames
`,
};

function getNodeDefaultCode(nodeType: string, config?: Record<string, unknown>): string {
  const getParam = (key: string, def: unknown) => config?.[key] ?? def;
  
  if (nodeType.startsWith("pipeline_")) {
    const pipelineId = nodeType.replace("pipeline_", "");
    return `from scope.core.pipeline import BasePipeline, BasePipelineConfig
from scope.cloud import cloud_proxy

class ${toPascalCase(pipelineId)}Config(BasePipelineConfig):
    """Configuration for ${pipelineId} pipeline"""
    pass

@cloud_proxy
class ${toPascalCase(pipelineId)}(BasePipeline):
    config_class = ${toPascalCase(pipelineId)}Config
    
    def process(self, frames, **kwargs):
        # Remote inference via Scope cloud
        # This runs on the Scope server
        return frames  # TODO: Implement ${pipelineId}
`;
  }

  const templates: Record<string, string> = {
    brightness: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Brightness:
    """Adjust brightness of video frames"""
    
    def __init__(self, value: int = ${getParam("value", 0)}):
        self.value = value  # Range: -100 to 100
    
    def process(self, frames, **kwargs):
        alpha = 1.0 + (self.value / 100)
        adjusted = cv2.convertScaleAbs(frames, alpha=alpha, beta=0)
        return adjusted
`,
    contrast: `from scope.core.pipeline import BasePipeline
import cv2

class Contrast:
    """Adjust contrast of video frames"""
    
    def __init__(self, value: float = ${getParam("value", 1.0)}):
        self.value = value  # Range: 0 to 3
    
    def process(self, frames, **kwargs):
        adjusted = cv2.convertScaleAbs(frames, alpha=self.value, beta=0)
        return adjusted
`,
    blur: `from scope.core.pipeline import BasePipeline
import cv2

class Blur:
    """Apply Gaussian blur to video frames"""
    
    def __init__(self, radius: int = ${getParam("radius", 5)}):
        self.radius = radius if radius % 2 == 1 else radius + 1
    
    def process(self, frames, **kwargs):
        blurred = cv2.GaussianBlur(frames, (self.radius, self.radius), 0)
        return blurred
`,
    mirror: `from scope.core.pipeline import BasePipeline
import cv2

class Mirror:
    """Flip video frames horizontally, vertically, or both"""
    
    def __init__(self, mode: str = "${getParam("mode", "horizontal")}"):
        self.mode = mode  # horizontal, vertical, both
    
    def process(self, frames, **kwargs):
        flip_code = {"horizontal": 1, "vertical": 0, "both": -1}.get(self.mode, 1)
        flipped = cv2.flip(frames, flip_code)
        return flipped
`,
    kaleido: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Kaleido:
    """Kaleidoscope / mirror symmetry effect"""
    
    def __init__(self, slices: int = ${getParam("slices", 6)}, rotation: float = ${getParam("rotation", 0)}, zoom: float = ${getParam("zoom", 1.0)}):
        self.slices = slices
        self.rotation = rotation
        self.zoom = zoom
    
    def process(self, frames, **kwargs):
        h, w = frames.shape[:2]
        center = (w // 2, h // 2)
        # Apply radial symmetry
        return frames  # TODO: Implement kaleido
`,
    vignette: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Vignette:
    """Darken edges of frames for cinematic look"""
    
    def __init__(self, intensity: float = ${getParam("intensity", 0.5)}, smoothness: float = ${getParam("smoothness", 0.5)}):
        self.intensity = intensity
        self.smoothness = smoothness
    
    def process(self, frames, **kwargs):
        rows, cols = frames.shape[:2]
        kernel_x = cv2.getGaussianKernel(cols, cols * self.smoothness)
        kernel_y = cv2.getGaussianKernel(rows, rows * self.smoothness)
        kernel = kernel_y * kernel_x.T
        mask = kernel / kernel.max()
        mask = cv2.resize(mask, (cols, rows))
        vignetted = frames * mask[..., np.newaxis]
        return vignetted.astype(np.uint8)
`,
    blend: `from scope.core.pipeline import BasePipeline
import cv2

class Blend:
    """Blend two video sources together"""
    
    def __init__(self, mode: str = "${getParam("mode", "add")}", opacity: float = ${getParam("opacity", 0.5)}):
        self.mode = mode
        self.opacity = opacity
    
    def process(self, frames, frames2=None, **kwargs):
        if frames2 is not None:
            if self.mode == "add":
                blended = cv2.addWeighted(frames, 1-self.opacity, frames2, self.opacity, 0)
            elif self.mode == "multiply":
                blended = frames * (1-self.opacity) + frames2 * self.opacity
            else:
                blended = frames
            return blended
        return frames
`,
    segmentation: `from scope.core.pipeline import BasePipeline

class Segmentation:
    """AI segmentation for object detection/masking"""
    
    def __init__(self, model: str = "${getParam("model", "sam")}", target_class: str = "${getParam("targetClass", "person")}", confidence: float = ${getParam("confidence", 0.5)}):
        self.model = model
        self.target_class = target_class
        self.confidence = confidence
    
    def process(self, frames, **kwargs):
        # Run segmentation model (sam, sam2, yolo)
        # masks = model.predict(frames, classes=[self.target_class])
        return frames, None  # Return frames + masks
`,
    depthEstimation: `from scope.core.pipeline import BasePipeline

class DepthEstimation:
    """Generate depth maps for VACE structural guidance"""
    
    def __init__(self, model: str = "${getParam("model", "depth-anything")}"):
        self.model = model
    
    def process(self, frames, **kwargs):
        # Run depth estimation model
        # depth_maps = model.predict(frames)
        return frames, None  # Return frames + depth maps
`,
    backgroundRemoval: `from scope.core.pipeline import BasePipeline

class BackgroundRemoval:
    """Remove background with transparent alpha"""
    
    def __init__(self, model: str = "${getParam("model", "u2net")}"):
        self.model = model
    
    def process(self, frames, **kwargs):
        # Run background removal
        # rgba_frames = model.predict(frames)
        return frames  # Return RGBA frames
`,
    colorGrading: `from scope.core.pipeline import BasePipeline
import cv2

class ColorGrading:
    """Professional color correction"""
    
    def __init__(self, temperature: int = ${getParam("temperature", 0)}, tint: int = ${getParam("tint", 0)}, saturation: int = ${getParam("saturation", 0)}, contrast: int = ${getParam("contrast", 0)}):
        self.temperature = temperature
        self.tint = tint
        self.saturation = saturation
        self.contrast = contrast
    
    def process(self, frames, **kwargs):
        # Apply color grading
        # Temperature: shift red/blue, Tint: shift green/magenta
        # Saturation: convert to HSV and adjust S channel
        # Contrast: apply histogram equalization
        return frames  # TODO: Implement
`,
    upscaling: `from scope.core.pipeline import BasePipeline

class Upscaling:
    """AI-powered video resolution upscaling"""
    
    def __init__(self, scale: int = ${getParam("scale", 2)}, model: str = "${getParam("model", "realesrgan")}"):
        self.scale = scale
        self.model = model
    
    def process(self, frames, **kwargs):
        # Run upscaling model
        # upscaled = model.predict(frames, scale=self.scale)
        return frames  # TODO: Implement
`,
    denoising: `from scope.core.pipeline import BasePipeline

class Denoising:
    """AI video denoising"""
    
    def __init__(self, strength: float = ${getParam("strength", 0.5)}, method: str = "${getParam("method", "bm3d")}"):
        self.strength = strength
        self.method = method
    
    def process(self, frames, **kwargs):
        # Run denoising
        # denoised = model.predict(frames, strength=self.strength)
        return frames  # TODO: Implement
`,
    styleTransfer: `from scope.core.pipeline import BasePipeline

class StyleTransfer:
    """Apply artistic styles to video"""
    
    def __init__(self, style: str = "${getParam("style", "anime")}", strength: float = ${getParam("strength", 0.7)}):
        self.style = style
        self.strength = strength
    
    def process(self, frames, **kwargs):
        # Run style transfer model
        # styled = model.predict(frames, style=self.style)
        return frames  # TODO: Implement
`,
    chromatic: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class ChromaticAberration:
    """RGB channel displacement effect"""
    
    def __init__(self, enabled: bool = ${getParam("enabled", true)}, intensity: float = ${getParam("intensity", 0.3)}, angle: float = ${getParam("angle", 0)}):
        self.enabled = enabled
        self.intensity = intensity
        self.angle = angle * np.pi / 180
    
    def process(self, frames, **kwargs):
        if not self.enabled:
            return frames
        h, w = frames.shape[:2]
        dx = int(self.intensity * 20 * np.cos(self.angle))
        dy = int(self.intensity * 20 * np.sin(self.angle))
        b = frames[:, :, 0]
        g = frames[:, :, 1]
        r = frames[:, :, 2]
        b_shifted = np.clip(np.pad(b, ((abs(dy), 0), (abs(dx), 0)), mode='edge')[:h, :w], 0, 255).astype(np.uint8)
        r_shifted = np.clip(np.pad(r, ((abs(dy), 0), (abs(dx), 0)), mode='edge')[:h, :w], 0, 255).astype(np.uint8)
        return np.stack([b_shifted, g, r_shifted], axis=-1)
`,
    vhs: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np
import random

class VHS:
    """Retro VHS / CRT effect"""
    
    def __init__(self, enabled: bool = ${getParam("enabled", false)}, scanLineIntensity: float = ${getParam("scanLineIntensity", 0.3)}, scanLineCount: int = ${getParam("scanLineCount", 100)}, noise: float = ${getParam("noise", 0.1)}, tracking: float = ${getParam("tracking", 0.2)}):
        self.enabled = enabled
        self.scanLineIntensity = scanLineIntensity
        self.scanLineCount = scanLineCount
        self.noise = noise
        self.tracking = tracking
    
    def process(self, frames, **kwargs):
        if not self.enabled:
            return frames
        # Add scanlines
        for i in range(0, frames.shape[0], self.scanLineCount):
            frames[i:i+1, :, :] = frames[i:i+1, :, :] * (1 - self.scanLineIntensity)
        # Add noise
        if self.noise > 0:
            noise = np.random.normal(0, self.noise * 255, frames.shape).astype(np.uint8)
            frames = cv2.add(frames, noise)
        return frames
`,
    halftone: `from scope.core.pipeline import BasePipeline
import cv2
import numpy as np

class Halftone:
    """Newspaper dot pattern effect"""
    
    def __init__(self, enabled: bool = ${getParam("enabled", false)}, dotSize: int = ${getParam("dotSize", 8)}, sharpness: float = ${getParam("sharpness", 0.7)}):
        self.enabled = enabled
        self.dotSize = dotSize
        self.sharpness = sharpness
    
    def process(self, frames, **kwargs):
        if not self.enabled:
            return frames
        # Convert to grayscale for halftone pattern
        gray = cv2.cvtColor(frames, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        output = np.zeros_like(frames)
        for y in range(0, h, self.dotSize):
            for x in range(0, w, self.dotSize):
                region = gray[y:min(y+self.dotSize, h), x:min(x+self.dotSize, w)]
                avg = np.mean(region)
                radius = int((avg / 255) * self.dotSize / 2)
                cv2.circle(output, (x + self.dotSize//2, y + self.dotSize//2), radius, (255, 255, 255), -1)
        return output
`,
  };

  return templates[nodeType] || DEFAULT_CODE_TEMPLATES[nodeType] || `# No template available for ${nodeType}
# Add your custom processing code here
def process(frames, **kwargs):
    return frames
`;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

const nodeIcons: Record<string, React.ReactNode> = {
  pipeline: <Zap className="w-3 h-3" />,
  videoInput: <Video className="w-3 h-3" />,
  textPrompt: <Type className="w-3 h-3" />,
  imageInput: <ImageIcon className="w-3 h-3" />,
  parameters: <Settings className="w-3 h-3" />,
  brightness: <SunMedium className="w-3 h-3" />,
  contrast: <Contrast className="w-3 h-3" />,
  blur: <CircleDashed className="w-3 h-3" />,
  mirror: <Maximize2 className="w-3 h-3" />,
  kaleido: <Hexagon className="w-3 h-3" />,
  kaleidoscope: <Hexagon className="w-3 h-3" />,
  yoloMask: <EyeOff className="w-3 h-3" />,
  bloom: <SunMedium className="w-3 h-3" />,
  cosmicVFX: <Sparkles className="w-3 h-3" />,
  vfxPack: <Tv className="w-3 h-3" />,
  blend: <Layers className="w-3 h-3" />,
  mask: <EyeOff className="w-3 h-3" />,
  pipelineOutput: <Play className="w-3 h-3" />,
  noteGuide: <StickyNote className="w-3 h-3" />,
  lessonGettingStarted: <GraduationCap className="w-3 h-3" />,
  lessonFirstProcessor: <Lightbulb className="w-3 h-3" />,
  lessonNodeTypes: <Layers2 className="w-3 h-3" />,
  lessonPreprocessors: <Cpu className="w-3 h-3" />,
  lessonPostprocessors: <Wand2 className="w-3 h-3" />,
  pluginConfig: <Settings className="w-3 h-3" />,
  segmentation: <EyeOff className="w-3 h-3" />,
  depthEstimation: <EyeOff className="w-3 h-3" />,
  backgroundRemoval: <EyeOff className="w-3 h-3" />,
  colorGrading: <SunMedium className="w-3 h-3" />,
  upscaling: <Maximize2 className="w-3 h-3" />,
  denoising: <CircleDashed className="w-3 h-3" />,
  styleTransfer: <Layers className="w-3 h-3" />,
  vignette: <Hexagon className="w-3 h-3" />,
  custom: <Code className="w-3 h-3" />,
  // Settings nodes
  noiseSettings: <Settings className="w-3 h-3" />,
  vaceSettings: <Settings className="w-3 h-3" />,
  resolutionSettings: <Maximize2 className="w-3 h-3" />,
  advancedSettings: <Settings className="w-3 h-3" />,
  loraSettings: <Loader2 className="w-3 h-3" />,
};

const NODE_GUIDES: Record<string, string> = {
  pipeline: "Main pipeline - runs locally or remotely",
  pluginConfig: "Set pipeline ID, name, usage type (main/pre/post), and input mode",
  noteGuide: "Add notes or instructions for your plugin flow",
  videoInput: "Accept video frames from camera or file as input",
  textPrompt: "Text input with weight for AI generation",
  imageInput: "Reference image for image-to-video pipelines",
  parameters: "Key-value parameters for runtime config",
  brightness: "Adjust brightness: -100 to +100",
  contrast: "Adjust contrast: 0 to 3",
  blur: "Apply Gaussian blur: 0-50px radius",
  mirror: "Flip video: horizontal, vertical, or both",
  kaleido: "Symmetry effect: slices (2-24), rotation, zoom",
  kaleidoscope: "GPU kaleidoscope/mirror effect from kaleido-scope plugin",
  yoloMask: "YOLO26 segmentation from scope_yolo_mask plugin",
  bloom: "Bloom/glow effect from scope-bloom plugin",
  cosmicVFX: "30+ visual effects from scope-cosmic-vfx plugin",
  vfxPack: "Chromatic, VHS, Halftone from scope-vfx plugin",
  blend: "Blend two sources: mode + opacity",
  mask: "Generate masks: target class + confidence",
  segmentation: "Segment objects before main pipeline (preprocessor)",
  depthEstimation: "Generate depth maps for VACE (preprocessor)",
  backgroundRemoval: "Remove background with alpha (preprocessor)",
  colorGrading: "Color correction: temp, tint, sat, contrast (postprocessor)",
  upscaling: "AI upscale: 2x or 4x (postprocessor)",
  denoising: "Remove noise: strength 0-1 (postprocessor)",
  styleTransfer: "Art style: anime, oil, sketch, watercolor (postprocessor)",
  vignette: "Edge darkening: intensity + smoothness (postprocessor)",
  custom: "Create custom effect with your own parameters and processing code",
  pipelineOutput: "Main pipeline output - for generative AI",
  lessonGettingStarted: "Welcome to OpenScope! Learn what OpenScope is and get started",
  lessonFirstProcessor: "Step-by-step guide to creating your first processor",
  lessonNodeTypes: "Understand the different node types and their purposes",
  lessonPreprocessors: "Learn how to use and create preprocessors",
  lessonPostprocessors: "Learn how to use and create postprocessors",
  // Settings nodes
  noiseSettings: "Control noise scale (0-2) and enable/disable noise controller",
  vaceSettings: "Enable VACE context guidance, set context scale and use input video",
  resolutionSettings: "Set output video resolution (width x height)",
  advancedSettings: "Configure denoising steps, quantization, and KV cache attention bias",
  loraSettings: "Add LoRA adapters for style/weight modification",
};


const NODE_STYLE =
  "group min-w-[240px] max-w-[320px] rounded-lg bg-card border border-border transition-all cursor-grab active:cursor-grabbing relative";
const NODE_HEADER =
  "flex items-center gap-2 px-3 py-2 border-b border-border/60";
const ICON_BOX = "w-6 h-6 rounded flex items-center justify-center bg-background text-muted-foreground";

function ScopeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as {
    label: string;
    type: string;
    config: Record<string, unknown>;
    localStream?: MediaStream | null;
    remoteStream?: MediaStream | null;
    isStreaming?: boolean;
    sendParameterUpdate?: (params: Record<string, unknown>) => void;
  };
  const selectNode = useGraphStore((state) => state.selectNode);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const { runtimeParams } = usePipelineSchemas();
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const inputVideoRef = useRef<HTMLVideoElement>(null);
  const outputVideoRef = useRef<HTMLVideoElement>(null);

  const isInput = ["videoInput", "textPrompt", "imageInput", "parameters"].includes(nodeData.type);
  const isOutput = nodeData.type === "pipelineOutput";
  const isNoteGuide = nodeData.type === "noteGuide" || nodeData.type.startsWith("lesson");
  const isPipeline = nodeData.type.startsWith("pipeline_");
  const isEntryPoint = nodeData.type === "pluginConfig";
  const isCodeMode = nodeData.config?.isCodeMode as boolean ?? false;
  const currentCode = nodeData.config?.pythonCode as string | undefined;
  
  const showLeftHandle = !isEntryPoint;
  const showRightHandle = !isOutput;

  // Determine if this is a custom processor node
  const isCustomProcessor = nodeData.type === "custom" && 
    (nodeData.config?.createNewKind === "preprocessor" || nodeData.config?.createNewKind === "postprocessor");
  const processorKind = nodeData.config?.createNewKind as "preprocessor" | "postprocessor" | undefined;

  // Mode state: "chat" | "code" | "visual" - defined early for use in effects
  const [nodeMode, setNodeMode] = useState<"chat" | "code" | "visual">(
    isCustomProcessor ? "chat" : isCodeMode ? "code" : "visual"
  );

  // Auto-play input video stream
  useEffect(() => {
    if (nodeData.type === "videoInput" && inputVideoRef.current && nodeData.localStream) {
      inputVideoRef.current.srcObject = nodeData.localStream;
      inputVideoRef.current.play().catch(console.error);
    }
  }, [nodeData.type, nodeData.localStream]);

  // Auto-play output video stream
  useEffect(() => {
    if (isOutput && outputVideoRef.current && nodeData.remoteStream) {
      outputVideoRef.current.srcObject = nodeData.remoteStream;
      outputVideoRef.current.play().catch(console.error);
    }
  }, [isOutput, nodeData.remoteStream]);

  // Auto-initialize code when first entering code mode
  useEffect(() => {
    if (nodeMode === "code" && !currentCode) {
      const defaultCode = generateNodeCode(nodeData.type, nodeData.config);
      updateNodeConfig(id, { pythonCode: defaultCode });
    }
  }, [nodeMode, currentCode, nodeData.type, nodeData.config, id, updateNodeConfig]);

  // Reactive code updates when parameters change
  useEffect(() => {
    if (nodeMode === "code" && currentCode) {
      const newCode = generateNodeCode(nodeData.type, nodeData.config);
      if (newCode !== currentCode) {
        updateNodeConfig(id, { pythonCode: newCode });
      }
    }
  }, [nodeData.config, nodeMode, currentCode, nodeData.type, id, updateNodeConfig]);

  // Send parameter updates when settings nodes change during streaming
  const settingsNodeTypes = ["noiseSettings", "vaceSettings", "resolutionSettings", "advancedSettings", "loraSettings"];
  const effectNodeTypes = ["kaleidoscope", "bloom", "cosmicVFX", "vfxPack", "chromatic", "vhs", "halftone", "vignette", "colorGrading"];
  const processingNodeTypes = ["brightness", "contrast", "blur", "mirror", "kaleido", "segmentation", "depthEstimation", "backgroundRemoval", "upscaling", "denoising", "styleTransfer"];
  const isSettingsNode = settingsNodeTypes.includes(nodeData.type);
  const isEffectNode = effectNodeTypes.includes(nodeData.type);
  const isProcessingNode = processingNodeTypes.includes(nodeData.type);
  const isPipelineNode = nodeData.type === "pipeline" || nodeData.type.startsWith("pipeline_");
  
  useEffect(() => {
    const shouldUpdate = (isSettingsNode || isEffectNode || isProcessingNode || isPipelineNode) && nodeData.isStreaming && nodeData.sendParameterUpdate && nodeData.config;
    
    if (shouldUpdate) {
      const config = nodeData.config;
      const params: Record<string, unknown> = {};
      
      if (nodeData.type === "noiseSettings") {
        params.noise_scale = config.noiseScale ?? 0.7;
        params.noise_controller = config.noiseController ?? true;
      }
      if (nodeData.type === "vaceSettings") {
        params.vace_enabled = config.vaceEnabled ?? false;
        params.vace_context_scale = config.vaceContextScale ?? 1.0;
      }
      if (nodeData.type === "resolutionSettings") {
        params.width = config.width ?? 512;
        params.height = config.height ?? 512;
      }
      if (nodeData.type === "advancedSettings") {
        params.denoising_steps = config.denoisingSteps ?? 30;
        params.quantization = config.quantization ?? "";
        params.kv_cache_attention_bias = config.kvCacheAttentionBias ?? 0.0;
      }
      if (nodeData.type === "loraSettings") {
        try {
          params.loras = typeof config.loras === "string" ? JSON.parse(config.loras) : config.loras ?? [];
        } catch {
          params.loras = [];
        }
      }
      
      // Effect node parameters - these are runtime parameters sent to the pipeline
      if (nodeData.type === "kaleidoscope") {
        params.kaleidoscope_enabled = config.enabled ?? true;
        params.kaleidoscope_mix = config.mix ?? 1.0;
        params.kaleidoscope_mirror_mode = config.mirrorMode ?? "none";
        params.kaleidoscope_rotational_enabled = config.rotationalEnabled ?? true;
        params.kaleidoscope_slices = config.rotationalSlices ?? 6;
        params.kaleidoscope_rotation = config.rotationDeg ?? 0.0;
        params.kaleidoscope_zoom = config.zoom ?? 1.0;
        params.kaleidoscope_warp = config.warp ?? 0.0;
      }
      if (nodeData.type === "bloom") {
        params.bloom_threshold = config.threshold ?? 0.8;
        params.bloom_soft_knee = config.softKnee ?? 0.5;
        params.bloom_intensity = config.intensity ?? 1.0;
        params.bloom_radius = config.radius ?? 8;
        params.bloom_downsample = config.downsample ?? 1;
        params.bloom_debug = config.debug ?? false;
      }
      if (nodeData.type === "cosmicVFX") {
        params.cosmic_enable_glitch = config.enableGlitch ?? true;
        params.cosmic_glitch_shader = config.glitchShader ?? "basic";
        params.cosmic_glitch_intensity = config.glitchIntensity ?? 1.0;
        params.cosmic_enable_retro = config.enableRetro ?? true;
        params.cosmic_retro_shader = config.retroShader ?? "vhs";
        params.cosmic_retro_intensity = config.retroIntensity ?? 1.0;
        params.cosmic_enable_distortion = config.enableDistortion ?? true;
        params.cosmic_distortion_shader = config.distortionShader ?? "wave";
        params.cosmic_distortion_intensity = config.distortionIntensity ?? 1.0;
        params.cosmic_enable_color = config.enableColor ?? true;
        params.cosmic_color_shader = config.colorShader ?? "hueshift";
        params.cosmic_color_intensity = config.colorIntensity ?? 1.0;
        params.cosmic_enable_edge = config.enableEdge ?? false;
        params.cosmic_edge_shader = config.edgeShader ?? "sobel";
        params.cosmic_edge_intensity = config.edgeIntensity ?? 1.0;
        params.cosmic_enable_blur = config.enableBlur ?? false;
        params.cosmic_blur_shader = config.blurShader ?? "gaussian";
        params.cosmic_blur_intensity = config.blurIntensity ?? 1.0;
        params.cosmic_intensity = config.intensity ?? 1.0;
        params.cosmic_speed = config.speed ?? 1.0;
        params.cosmic_hue_shift = config.hueShift ?? 0.0;
        params.cosmic_saturation = config.saturation ?? 1.0;
        params.cosmic_brightness = config.brightness ?? 1.0;
        params.cosmic_blend_mode = config.blendMode ?? "normal";
      }
      if (nodeData.type === "vfxPack") {
        params.vfx_chromatic_enabled = config.chromaticEnabled ?? true;
        params.vfx_chromatic_intensity = config.chromaticIntensity ?? 0.3;
        params.vfx_chromatic_angle = config.chromaticAngle ?? 0.0;
        params.vfx_vhs_enabled = config.vhsEnabled ?? false;
        params.vfx_scan_line_intensity = config.scanLineIntensity ?? 0.3;
        params.vfx_scan_line_count = config.scanLineCount ?? 100;
        params.vfx_noise = config.vhsNoise ?? 0.1;
        params.vfx_tracking = config.trackingDistortion ?? 0.2;
        params.vfx_halftone_enabled = config.halftoneEnabled ?? false;
        params.vfx_halftone_dot_size = config.halftoneDotSize ?? 8;
        params.vfx_halftone_sharpness = config.halftoneSharpness ?? 0.7;
      }
      if (nodeData.type === "chromatic") {
        params.chromatic_enabled = config.enabled ?? true;
        params.chromatic_intensity = config.intensity ?? 0.3;
        params.chromatic_angle = config.angle ?? 0;
      }
      if (nodeData.type === "vhs") {
        params.vhs_enabled = config.enabled ?? false;
        params.scan_line_intensity = config.scanLineIntensity ?? 0.3;
        params.scan_line_count = config.scanLineCount ?? 100;
        params.vhs_noise = config.noise ?? 0.1;
        params.tracking_distortion = config.tracking ?? 0.2;
      }
      if (nodeData.type === "halftone") {
        params.halftone_enabled = config.enabled ?? false;
        params.halftone_dot_size = config.dotSize ?? 8;
        params.halftone_sharpness = config.sharpness ?? 0.7;
      }
      if (nodeData.type === "vignette") {
        params.vignette_intensity = config.intensity ?? 0.5;
        params.vignette_smoothness = config.smoothness ?? 0.5;
      }
      if (nodeData.type === "colorGrading") {
        params.color_temperature = config.temperature ?? 0;
        params.color_tint = config.tint ?? 0;
        params.color_saturation = config.saturation ?? 0;
        params.color_contrast = config.contrast ?? 0;
      }
      
      // Processing nodes
      if (nodeData.type === "brightness") params.brightness_value = config.value ?? 0;
      if (nodeData.type === "contrast") params.contrast_value = config.value ?? 1.0;
      if (nodeData.type === "blur") params.blur_radius = config.radius ?? 5;
      if (nodeData.type === "mirror") params.mirror_mode = config.mode ?? "horizontal";
      if (nodeData.type === "kaleido") {
        params.kaleido_slices = config.slices ?? 6;
        params.kaleido_rotation = config.rotation ?? 0;
        params.kaleido_zoom = config.zoom ?? 1.0;
      }
      if (nodeData.type === "segmentation") {
        params.segmentation_model = config.model ?? "sam";
        params.segmentation_target_class = config.targetClass ?? "person";
      }
      if (nodeData.type === "depthEstimation") params.depth_model = config.model ?? "depth-anything";
      if (nodeData.type === "backgroundRemoval") params.background_model = config.model ?? "u2net";
      if (nodeData.type === "upscaling") {
        params.upscale_scale = config.scale ?? 2;
        params.upscale_model = config.model ?? "realesrgan";
      }
      if (nodeData.type === "denoising") {
        params.denoise_strength = config.strength ?? 0.5;
        params.denoise_method = config.method ?? "bm3d";
      }
      if (nodeData.type === "styleTransfer") {
        params.style_transfer_style = config.style ?? "anime";
        params.style_transfer_strength = config.strength ?? 0.7;
      }
      
      // Custom processor nodes - extract params from pythonCode
      if (isCustomProcessor && config.pythonCode) {
        try {
          const parsed = parsePythonConfig(config.pythonCode as string);
          parsed.params.forEach((param) => {
            if (config[param.name] !== undefined && config[param.name] !== null) {
              params[param.name] = config[param.name];
            }
          });
        } catch (e) {
          // Failed to parse, skip custom params
        }
      }
      
      // Pipeline nodes - forward only runtime params (is_load_param === false)
      if (isPipelineNode && config) {
        const pipelineId = config.pipelineId as string || nodeData.type.replace("pipeline_", "");
        const allowedParams = runtimeParams[pipelineId];
        
        if (allowedParams && allowedParams.length > 0) {
          allowedParams.forEach((key) => {
            if (config[key] !== undefined && config[key] !== null) {
              params[key] = config[key];
            }
          });
        } else {
          Object.entries(config).forEach(([key, value]) => {
            if (value !== undefined && value !== null) params[key] = value;
          });
        }
      }
      
      if (Object.keys(params).length > 0 && nodeData.sendParameterUpdate) {
        nodeData.sendParameterUpdate(params);
      }
    }
  }, [nodeData.config, nodeData.isStreaming, nodeData.sendParameterUpdate, nodeData.type, isSettingsNode, isEffectNode, isProcessingNode, isPipelineNode, isCustomProcessor, runtimeParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Stop any active webcam stream when uploading a file
    if (nodeData.localStream && nodeData.isStreaming) {
      nodeData.localStream.getTracks().forEach(track => track.stop());
    }
    
    const url = URL.createObjectURL(file);
    const key = isVideo ? "videoPreviewUrl" : "previewUrl";
    updateNodeConfig(id, {
      [key]: url,
      fileName: file.name,
      isStreaming: false,
      localStream: null,
      ...(isVideo ? {} : { width: 0, height: 0 }),
    });
    
    // If video, create stream from file
    if (isVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.autoplay = true;
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(15);
        video.play();
        const drawFrame = () => {
          if (video.paused || video.ended) {
            // Restart video if ended (for non-looping videos)
            video.currentTime = 0;
            video.play().catch(() => {});
          }
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };
        video.onplay = drawFrame;
        // Dispatch event with stream
        window.dispatchEvent(new CustomEvent('openscope:video-stream-ready', { 
          detail: { stream, nodeId: id } 
        }));
      };
    }
    
    if (!isVideo) {
      const img = new window.Image();
      img.onload = () => {
        updateNodeConfig(id, { width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    }
  };

  if (isNoteGuide) {
    const title = String(nodeData.config?.title ?? "Note");
    const content = String(nodeData.config?.content ?? "");
    return (
      <div
        className={`${NODE_STYLE} ${selected ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
        style={{ minWidth: 320, maxWidth: 400, width: 350 }}
        onClick={() => selectNode(id)}
      >
        <div className={NODE_HEADER}>
          <div className={ICON_BOX}>{nodeIcons[nodeData.type] ?? <StickyNote className="w-3 h-3" />}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{title}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 hover:bg-accent hover:text-destructive rounded transition-colors text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-3 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {content || "Add instructions in the properties panel."}
        </div>
      </div>
    );
  }

  const configPreview =
    nodeData.config && Object.keys(nodeData.config).length > 0
      ? nodeData.type === "pluginConfig"
        ? nodeData.config.pluginName 
          ? `${nodeData.config.pluginName}`
          : `pipeline: ${nodeData.config.pipelineId || "passthrough"}`
        : nodeData.type === "pipeline"
          ? `pipeline: ${nodeData.config.pipelineId || "passthrough"}`
          : Object.entries(nodeData.config)
              .filter(([k]) => !["previewUrl", "videoPreviewUrl", "fileName"].includes(k))
              .slice(0, 2)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
      : null;

  const previewUrl = nodeData.config?.previewUrl as string | undefined;
  const videoPreviewUrl = nodeData.config?.videoPreviewUrl as string | undefined;
  const width = nodeData.config?.width as number | undefined;
  const height = nodeData.config?.height as number | undefined;
  const fileName = nodeData.config?.fileName as string | undefined;
  const textContent = nodeData.config?.Text as string | undefined;
  const showImagePreview = nodeData.type === "imageInput";
  const showVideoPreview = nodeData.type === "videoInput";
  const showTextPreview = nodeData.type === "textPrompt";
  const showCodeButton = !isOutput;
  const guideText = nodeData.type.startsWith("pipeline_") 
    ? `Main pipeline - runs locally or remotely`
    : NODE_GUIDES[nodeData.type];

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: "user" | "assistant", content: string}[]>([]);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCustomProcessor && selected && !nodeData.config?.pythonCode && nodeMode !== "chat") {
      setNodeMode("chat");
    }
  }, [isCustomProcessor, selected, nodeData.config?.pythonCode, nodeMode]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const checkApiConfig = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/ai/config");
      const data = await res.json();
      return data.configured === true;
    } catch {
      return false;
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !processorKind) return;

    // Check if API key is configured
    const isConfigured = await checkApiConfig();
    if (!isConfigured) {
      showError("API key not configured", "Please set NEXT_PUBLIC_GROQ_API_KEY in your environment to use AI generation");
      return;
    }
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/ai/generate-processor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: processorKind,
          description: userMessage,
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.code) {
        updateNodeConfig(id, {
          pythonCode: data.code,
          code: data.code,
          isCodeMode: true,
        });
        
        showSuccess("Code added to node. Switch to code mode to view.");
        
        // Add success message to chat
        setChatMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Code added to node. Switch to code mode to view.`,
        }]);
        
        setNodeMode("code");
      } else {
        showError("Generation failed", data.detail || "Failed to generate processor");
        setChatMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Error: ${data.detail || "Failed to generate"}`,
        }]);
      }
    } catch (error) {
      showError("Error", "Failed to generate processor. Make sure Groq API is configured.");
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Error generating processor. Make sure Groq API is configured.",
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const toggleMode = (newMode: "chat" | "code" | "visual") => {
    setNodeMode(newMode);
    if (newMode === "code") {
      if (!currentCode) {
        const defaultCode = generateNodeCode(nodeData.type, nodeData.config);
        updateNodeConfig(id, { isCodeMode: true, pythonCode: defaultCode });
      } else {
        updateNodeConfig(id, { isCodeMode: true });
      }
    } else {
      updateNodeConfig(id, { isCodeMode: false });
    }
  };

  // Determine if we should show chat button
  const showChatButton = isCustomProcessor;

  return (
    <div
      className={`${NODE_STYLE} ${selected ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
      onClick={() => selectNode(id)}
    >
      {/* Guide overlay */}
      {selected && guideText && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-50 w-56 mb-2">
          <div className="px-3 py-2 bg-primary text-primary-foreground text-xs rounded-lg shadow-lg border border-primary/30 text-center break-words leading-relaxed">
            {guideText}
          </div>
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary mx-auto" />
        </div>
      )}

      {showLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-primary !border-2 !border-card"
        />
      )}

      <div className={NODE_HEADER}>
        <div className={ICON_BOX}>{nodeIcons[nodeData.type] ?? (isPipeline ? <Zap className="w-3 h-3" /> : <Settings className="w-3 h-3" />)}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{nodeData.label}</div>
          {/* {configPreview && (
            <div className="text-xs text-muted-foreground truncate">{configPreview}</div>
          )} */}
        </div>
        <div className="flex items-center gap-0 ml-3 rounded-md bg-muted p-0.5">
          {/* Visual mode button */}
          {(showCodeButton || showChatButton) && (
            <button
              onClick={() => toggleMode("visual")}
              className={`p-1 rounded transition-colors ${
                nodeMode === "visual"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-accent hover:text-foreground text-muted-foreground"
              }`}
              title="Visual mode"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Chat mode button for custom processors */}
          {showChatButton && (
            <button
              onClick={() => toggleMode("chat")}
              className={`p-1 rounded transition-colors ${
                nodeMode === "chat" 
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-accent hover:text-foreground text-muted-foreground"
              }`}
              title="Chat mode - AI generate processor"
            >
              <BrainCog className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Code mode button */}
          {(showCodeButton || showChatButton) && (
            <button
              onClick={() => toggleMode("code")}
              className={`p-1 rounded transition-colors ${
                nodeMode === "code" 
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-accent hover:text-foreground text-muted-foreground"
              }`}
              title={nodeMode === "code" ? "Code mode" : "Switch to code mode"}
            >
              { <Code className="w-3.5 h-3.5" />}
            </button>
          )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="p-1 hover:bg-accent hover:text-destructive rounded transition-colors text-muted-foreground"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        </div>
       
      </div>

      {showImagePreview && nodeMode !== "code" && nodeMode !== "chat" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="mt-2 rounded overflow-hidden bg-background border border-border aspect-video flex items-center justify-center min-h-[80px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[120px] object-contain"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          {(width && height) ? (
            <div className="text-xs text-muted-foreground">{width} × {height}</div>
          ) : null}
          <div className="flex items-center gap-2">
          
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                imageFileRef.current?.click();
              }}
              className="flex items-center gap-1  w-full  px-2 py-1 text-xs bg-muted hover:bg-accent text-foreground rounded border border-border transition-colors"
            >
              <FileUp className="w-3 h-3" />
              choose file
            </button>
          </div>
          <input
            ref={imageFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, false)}
          />
        </div>
      )}

      {/* Video Input: placeholder + choose file or live stream */}
      {showVideoPreview && nodeMode !== "code" && nodeMode !== "chat" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="mt-2 rounded overflow-hidden bg-background border border-border aspect-video flex items-center justify-center min-h-[80px]">
            {/* Show webcam if streaming, otherwise show file */}
            {(nodeData.isStreaming === true && nodeData.localStream) ? (
              <video
                ref={inputVideoRef}
                className="max-w-full max-h-[120px] object-contain"
                autoPlay
                muted
                playsInline
              />
            ) : videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                className="max-w-full max-h-[120px] object-contain"
                muted
                playsInline
                autoPlay
                loop
              />
            ) : (
              <Video className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                videoFileRef.current?.click();
              }}
              className="flex items-center gap-1 px-2 py-1 flex-1 text-xs bg-muted hover:bg-accent text-foreground rounded border border-border transition-colors justify-center"
            >
              <FileUp className="w-3 h-3" />
              choose file
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const isCurrentlyStreaming = nodeData.isStreaming === true && nodeData.localStream;
                if (isCurrentlyStreaming) {
                  // Stop webcam
                  if (nodeData.localStream) {
                    nodeData.localStream.getTracks().forEach(track => track.stop());
                  }
                  updateNodeConfig(id, { isStreaming: false, localStream: null });
                } else {
                  // Start webcam
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    // Clear file preview when starting webcam
                    updateNodeConfig(id, { 
                      isStreaming: true, 
                      localStream: stream,
                      videoPreviewUrl: null,
                      fileName: null,
                    });
                    } catch (err) {
                    console.error("Failed to access webcam:", err);
                    showError("Webcam access denied", "Please allow camera permissions to use live input");
                  }
                }
              }}
              className={`flex items-center gap-1 px-2 py-1 flex-1 text-xs rounded border transition-colors justify-center ${
                nodeData.isStreaming === true && nodeData.localStream
                  ? "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
                  : "bg-muted hover:bg-accent text-foreground border-border"
              }`}
            >
              <Webcam className="w-3 h-3" />
              {nodeData.isStreaming === true && nodeData.localStream ? "stop cam" : "webcam"}
            </button>
          </div>
          <input
            ref={videoFileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, true)}
          />
        </div>
      )}

      {/* Text Input: show the text content */}
      {showTextPreview && nodeMode !== "code" && nodeMode !== "chat" && textContent && (
        <div className="px-3 pb-3 space-y-2">
          <div className="mt-2 rounded bg-muted/50 border border-border p-2 min-h-[40px] max-h-[80px] overflow-y-auto">
            <p className="text-xs text-foreground whitespace-pre-wrap break-words">{textContent}</p>
          </div>
        </div>
      )}

      {/* Output Nodes: show processed video stream */}
      {isOutput && nodeMode !== "code" && nodeMode !== "chat" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="mt-2 rounded overflow-hidden bg-background border border-border aspect-video flex items-center justify-center min-h-[80px]">
            {nodeData.isStreaming && nodeData.remoteStream ? (
              <video
                ref={outputVideoRef}
                className="max-w-full max-h-[120px] object-contain"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <Play className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
         
        </div>
      )}

      {/* Code mode editor */}
      {nodeMode === "code" && (
        <div className="px-3 pb-3 mt-2 border-t border-border/40">
          <CodeEditor
            value={String(nodeData.config?.pythonCode || generateNodeCode(nodeData.type, nodeData.config))}
            onChange={(value) => updateNodeConfig(id, { pythonCode: value })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Chat mode for custom processors */}
      {nodeMode === "chat" && isCustomProcessor && (
        <div className="px-3 pb-3 mt-2 border-t border-border/40 space-y-2 min-w-12">
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            Describe what you want this {processorKind} to do..
          </div>
          
          {/* Chat messages */}
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`text-xs p-2 rounded ${
                msg.role === "user" 
                  ? "bg-primary/10 text-foreground" 
                  : "bg-muted/50 text-muted-foreground"
              }`}>
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>
          
          {/* Chat input */}
          <div className="flex gap-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="e.g., Add a pixelate effect..."
              className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs"
              disabled={chatLoading}
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || chatLoading}
              className="px-2 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Config summary for non-input nodes without inline preview */}
      {configPreview && !showImagePreview && !showVideoPreview && nodeMode !== "code" && nodeMode !== "chat" && !isOutput && (
        <div className="px-3 py-2 bg-background/50 border-t border-border/40">
          <div className="text-xs text-muted-foreground truncate">{configPreview}</div>
        </div>
      )}

      {showRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-primary !border-2 !border-card"
        />
      )}
    </div>
  );
}

export default memo(ScopeNode);
