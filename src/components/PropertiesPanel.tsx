"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useGraphStore } from "@/store/graphStore";
import {
  X,
  Settings2,
  Sliders,
  Info,
  ArrowRight,
  Lightbulb,
  Scan,
  Eye,
  EyeOff,
  Palette,
  Maximize,
  Sparkles,
  SunMedium,
  Contrast,
  CircleDashed,
  Maximize2,
  Hexagon,
  Grid3X3,
  Layers,
  Code,
  ChevronLeft,
  Loader2,
} from "lucide-react";

interface PipelineInfo {
  pipeline_id: string;
  pipeline_name: string;
  supported_modes?: string[];
}

const DEFAULT_PIPELINES = ["passthrough", "gray", "scribble", "rife", "optical-flow"];

const NODE_GUIDES: Record<string, { title: string; description: string; usage: string; example?: string }> = {
  pipeline: {
    title: "Pipeline",
    description: "AI pipeline fetched from Scope server.",
    usage: "Select a pipeline from the Main Pipeline category.",
    example: 'pipelineId: "animate-diff"'
  },
  pluginConfig: {
    title: "Plugin Configuration",
    description: "Defines how your plugin appears in Scope. Set the pipeline type, input mode, and metadata.",
    usage: "Set the pipeline ID (unique name), display name, description, usage type (main/preprocessor/postprocessor), and input mode (text/video/image).",
    example: 'pipelineId: "my-vfx"\npipelineName: "My VFX"\nusage: "postprocessor"'
  },
  noteGuide: {
    title: "Note / Guide",
    description: "Add notes and instructions to your plugin flow. Useful for documentation or step-by-step guides.",
    usage: "Write any notes or instructions. These are for your reference and don't affect the plugin.",
    example: "title: 'Step 1'\ncontent: 'Add video input here'"
  },
  videoInput: {
    title: "Video Input",
    description: "Accept video frames from camera or video file as input to your pipeline.",
    usage: "Connect to the start of your effect chain. The Frames parameter controls how many frames to buffer.",
    example: "frames: 1 (real-time)"
  },
  textPrompt: {
    title: "Text Prompt",
    description: "Text input with optional weight for AI generation. Used in text-to-video pipelines.",
    usage: "Connect to pipelines that support prompts. Weight determines prompt influence (0-2).",
    example: "text: 'cyberpunk city'\nweight: 1.0"
  },
  imageInput: {
    title: "Image Input",
    description: "Reference image input for image-to-video or compositing pipelines.",
    usage: "Connect to blend nodes or image-to-video pipelines.",
    example: "path: '/path/to/image.jpg'"
  },
  parameters: {
    title: "Parameters",
    description: "Key-value parameter storage for runtime configuration.",
    usage: "Add custom parameters that will be passed to your pipeline.",
    example: "key: 'model'\nvalue: 'realesrgan'"
  },
  brightness: {
    title: "Brightness",
    description: "Adjust the brightness of video frames. Positive values lighten, negative values darken.",
    usage: "Value range: -100 to 100. Connect after video input.",
    example: "value: 20 (20% brighter)"
  },
  contrast: {
    title: "Contrast",
    description: "Adjust the contrast of video frames. Values > 1 increase contrast, < 1 decrease it.",
    usage: "Value range: 0 to 3. Connect after video input.",
    example: "value: 1.5 (50% more contrast)"
  },
  blur: {
    title: "Blur",
    description: "Apply Gaussian blur to video frames for smoothing or privacy effects.",
    usage: "Radius: 0-50 pixels. Higher values create more blur.",
    example: "radius: 10"
  },
  mirror: {
    title: "Mirror",
    description: "Flip video frames horizontally, vertically, or both.",
    usage: "Modes: horizontal, vertical, both. Creates symmetrical reflections.",
    example: "mode: 'horizontal'"
  },
  kaleido: {
    title: "Kaleidoscope",
    description: "Create symmetric mirror effects by folding the frame into radial segments.",
    usage: "Slices: number of segments (2-24). Rotation: 0-360°. Zoom: 0.1-3x.",
    example: "slices: 6, rotation: 45"
  },
  vignette: {
    title: "Vignette",
    description: "Darken the edges of frames for a cinematic look.",
    usage: "Intensity: 0-1 (darkness). Smoothness: 0-1 (falloff).",
    example: "intensity: 0.5, smoothness: 0.5"
  },
  // VFX Pack effects
  chromatic: {
    title: "Chromatic Aberration",
    description: "Displace RGB channels in opposite directions for a retro lens effect.",
    usage: "Intensity: 0-1 (0=none, 1=max). Angle: 0-360 degrees direction.",
    example: "enabled: true, intensity: 0.3, angle: 0"
  },
  vhs: {
    title: "VHS / Retro CRT",
    description: "Scan lines, analog noise, and tracking distortion for a retro VHS look.",
    usage: "Scan lines, noise, and tracking distortion. Enable to apply retro effect.",
    example: "enabled: false, scanLineIntensity: 0.3, noise: 0.1"
  },
  halftone: {
    title: "Halftone",
    description: "Newspaper dot pattern effect - dark areas have large dots, bright areas small dots.",
    usage: "Dot size: 4-20 pixels. Sharpness: 0-1 edge hardness.",
    example: "enabled: false, dotSize: 8, sharpness: 0.7"
  },
  blend: {
    title: "Blend",
    description: "Blend two video sources together using various blend modes.",
    usage: "Connect two inputs. Modes: add, multiply, screen, overlay. Opacity: 0-1.",
    example: "mode: 'add', opacity: 0.5"
  },
  mask: {
    title: "Mask / Segmentation",
    description: "Generate masks for specific objects using AI segmentation.",
    usage: "Target class: person, car, dog, etc. Confidence: detection threshold.",
    example: "targetClass: 'person', confidence: 0.5"
  },
  segmentation: {
    title: "Segmentation (Preprocessor)",
    description: "Segment objects in video before the main pipeline. Outputs masks for guidance.",
    usage: "Connect as preprocessor. Model options: sam, sam2, yolo.",
    example: "model: 'sam', targetClass: 'person'"
  },
  depthEstimation: {
    title: "Depth Estimation (Preprocessor)",
    description: "Generate depth maps for video frames. Used for VACE structural guidance.",
    usage: "Connect as preprocessor. Output can guide main pipeline structure.",
    example: "model: 'depth-anything'"
  },
  backgroundRemoval: {
    title: "Background Removal (Preprocessor)",
    description: "Remove background from video for compositing with transparent alpha.",
    usage: "Connect as preprocessor. Outputs RGBA with alpha channel.",
    example: "model: 'u2net'"
  },
  colorGrading: {
    title: "Color Grading (Postprocessor)",
    description: "Professional color correction: temperature, tint, saturation, contrast.",
    usage: "Connect as postprocessor after main pipeline.",
    example: "temperature: 10, saturation: 1.2"
  },
  upscaling: {
    title: "Upscaling (Postprocessor)",
    description: "Increase video resolution using AI models.",
    usage: "Connect as postprocessor. Scale: 2x or 4x.",
    example: "scale: 2, model: 'realesrgan'"
  },
  denoising: {
    title: "Denoising (Postprocessor)",
    description: "Remove noise from video using AI denoising algorithms.",
    usage: "Connect as postprocessor. Strength: 0-1.",
    example: "strength: 0.7, method: 'bm3d'"
  },
  styleTransfer: {
    title: "Style Transfer (Postprocessor)",
    description: "Apply artistic styles to video frames.",
    usage: "Connect as postprocessor. Styles: anime, oil, sketch, watercolor.",
    example: "style: 'anime', strength: 0.7"
  },
  pipelineOutput: {
    title: "Pipeline Output (Main)",
    description: "Mark this as the main generative pipeline output. Used when this is the primary AI model.",
    usage: "Set usage to 'main' for generative pipelines.",
    example: "usage: 'main'"
  },
};

const nodeConfigs: Record<string, { label: string; type: string; min?: number; max?: number; options?: string[]; description?: string; readonly?: boolean; accept?: string }[]> = {
  pipeline: [
    { label: "pipelineId", type: "select-dynamic", description: "Select pipeline from Scope server" },
  ],
  // Pipeline configs for processor pipelines - these get merged when the pipelineId matches
  kaleidoscope_pipeline: [
    { label: "enabled", type: "toggle", description: "Enable kaleidoscope effect" },
    { label: "mix", type: "slider", min: 0, max: 1, description: "Blend original (0) to fully effected (1)" },
    { label: "Mode", type: "select", options: ["none", "2x", "4x", "kaleido6"], description: "Mirror symmetry mode" },
    { label: "Enabled", type: "toggle", description: "Enable N-fold rotational symmetry" },
    { label: "Slices", type: "number", min: 3, max: 12, description: "Number of symmetry slices (N)" },
    { label: "rotation", type: "slider", min: 0, max: 360, description: "Rotate pattern (degrees)" },
    { label: "zoom", type: "slider", min: 0.5, max: 2, description: "Zoom into source before symmetry" },
    { label: "warp", type: "slider", min: -0.5, max: 0.5, description: "Radial warp amount" },
  ],
  yolo_mask_pipeline: [
    { label: "modelSize", type: "select", options: ["nano", "small", "medium", "large", "xlarge"], description: "YOLO model variant" },
    { label: "outputMode", type: "select", options: ["mask", "overlay"], description: "Output mode" },
    { label: "targetClass", type: "text", description: "Object class to segment" },
    { label: "confidenceThreshold", type: "slider", min: 0, max: 1, description: "Detection confidence threshold" },
    { label: "invertMask", type: "toggle", description: "Invert the mask" },
  ],
  bloom_pipeline: [
    { label: "threshold", type: "slider", min: 0, max: 1, description: "Brightness threshold for bloom extraction" },
    { label: "softKnee", type: "slider", min: 0, max: 1, description: "Softness of threshold transition" },
    { label: "intensity", type: "slider", min: 0, max: 2, description: "Bloom intensity multiplier" },
    { label: "radius", type: "number", min: 1, max: 48, description: "Blur radius for bloom effect" },
    { label: "downsample", type: "number", min: 1, max: 4, description: "Downsample factor (higher=faster)" },
    { label: "debug", type: "toggle", description: "Enable debug logging" },
  ],
  cosmic_vfx_pipeline: [
    { label: "enableGlitch", type: "toggle", description: "Enable glitch effect" },
    { label: "glitchShader", type: "select", options: ["basic", "digital", "color"], description: "Glitch shader type" },
    { label: "glitchIntensity", type: "slider", min: 0, max: 2, description: "Glitch intensity" },
    { label: "enableRetro", type: "toggle", description: "Enable retro effect" },
    { label: "retroShader", type: "select", options: ["vhs", "retro", "cinema"], description: "Retro shader type" },
    { label: "retroIntensity", type: "slider", min: 0, max: 2, description: "Retro intensity" },
    { label: "enableDistortion", type: "toggle", description: "Enable distortion effect" },
    { label: "distortionShader", type: "select", options: ["wave", "spike", "noise"], description: "Distortion shader type" },
    { label: "distortionIntensity", type: "slider", min: 0, max: 2, description: "Distortion intensity" },
    { label: "enableColor", type: "toggle", description: "Enable color effect" },
    { label: "colorShader", type: "select", options: ["hueshift", "colorize", "duotone"], description: "Color shader type" },
    { label: "colorIntensity", type: "slider", min: 0, max: 2, description: "Color intensity" },
    { label: "enableEdge", type: "toggle", description: "Enable edge detection" },
    { label: "edgeShader", type: "select", options: ["sobel", "laplacian", "canny"], description: "Edge detection type" },
    { label: "edgeIntensity", type: "slider", min: 0, max: 2, description: "Edge intensity" },
    { label: "enableBlur", type: "toggle", description: "Enable blur effect" },
    { label: "blurShader", type: "select", options: ["gaussian", "motion", "radial"], description: "Blur shader type" },
    { label: "blurIntensity", type: "slider", min: 0, max: 2, description: "Blur intensity" },
    { label: "intensity", type: "slider", min: 0, max: 2, description: "Master intensity multiplier" },
    { label: "speed", type: "slider", min: 0, max: 3, description: "Animation speed" },
    { label: "hueShift", type: "slider", min: -1, max: 1, description: "Rotate color wheel" },
    { label: "saturation", type: "slider", min: 0, max: 2, description: "Color richness" },
    { label: "brightness", type: "slider", min: 0, max: 2, description: "Final brightness" },
    { label: "blendMode", type: "select", options: ["normal", "screen", "multiply", "overlay"], description: "Blend mode with original" },
  ],
  vfx_pack_pipeline: [
    { label: "chromaticEnabled", type: "toggle", description: "Enable chromatic aberration" },
    { label: "chromaticIntensity", type: "slider", min: 0, max: 1, description: "RGB channel displacement strength" },
    { label: "chromaticAngle", type: "slider", min: 0, max: 360, description: "Displacement direction (degrees)" },
    { label: "vhsEnabled", type: "toggle", description: "Enable VHS / retro CRT effect" },
    { label: "scanLineIntensity", type: "slider", min: 0, max: 1, description: "Scan line darkness" },
    { label: "scanLineCount", type: "number", min: 10, max: 500, description: "Number of scan lines" },
    { label: "vhsNoise", type: "slider", min: 0, max: 1, description: "Analog noise/grain amount" },
    { label: "trackingDistortion", type: "slider", min: 0, max: 1, description: "Horizontal tracking distortion" },
    { label: "halftoneEnabled", type: "toggle", description: "Enable halftone effect" },
    { label: "halftoneDotSize", type: "number", min: 4, max: 20, description: "Halftone dot size (pixels)" },
    { label: "halftoneSharpness", type: "slider", min: 0, max: 1, description: "Edge sharpness of dots" },
  ],
  noteGuide: [
    { label: "Title", type: "text", description: "Note title (e.g. Step 1)" },
    { label: "Content", type: "textarea", description: "Instructions or notes" },
  ],
  lessonGettingStarted: [
    { label: "Title", type: "text", description: "Lesson title" },
    { label: "Content", type: "textarea", description: "Lesson content" },
  ],
  lessonFirstProcessor: [
    { label: "Title", type: "text", description: "Lesson title" },
    { label: "Content", type: "textarea", description: "Lesson content" },
  ],
  lessonNodeTypes: [
    { label: "Title", type: "text", description: "Lesson title" },
    { label: "Content", type: "textarea", description: "Lesson content" },
  ],
  lessonPreprocessors: [
    { label: "Title", type: "text", description: "Lesson title" },
    { label: "Content", type: "textarea", description: "Lesson content" },
  ],
  lessonPostprocessors: [
    { label: "Title", type: "text", description: "Lesson title" },
    { label: "Content", type: "textarea", description: "Lesson content" },
  ],
  videoInput: [
    { label: "Frames", type: "number", min: 1, max: 100, description: "Number of frames to buffer" },
    { label: "VideoFile", type: "file", accept: "video/*", description: "Upload video file" },
  ],
  textPrompt: [
    { label: "Text", type: "textarea", description: "Prompt text" },
  ],
  imageInput: [
    { label: "Path", type: "text", description: "Image file path" },
  ],
  parameters: [
    { label: "Key", type: "text", description: "Parameter name" },
    { label: "Value", type: "text", description: "Parameter value" },
  ],
  brightness: [
    { label: "value", type: "slider", min: -100, max: 100, description: "Brightness adjustment" },
  ],
  contrast: [
    { label: "value", type: "slider", min: 0, max: 3, description: "Contrast multiplier" },
  ],
  blur: [
    { label: "radius", type: "slider", min: 0, max: 50, description: "Blur radius in pixels" },
  ],
  mirror: [
    { label: "mode", type: "select", options: ["horizontal", "vertical", "both"], description: "Mirror axis" },
  ],
  kaleido: [
    { label: "slices", type: "slider", min: 2, max: 24, description: "Number of symmetry slices" },
    { label: "rotation", type: "slider", min: 0, max: 360, description: "Rotation angle" },
    { label: "zoom", type: "slider", min: 0.1, max: 3, description: "Zoom factor" },
  ],
  // kaleidoscope - from kaleido-scope plugin (full version)
  kaleidoscope: [
    { label: "enabled", type: "toggle", description: "Enable the effect (off returns original)" },
    { label: "mix", type: "slider", min: 0, max: 1, description: "Blend original (0) to fully effected (1)" },
    { label: "Mode", type: "select", options: ["none", "2x", "4x", "kaleido6"], description: "Mirror symmetry mode" },
    { label: "Enabled", type: "toggle", description: "Enable N-fold rotational symmetry" },
    { label: "Slices", type: "number", min: 3, max: 12, description: "Number of symmetry slices (N)" },
    { label: "rotate", type: "slider", min: 0, max: 360, description: "Rotate pattern (degrees)" },
    { label: "zoom", type: "slider", min: 0.5, max: 2, description: "Zoom into source before symmetry" },
    { label: "warp", type: "slider", min: -0.5, max: 0.5, description: "Radial warp amount" },
  ],
  // yoloMask - from scope_yolo_mask plugin
  yoloMask: [
    { label: "modelSize", type: "select", options: ["nano", "small", "medium", "large", "xlarge"], description: "YOLO model variant" },
    { label: "outputMode", type: "select", options: ["mask", "overlay"], description: "mask=binary, overlay=blended" },
    { label: "targetClass", type: "select", options: ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"], description: "Object class to segment" },
    { label: "confidenceThreshold", type: "slider", min: 0, max: 1, description: "Detection confidence threshold" },
    { label: "invertMask", type: "toggle", description: "Invert the mask (segment background)" },
  ],
  // bloom - from scope-bloom plugin
  bloom: [
    { label: "threshold", type: "slider", min: 0, max: 1, description: "Brightness threshold for bloom extraction" },
    { label: "softKnee", type: "slider", min: 0, max: 1, description: "Softness of threshold transition" },
    { label: "intensity", type: "slider", min: 0, max: 2, description: "Bloom intensity multiplier" },
    { label: "radius", type: "number", min: 1, max: 48, description: "Blur radius for bloom effect" },
    { label: "downsample", type: "number", min: 1, max: 4, description: "Downsample factor (higher=faster)" },
    { label: "debug", type: "toggle", description: "Enable debug logging" },
  ],
  // cosmicVFX - from scope-cosmic-vfx plugin (full version)
  cosmicVFX: [
    // Glitch
    { label: "enableGlitch", type: "toggle", description: "Enable glitch effect" },
    { label: "glitchShader", type: "select", options: ["basic", "digital", "color"], description: "Glitch shader type" },
    { label: "glitchIntensity", type: "slider", min: 0, max: 2, description: "Glitch intensity" },
    // Retro
    { label: "enableRetro", type: "toggle", description: "Enable retro effect" },
    { label: "retroShader", type: "select", options: ["vhs", "retro", "cinema"], description: "Retro shader type" },
    { label: "retroIntensity", type: "slider", min: 0, max: 2, description: "Retro intensity" },
    // Distortion
    { label: "enableDistortion", type: "toggle", description: "Enable distortion effect" },
    { label: "distortionShader", type: "select", options: ["wave", "spike", "noise"], description: "Distortion shader type" },
    { label: "distortionIntensity", type: "slider", min: 0, max: 2, description: "Distortion intensity" },
    // Color
    { label: "enableColor", type: "toggle", description: "Enable color effect" },
    { label: "colorShader", type: "select", options: ["hueshift", "colorize", "duotone"], description: "Color shader type" },
    { label: "colorIntensity", type: "slider", min: 0, max: 2, description: "Color intensity" },
    // Blend
    { label: "enableBlend", type: "toggle", description: "Enable blend effect" },
    { label: "blendShader", type: "select", options: ["screen", "multiply", "overlay", "difference"], description: "Blend shader type" },
    { label: "blendIntensity", type: "slider", min: 0, max: 2, description: "Blend intensity" },
    // Edge
    { label: "enableEdge", type: "toggle", description: "Enable edge detection" },
    { label: "edgeShader", type: "select", options: ["sobel", "laplacian", "canny"], description: "Edge detection type" },
    { label: "edgeIntensity", type: "slider", min: 0, max: 2, description: "Edge intensity" },
    // Blur
    { label: "enableBlur", type: "toggle", description: "Enable blur effect" },
    { label: "blurShader", type: "select", options: ["gaussian", "motion", "radial"], description: "Blur shader type" },
    { label: "blurIntensity", type: "slider", min: 0, max: 2, description: "Blur intensity" },
    // Generative
    { label: "enableGenerative", type: "toggle", description: "Enable generative effect" },
    { label: "generativeShader", type: "select", options: ["noise", "pattern", "gradient"], description: "Generative shader type" },
    { label: "generativeIntensity", type: "slider", min: 0, max: 2, description: "Generative intensity" },
    // Atmospheric
    { label: "enableAtmospheric", type: "toggle", description: "Enable atmospheric effect" },
    { label: "atmosphericShader", type: "select", options: ["fog", "rain", "snow"], description: "Atmospheric shader type" },
    { label: "atmosphericIntensity", type: "slider", min: 0, max: 2, description: "Atmospheric intensity" },
    // Utility
    { label: "enableUtility", type: "toggle", description: "Enable utility effect" },
    { label: "utilityShader", type: "select", options: ["invert", "grayscale", "posterize"], description: "Utility shader type" },
    { label: "utilityIntensity", type: "slider", min: 0, max: 2, description: "Utility intensity" },
    // Global
    { label: "intensity", type: "slider", min: 0, max: 2, description: "Master intensity multiplier" },
    { label: "speed", type: "slider", min: 0, max: 3, description: "Animation speed" },
    { label: "scale", type: "slider", min: 0.1, max: 5, description: "Effect scale" },
    { label: "hueShift", type: "slider", min: -1, max: 1, description: "Rotate color wheel" },
    { label: "saturation", type: "slider", min: 0, max: 2, description: "Color richness" },
    { label: "brightness", type: "slider", min: 0, max: 2, description: "Final brightness" },
    { label: "blendMode", type: "select", options: ["normal", "screen", "multiply", "overlay"], description: "Blend mode with original" },
  ],
  // vfxPack - from scope-vfx plugin
  vfxPack: [
    { label: "chromaticEnabled", type: "toggle", description: "Enable chromatic aberration" },
    { label: "chromaticIntensity", type: "slider", min: 0, max: 1, description: "RGB channel displacement strength" },
    { label: "chromaticAngle", type: "slider", min: 0, max: 360, description: "Displacement direction (degrees)" },
    { label: "vhsEnabled", type: "toggle", description: "Enable VHS / retro CRT effect" },
    { label: "scanLineIntensity", type: "slider", min: 0, max: 1, description: "Scan line darkness" },
    { label: "scanLineCount", type: "number", min: 10, max: 500, description: "Number of scan lines" },
    { label: "vhsNoise", type: "slider", min: 0, max: 1, description: "Analog noise/grain amount" },
    { label: "trackingDistortion", type: "slider", min: 0, max: 1, description: "Horizontal tracking distortion" },
    { label: "halftoneEnabled", type: "toggle", description: "Enable halftone effect" },
    { label: "halftoneDotSize", type: "number", min: 4, max: 20, description: "Halftone dot size (pixels)" },
    { label: "halftoneSharpness", type: "slider", min: 0, max: 1, description: "Edge sharpness of dots" },
  ],
  // Legacy aliases for backward compatibility
  segmentation: [
    { label: "model", type: "select", options: ["sam", "sam2", "yolo"], description: "Segmentation model" },
    { label: "targetClass", type: "text", description: "Target object class" },
  ],
  depthEstimation: [
    { label: "model", type: "select", options: ["depth-anything", "miDaS", "zoe"], description: "Depth model" },
  ],
  backgroundRemoval: [
    { label: "model", type: "select", options: ["u2net", "bgv16", "modnet"], description: "Removal model" },
  ],
  // Postprocessor effects
  colorGrading: [
    { label: "temperature", type: "slider", min: -100, max: 100, description: "Color temperature" },
    { label: "tint", type: "slider", min: -100, max: 100, description: "Green/magenta tint" },
    { label: "saturation", type: "slider", min: -100, max: 100, description: "Color saturation" },
    { label: "contrast", type: "slider", min: -100, max: 100, description: "Contrast adjustment" },
  ],
  upscaling: [
    { label: "scale", type: "select", options: ["2", "4"], description: "Upscale factor" },
    { label: "model", type: "select", options: ["realesrgan", "esrgan", "swinir"], description: "Upscale model" },
  ],
  denoising: [
    { label: "strength", type: "slider", min: 0, max: 1, description: "Denoise strength" },
    { label: "method", type: "select", options: ["bm3d", "dncnn", "ffdnet"], description: "Denoise method" },
  ],
  styleTransfer: [
    { label: "style", type: "select", options: ["anime", "oil", "sketch", "watercolor"], description: "Art style" },
    { label: "strength", type: "slider", min: 0, max: 1, description: "Effect strength" },
  ],
  vignette: [
    { label: "intensity", type: "slider", min: 0, max: 1, description: "Edge darkening" },
    { label: "smoothness", type: "slider", min: 0, max: 1, description: "Falloff smoothness" },
  ],
  // VFX Pack effects
  chromatic: [
    { label: "enabled", type: "toggle", description: "Enable chromatic aberration" },
    { label: "intensity", type: "slider", min: 0, max: 1, description: "RGB displacement strength" },
    { label: "angle", type: "slider", min: 0, max: 360, description: "Displacement direction (degrees)" },
  ],
  vhs: [
    { label: "enabled", type: "toggle", description: "Enable VHS / retro CRT effect" },
    { label: "scanLineIntensity", type: "slider", min: 0, max: 1, description: "Scan line darkness" },
    { label: "scanLineCount", type: "number", min: 10, max: 500, description: "Number of scan lines" },
    { label: "noise", type: "slider", min: 0, max: 1, description: "Analog grain amount" },
    { label: "tracking", type: "slider", min: 0, max: 1, description: "Horizontal tracking distortion" },
  ],
  halftone: [
    { label: "enabled", type: "toggle", description: "Enable halftone effect" },
    { label: "dotSize", type: "number", min: 4, max: 20, description: "Halftone dot size (pixels)" },
    { label: "sharpness", type: "slider", min: 0, max: 1, description: "Edge sharpness of dots" },
  ],
  // Custom effect - user-defined
  custom: [
    { label: "name", type: "text", description: "Effect name for documentation" },
    { label: "params", type: "json", description: "Array of parameters: [{name, type, default, min, max, description}]" },
  ],
  // Settings nodes
  noiseSettings: [
    { label: "noiseScale", type: "slider", min: 0, max: 2, description: "Noise scale for generation (0-2)" },
    { label: "noiseController", type: "toggle", description: "Enable noise controller" },
  ],
  vaceSettings: [
    { label: "vaceEnabled", type: "toggle", description: "Enable VACE context guidance" },
    { label: "vaceContextScale", type: "slider", min: 0, max: 2, description: "VACE context scale (0-2)" },
    { label: "useInputVideo", type: "toggle", description: "Use input video as VACE reference" },
  ],
  resolutionSettings: [
    { label: "width", type: "number", min: 256, max: 2048, description: "Output width" },
    { label: "height", type: "number", min: 256, max: 2048, description: "Output height" },
  ],
  advancedSettings: [
    { label: "denoisingSteps", type: "number", min: 1, max: 100, description: "Number of denoising steps" },
    { label: "quantization", type: "select", options: ["", "fp8_e4m3fn", "fp8_e5m2"], description: "Quantization method" },
    { label: "kvCacheAttentionBias", type: "slider", min: -1, max: 1, description: "KV cache attention bias" },
  ],
  loraSettings: [
    { label: "loras", type: "textarea", description: "LoRA adapters (JSON array)" },
  ],
  preprocessor: [],
  postprocessor: [],
  pluginConfig: [
    { label: "pipelineId", type: "select", options: ["passthrough", "gray", "scribble", "rife", "optical-flow"], description: "(Main generation pipeline)" },
    { label: "pluginName", type: "text", description: "Plugin display name" },
    { label: "pluginDescription", type: "textarea", description: "Plugin description" },
    { label: "usage", type: "select", options: ["main", "preprocessor", "postprocessor", "all"], description: "Pipeline type" },
    { label: "mode", type: "select", options: ["text", "video"], description: "Input mode" },
    { label: "supportsPrompts", type: "toggle", description: "Enable text prompts" },
  ],
};

type WizardStep = {
  id: string;
  title: string;
  fields: string[];
  choices?: { id: string; label: string; description: string; icon: React.ReactNode; target: string }[];
  nextStep?: string;
};

const WIZARD_CONFIGS: Record<string, WizardStep[]> = {
  preprocessor: [
    {
      id: "select-preprocessor",
      title: "Select Preprocessor",
      fields: [],
      choices: [
        { id: "segmentation", label: "Mask Objects", description: "Detect and mask objects", icon: <Scan className="w-4 h-4" />, target: "segmentation" },
        { id: "depth", label: "Estimate Depth", description: "Generate depth maps", icon: <Eye className="w-4 h-4" />, target: "depthEstimation" },
        { id: "background", label: "Remove Background", description: "Make background transparent", icon: <EyeOff className="w-4 h-4" />, target: "backgroundRemoval" },
      ],
    },
  ],
  postprocessor: [
    {
      id: "select-category",
      title: "Select Category",
      fields: [],
      choices: [
        { id: "upscaling", label: "Upscale Resolution", description: "AI upscale 2x or 4x", icon: <Maximize className="w-4 h-4" />, target: "upscaling" },
        { id: "colorGrading", label: "Color Correction", description: "Temperature, tint, saturation", icon: <SunMedium className="w-4 h-4" />, target: "colorGrading" },
        { id: "effects", label: "Effects", description: "Brightness, blur, VHS, and more", icon: <Sparkles className="w-4 h-4" />, target: "effects-category" },
      ],
    },
    {
      id: "effects-category",
      title: "Select Effect",
      fields: [],
      choices: [
        { id: "vhs", label: "Retro VHS Effect", description: "Scan lines, noise, CRT look", icon: <CircleDashed className="w-4 h-4" />, target: "vhs" },
        { id: "chromatic", label: "RGB Split", description: "Chromatic aberration for glitch look", icon: <Sparkles className="w-4 h-4" />, target: "chromatic" },
        { id: "halftone", label: "Halftone Pattern", description: "Newspaper dot effect", icon: <Grid3X3 className="w-4 h-4" />, target: "halftone" },
        { id: "styleTransfer", label: "Art Style", description: "Anime, oil, sketch effects", icon: <Palette className="w-4 h-4" />, target: "styleTransfer" },
        { id: "denoising", label: "Denoise", description: "Remove noise and artifacts", icon: <Contrast className="w-4 h-4" />, target: "denoising" },
        { id: "brightness", label: "Adjust Brightness", description: "Lighten or darken", icon: <SunMedium className="w-4 h-4" />, target: "brightness" },
        { id: "blur", label: "Blur Effect", description: "Gaussian blur", icon: <CircleDashed className="w-4 h-4" />, target: "blur" },
        { id: "mirror", label: "Mirror Flip", description: "Horizontal or vertical flip", icon: <Hexagon className="w-4 h-4" />, target: "mirror" },
        { id: "vignette", label: "Vignette", description: "Edge darkening", icon: <Maximize2 className="w-4 h-4" />, target: "vignette" },
        { id: "kaleido", label: "Kaleidoscope", description: "Radial symmetry", icon: <Layers className="w-4 h-4" />, target: "kaleido" },
        { id: "blend", label: "Blend Layers", description: "Mix two video sources", icon: <Layers className="w-4 h-4" />, target: "blend" },
      ],
    },
  ],
};

export default function PropertiesPanel() {
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const updateNodeType = useGraphStore((state) => state.updateNodeType);
  const [pipelines, setPipelines] = useState<string[]>(DEFAULT_PIPELINES);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);

  // Fetch available pipelines from Scope server
  useEffect(() => {
    const fetchPipelines = async () => {
      setPipelinesLoading(true);
      try {
        const response = await fetch("/api/scope/pipelines/list");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const pipelineIds = data.map((p: PipelineInfo) => p.pipeline_id);
            setPipelines(pipelineIds);
          }
        }
      } catch (error) {
        console.error("Failed to fetch pipelines:", error);
      } finally {
        setPipelinesLoading(false);
      }
    };
    fetchPipelines();
  }, []);
  const selectNode = useGraphStore((state) => state.selectNode);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [wizardState, setWizardState] = useState<Record<string, number>>({});

  // Handle pipelineId change in pluginConfig - sync to pipeline node
  const handlePluginConfigChange = (key: string, value: unknown) => {
    if (key === "pipelineId" && typeof value === "string") {
      // Find pipeline node and update its config
      const pipelineNode = nodes.find((n) => n.data.type === "pipeline");
      if (pipelineNode) {
        updateNodeConfig(pipelineNode.id, { pipelineId: value });
      }
    }
    if (selectedNode) {
      updateNodeConfig(selectedNode, { [key]: value });
    }
  };

  useEffect(() => {
    setWizardState({});
  }, [selectedNode]);

  const handleClose = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  useEffect(() => {
    const button = closeButtonRef.current;
    if (!button) return;

    const handleCloseClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    };

    button.addEventListener("click", handleCloseClick);
    return () => button.removeEventListener("click", handleCloseClick);
  }, [handleClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const node = nodes.find((n) => n.id === selectedNode);
  if (!node) return null;

  const nodeType = node.data.type;
  const isPipelineNode = nodeType.startsWith("pipeline_");
  
  // Determine config key - for pipeline nodes, check if it's a processor pipeline
  let configKey = isPipelineNode ? "pipeline" : nodeType;
  if (isPipelineNode) {
    const pipelineId = node.data.config?.pipelineId as string || "";
    // Map processor pipeline IDs to their config keys
    const processorConfigMap: Record<string, string> = {
      "kaleido-scope": "kaleidoscope_pipeline",
      "kaleido-scope-pre": "kaleidoscope_pipeline",
      "kaleido-scope-post": "kaleidoscope_pipeline",
      "yolo-mask": "yolo_mask_pipeline",
      "bloom": "bloom_pipeline",
      "cosmic-vfx": "cosmic_vfx_pipeline",
      "vfx-pack": "vfx_pack_pipeline",
    };
    const processorConfigKey = processorConfigMap[pipelineId];
    if (processorConfigKey) {
      configKey = processorConfigKey;
    }
  }
  
  const configFields = nodeConfigs[configKey] || [];
  
  const createNewKind = node.data.config?.createNewKind as string | undefined;
  
  const getWizardKey = () => {
    // Custom AI-generated processor - don't show wizard, just name input
    if (nodeType === "custom" && createNewKind) return null;
    if (nodeType === "preprocessor" || createNewKind === "preprocessor") return "preprocessor";
    if (nodeType === "postprocessor" || createNewKind === "postprocessor") return "postprocessor";
    return null;
  };
  
  const wizardKey = getWizardKey();
  const wizardSteps = wizardKey ? WIZARD_CONFIGS[wizardKey] : null;
  const currentStepIndex = wizardKey && wizardSteps ? (wizardState[wizardKey] ?? 0) : 0;
  const currentStep = wizardSteps?.[currentStepIndex];
  const isInWizard = wizardSteps !== null && currentStepIndex < wizardSteps.length;
  const hasMultipleSteps = wizardSteps && wizardSteps.length > 1;
  const canGoBack = hasMultipleSteps && currentStepIndex > 0;
  const canGoNext = hasMultipleSteps && currentStepIndex < wizardSteps.length - 1;

  const handleWizardBack = () => {
    if (wizardKey && currentStepIndex > 0) {
      setWizardState(prev => ({ ...prev, [wizardKey]: currentStepIndex - 1 }));
    }
  };

  const handleWizardChoice = (choice: { id: string; target: string }) => {
    const isFinalStep = wizardKey && currentStepIndex >= wizardSteps!.length - 1;
    const isIntermediateCategory = choice.target === "effects-category";
    
    if (wizardKey === "preprocessor" || wizardKey === "postprocessor") {
      if (isFinalStep || !isIntermediateCategory) {
        updateNodeType(node.id, choice.target);
      }
    }
    if (wizardKey && currentStepIndex < wizardSteps!.length - 1) {
      setWizardState(prev => ({ ...prev, [wizardKey]: currentStepIndex + 1 }));
    }
  };

  return (
    <div className="absolute right-0 top-0 h-full z-50" onClick={(e) => e.stopPropagation()}>
      <aside className="w-80 bg-card border-l border-border flex flex-col shrink-0 h-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Settings2 className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Properties</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                selectNode(null);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">


          <div className="mb-6 p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-3 ">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Sliders className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">{node.data.label}</h3>
                <p className="text-xs text-muted-foreground">Node Configuration</p>
              </div>
            </div>
          </div>

          {isInWizard && currentStep && (
            <div className="mb-4">
              {canGoBack && (
                <button
                  type="button"
                  onClick={handleWizardBack}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              )}
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
                {currentStep.title}
              </div>
              {currentStep.choices && (
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {currentStep.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleWizardChoice(choice)}
                      className="w-full text-left px-3 py-3 rounded-lg border border-border bg-background hover:bg-accent/40 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        {choice.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{choice.label}</div>
                        <div className="text-xs text-muted-foreground">{choice.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isInWizard && (
            configFields.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Info className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No configurable properties</p>
                <p className="text-xs text-muted-foreground mt-1">This node uses default settings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {configFields.map((field) => {
                  // Use exact key match first (case-sensitive), then try lowercase
                  const value = node.data.config[field.label] ??
                    node.data.config[field.label.toLowerCase()] ??
                    (field.type === "slider" || field.type === "number" ? 0 :
                      field.type === "toggle" ? false : "");

                  return (
                    <div key={field.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium text-foreground">{field.label}</label>
                        {field.description && (
                          <span className="text-xs text-muted-foreground text-ellipsis line-clamp-1">{field.description}</span>
                        )}
                      </div>
                      {field.type === "text" && (
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={String(value)}
                          onChange={(e) =>
                            updateNodeConfig(node.id, { [field.label]: e.target.value })
                          }
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          rows={field.label === "Content" ? 22 : 3}
                          value={String(value)}
                          onChange={(e) =>
                            updateNodeConfig(node.id, { [field.label]: e.target.value })
                          }
                        />
                      )}

                      {field.type === "number" && (
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          min={field.min}
                          max={field.max}
                          value={Number(value)}
                          onChange={(e) =>
                            updateNodeConfig(node.id, { [field.label]: parseFloat(e.target.value) })
                          }
                        />
                      )}

                      {field.type === "slider" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{field.min}</span>
                            <span className="font-mono">{String(value)}</span>
                            <span>{field.max}</span>
                          </div>
                          <input
                            type="range"
                            className="w-full h-2 bg-background rounded appearance-none cursor-pointer accent-primary"
                            min={field.min}
                            max={field.max}
                            step={0.1}
                            value={Number(value)}
                            onChange={(e) =>
                              updateNodeConfig(node.id, { [field.label]: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                      )}

                      {field.type === "select-dynamic" && (
                        <select
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                          value={String(value)}
                          onChange={(e) =>
                            updateNodeConfig(node.id, { [field.label]: e.target.value })
                          }
                        >
                          {pipelinesLoading ? (
                            <option>Loading...</option>
                          ) : (
                            pipelines.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))
                          )}
                        </select>
                      )}

                      {field.type === "select" && field.options && (
                        <select
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                          value={String(value)}
                          onChange={(e) =>
                            nodeType === "pluginConfig"
                              ? handlePluginConfigChange(field.label, e.target.value)
                              : updateNodeConfig(node.id, { [field.label]: e.target.value })
                          }
                        >
                          {(field.label === "pipelineId" && (nodeType === "pluginConfig" || nodeType === "pipeline" || isPipelineNode)) ? (
                            pipelinesLoading ? (
                              <option>Loading...</option>
                            ) : (
                              pipelines.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))
                            )
                          ) : (
                            field.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </option>
                            ))
                          )}
                        </select>
                      )}

                      {field.type === "toggle" && (
                        <button
                          type="button"
                          disabled={field.readonly}
                          onClick={() =>
                            !field.readonly && updateNodeConfig(node.id, { [field.label]: !value })
                          }
                          className={`w-8 h-4 rounded-full transition-colors ${value ? "bg-primary" : "bg-background border border-border"} ${field.readonly ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"
                              }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}
