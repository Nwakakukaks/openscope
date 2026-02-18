"use client";

import { useEffect, useCallback, useRef } from "react";
import { useGraphStore } from "@/store/graphStore";
import { X, Settings2, Sliders, Info, ArrowRight, Lightbulb } from "lucide-react";

const NODE_GUIDES: Record<string, { title: string; description: string; usage: string; example?: string }> = {
  pipeline: {
    title: "Remote Pipeline",
    description: "AI pipeline fetched from Scope server. Enable remote inference to run on the server instead of locally.",
    usage: "Select a pipeline from the Main Pipeline category. Toggle remote inference to run on the remote Scope server.",
    example: 'pipelineId: "animate-diff"\nremoteInference: false'
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
  preprocessorOutput: {
    title: "Preprocessor Output",
    description: "Mark as output for preprocessing. Runs before the main generative pipeline.",
    usage: "Connect effects that modify input before the main pipeline.",
    example: "Runs before main pipeline"
  },
  postprocessorOutput: {
    title: "Postprocessor Output",
    description: "Mark as output for postprocessing. Runs after the main generative pipeline.",
    usage: "Connect effects that process output from the main pipeline.",
    example: "Runs after main pipeline"
  },
};

const nodeConfigs: Record<string, { label: string; type: string; min?: number; max?: number; options?: string[]; description?: string; readonly?: boolean; accept?: string }[]> = {
  pipeline: [
    { label: "pipelineId", type: "text", description: "Pipeline identifier" },
    // { label: "remoteInference", type: "toggle", description: "Run on remote server" },
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
    { label: "Weight", type: "number", min: 0, max: 2, description: "Prompt weight" },
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
  blend: [
    { label: "mode", type: "select", options: ["add", "multiply", "screen", "overlay"], description: "Blend mode" },
    { label: "opacity", type: "slider", min: 0, max: 1, description: "Blend opacity" },
  ],
  mask: [
    { label: "targetClass", type: "select", options: ["person", "car", "dog", "cat", "chair", "all"], description: "Object to detect" },
    { label: "confidence", type: "slider", min: 0, max: 1, description: "Detection threshold" },
  ],
  // Preprocessor effects
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
  pipelineOutput: [
    { label: "usage", type: "select", options: ["main", "preprocessor", "postprocessor"], description: "Pipeline type" },
  ],
  preprocessorOutput: [],
  postprocessorOutput: [],
  pluginConfig: [
    { label: "pipelineId", type: "text", description: "Identifier (e.g., my-vfx-pack)" },
    { label: "pipelineName", type: "text", description: "Display name" },
    { label: "pipelineDescription", type: "textarea", description: "Description " },
    { label: "usage", type: "select", options: ["main", "preprocessor", "postprocessor", "all"], description: "Pipeline type" },
    { label: "mode", type: "select", options: ["text", "video"], description: "Input mode" },
    { label: "supportsPrompts", type: "toggle", description: "Enable text prompts" },
    { label: "remoteInference", type: "toggle", description: "Run on remote GPU server", readonly: true },
  ],
};

export default function PropertiesPanel() {
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const selectNode = useGraphStore((state) => state.selectNode);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
  const configKey = isPipelineNode ? "pipeline" : nodeType;
  const configFields = nodeConfigs[configKey] || [];
  const guide = NODE_GUIDES[nodeType] || (isPipelineNode ? NODE_GUIDES.pipeline : undefined);

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

        {configFields.length === 0 ? (
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
              const configKey = field.label.toLowerCase();
              const value = node.data.config[configKey] ??
                node.data.config[field.label] ??
                (field.type === "slider" || field.type === "number" ? 0 :
                  field.type === "toggle" ? false : "");

              return (
                <div key={field.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">{field.label}</label>
                    {field.description && (
                      <span className="text-xs text-muted-foreground">{field.description}</span>
                    )}
                  </div>
                  {field.type === "text" && (
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={String(value)}
                      onChange={(e) =>
                        updateNodeConfig(node.id, { [field.label.toLowerCase()]: e.target.value })
                      }
                    />
                  )}

                  {field.type === "textarea" && (
                    <textarea
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      rows={field.label === "Content" ? 22 : 3}
                      value={String(value)}
                      onChange={(e) =>
                        updateNodeConfig(node.id, { [field.label.toLowerCase()]: e.target.value })
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
                        updateNodeConfig(node.id, { [field.label.toLowerCase()]: parseFloat(e.target.value) })
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
                          updateNodeConfig(node.id, { [field.label.toLowerCase()]: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                  )}

                  {field.type === "select" && field.options && (
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      value={String(value)}
                      onChange={(e) =>
                        updateNodeConfig(node.id, { [field.label.toLowerCase()]: e.target.value })
                      }
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "toggle" && (
                    <button
                      type="button"
                      disabled={field.readonly}
                      onClick={() =>
                        !field.readonly && updateNodeConfig(node.id, { [field.label.toLowerCase()]: !value })
                      }
                      className={`w-8 h-4 rounded-full transition-colors ${value ? "bg-primary" : "bg-background border border-border"} ${field.readonly ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"
                          }`}
                      />
                    </button>
                  )}

                  {field.type === "file" && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept={field.accept || "*/*"}
                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Store file reference for now - the actual stream will be created when running
                            updateNodeConfig(node.id, { [field.label.toLowerCase()]: file.name });
                            // Dispatch event so parent can handle the file
                            window.dispatchEvent(new CustomEvent('openscope:video-upload', { detail: { file, nodeId: node.id } }));
                          }
                        }}
                      />
                      {value && (
                        <p className="text-xs text-green-500">✓ {String(value)} selected</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
    </div>
  );
}
