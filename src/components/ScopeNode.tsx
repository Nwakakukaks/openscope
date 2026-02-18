"use client";

import { memo, useRef, useEffect } from "react";
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
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import CodeEditor from "./CodeEditor";

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
  preprocessorOutput: `from scope.core.pipeline import BasePipeline

class PreprocessorOutput:
    """Preprocessor output marker"""
    
    def process(self, frames, **kwargs):
        return frames  # Output for preprocessor pipeline
`,
  postprocessorOutput: `from scope.core.pipeline import BasePipeline

class PostprocessorOutput:
    """Postprocessor output marker"""
    
    def process(self, frames, **kwargs):
        return frames  # Output for postprocessor pipeline
`,
};

function getNodeDefaultCode(nodeType: string): string {
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
  return DEFAULT_CODE_TEMPLATES[nodeType] || `# No template available for ${nodeType}
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
  blend: <Layers className="w-3 h-3" />,
  mask: <EyeOff className="w-3 h-3" />,
  pipelineOutput: <Play className="w-3 h-3" />,
  preprocessorOutput: <Square className="w-3 h-3" />,
  postprocessorOutput: <EyeOff className="w-3 h-3" />,
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
};

const NODE_GUIDES: Record<string, string> = {
  pipeline: "AI pipeline from Scope server - runs locally or remotely",
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
  pipelineOutput: "Main pipeline output - for generative AI",
  preprocessorOutput: "Preprocessor output - runs before main",
  postprocessorOutput: "Postprocessor output - runs after main",
  lessonGettingStarted: "Welcome to OpenScope! Learn what OpenScope is and get started",
  lessonFirstProcessor: "Step-by-step guide to creating your first processor",
  lessonNodeTypes: "Understand the different node types and their purposes",
  lessonPreprocessors: "Learn how to use and create preprocessors",
  lessonPostprocessors: "Learn how to use and create postprocessors",
};


const NODE_STYLE =
  "group min-w-[240px] rounded-lg bg-card border border-border transition-all cursor-grab active:cursor-grabbing relative";
const NODE_HEADER =
  "flex items-center gap-2 px-3 py-2 border-b border-border/60";
const ICON_BOX = "w-6 h-6 rounded flex items-center justify-center bg-background text-muted-foreground";

function ScopeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as {
    label: string;
    type: string;
    config: Record<string, unknown>;
  };
  const selectNode = useGraphStore((state) => state.selectNode);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const isInput = ["videoInput", "textPrompt", "imageInput", "parameters"].includes(nodeData.type);
  const isOutput = ["pipelineOutput", "preprocessorOutput", "postprocessorOutput"].includes(nodeData.type);
  const isNoteGuide = nodeData.type === "noteGuide" || nodeData.type.startsWith("lesson");
  const isPipeline = nodeData.type.startsWith("pipeline_");
  const isEntryPoint = nodeData.type === "pluginConfig";
  const isCodeMode = nodeData.config?.isCodeMode as boolean ?? false;
  const currentCode = nodeData.config?.pythonCode as string | undefined;

  // Auto-initialize code when first entering code mode
  useEffect(() => {
    if (isCodeMode && !currentCode) {
      const defaultCode = getNodeDefaultCode(nodeData.type);
      updateNodeConfig(id, { pythonCode: defaultCode });
    }
  }, [isCodeMode, currentCode, nodeData.type, id, updateNodeConfig]);

  const toggleCodeMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCodeMode && !currentCode) {
      // Initialize with default code when entering code mode
      const defaultCode = getNodeDefaultCode(nodeData.type);
      updateNodeConfig(id, { isCodeMode: true, pythonCode: defaultCode });
    } else {
      updateNodeConfig(id, { isCodeMode: !isCodeMode });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const key = isVideo ? "videoPreviewUrl" : "previewUrl";
    updateNodeConfig(id, {
      [key]: url,
      fileName: file.name,
      ...(isVideo ? {} : { width: 0, height: 0 }),
    });
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
      ? Object.entries(nodeData.config)
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
  const showImagePreview = nodeData.type === "imageInput";
  const showVideoPreview = nodeData.type === "videoInput";
  const guideText = NODE_GUIDES[nodeData.type];

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

      {!isInput && !isEntryPoint && (
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
        <div className="flex items-center gap-1 ml-3">
        <button
          onClick={toggleCodeMode}
          className="p-1 hover:bg-accent hover:text-primary rounded transition-colors text-muted-foreground"
          title={isCodeMode ? "Switch to visual mode" : "Switch to code mode"}
        >
          {isCodeMode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
        </button>
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

      {showImagePreview && !isCodeMode && (
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

      {/* Video Input: placeholder + choose file */}
      {showVideoPreview && !isCodeMode && (
        <div className="px-3 pb-3 space-y-2">
          <div className="mt-2 rounded overflow-hidden bg-background border border-border aspect-video flex items-center justify-center min-h-[80px]">
            {videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                className="max-w-full max-h-[120px] object-contain"
                muted
                playsInline
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
              className="flex items-center gap-1 px-2 py-1 w-full text-xs bg-muted hover:bg-accent text-foreground rounded border border-border transition-colors"
            >
              <FileUp className="w-3 h-3" />
              choose file
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

      {/* Code mode editor */}
      {isCodeMode && (
        <div className="px-3 pb-3 mt-2 border-t border-border/40">
          <CodeEditor
            value={String(nodeData.config?.pythonCode || getNodeDefaultCode(nodeData.type))}
            onChange={(value) => updateNodeConfig(id, { pythonCode: value })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Config summary for non-input nodes without inline preview */}
      {configPreview && !showImagePreview && !showVideoPreview && !isCodeMode && (
        <div className="px-3 py-2 bg-background/50 border-t border-border/40">
          <div className="text-xs text-muted-foreground truncate">{configPreview}</div>
        </div>
      )}

      {(isEntryPoint || !isOutput) && (
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
