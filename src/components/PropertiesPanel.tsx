"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useGraphStore } from "@/store/graphStore";
import {
  X,
  Settings2,
  Sliders,
  Info,
} from "lucide-react";
import { showError } from "@/lib/toast";
import { getBackendUrl } from "@/hooks/useScopeServer";
import { parsePythonConfig, parsedParamsToConfigFields } from "@/lib/pythonConfigParser";

const SCOPE_API_URL = "/api/scope";

interface SchemaProperty {
  type?: string;
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  ui?: {
    category?: string;
    order?: number;
    component?: string;
    modes?: ("text" | "video")[];
    is_load_param?: boolean;
    label?: string;
  };
}

interface PipelineInfo {
  id: string;
  name: string;
  description?: string;
  supported_modes?: string[];
  default_mode?: string;
  plugin_name?: string;
  config_schema?: Record<string, unknown>;
  usage?: string[];
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
  pipelineOutput: {
    title: "Pipeline Output (Main)",
    description: "Mark this as the main generative pipeline output. Used when this is the primary AI model.",
    usage: "Set usage to 'main' for generative pipelines.",
    example: "usage: 'main'"
  },
  custom: {
    title: "Custom Processor",
    description: "AI-generated processor with custom code.",
    usage: "Describe what you want the processor to do and AI will generate the code.",
    example: "Add a blur effect"
  },
};

const nodeConfigs: Record<string, { label: string; type: string; min?: number; max?: number; options?: string[]; description?: string; readonly?: boolean; accept?: string }[]> = {
  pipeline: [
    { label: "pipelineId", type: "select-dynamic", description: "Select pipeline from Scope server" },
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
  // Custom processor - config extracted from pythonCode
  custom: [],
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
  // Wizard configs removed - now using only API pipelines and custom AI processors
};

export default function PropertiesPanel() {
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const updateNodeType = useGraphStore((state) => state.updateNodeType);
  const [pipelines, setPipelines] = useState<string[]>(DEFAULT_PIPELINES);
  const [pipelineSchemas, setPipelineSchemas] = useState<Record<string, PipelineInfo>>({});
  const [pipelinesLoading, setPipelinesLoading] = useState(false);

  // Fetch available pipelines with config_schema from Scope server
  useEffect(() => {
    const fetchPipelines = async () => {
      setPipelinesLoading(true);
      try {
        const response = await fetch(`${getBackendUrl()}${SCOPE_API_URL}/pipelines`);
        if (response.ok) {
          const data = await response.json();
          const pipelinesData = data.pipelines as Record<string, PipelineInfo>;
          if (pipelinesData && typeof pipelinesData === "object") {
            const pipelineIds = Object.keys(pipelinesData);
            setPipelines(pipelineIds);
            setPipelineSchemas(pipelinesData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch pipelines:", error);
        showError("Failed load pipelines", "Could not connect to Scope server");
      } finally {
        setPipelinesLoading(false);
      }
    };
    fetchPipelines();
  }, []);
  const selectNode = useGraphStore((state) => state.selectNode);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
  const isPipelineNode = nodeType.startsWith("pipeline_") || nodeType === "pipeline";
  
  const configKey = isPipelineNode ? "pipeline" : nodeType;

  // Get pipelineId for dynamic schema lookup
  let pipelineId = "";
  if (isPipelineNode) {
    pipelineId = (node.data.config?.pipelineId as string) || "";
    if (!pipelineId && nodeType.startsWith("pipeline_")) {
      pipelineId = nodeType.replace("pipeline_", "");
    }
  }

  // Build dynamic config fields from schema if available
  let dynamicConfigFields: Array<{
    label: string;
    type: string;
    min?: number;
    max?: number;
    options?: string[];
    description?: string;
    isRuntimeParam?: boolean;
    readonly?: boolean;
    accept?: string;
  }> = [];

  const pipelineSchema = pipelineId ? pipelineSchemas[pipelineId] : null;
  const configSchema = pipelineSchema?.config_schema as { properties?: Record<string, { ui?: { is_load_param?: boolean; label?: string; order?: number }; description?: string; enum?: unknown[]; type?: string; minimum?: number; maximum?: number }> } | undefined;
  if (configSchema?.properties) {
    const properties = configSchema.properties;
    Object.entries(properties).forEach(([key, prop]) => {
      // Skip properties without ui metadata (internal/advanced)
      if (!prop.ui) return;

      const field: typeof dynamicConfigFields[0] = {
        label: prop.ui.label || key,
        type: "text",
        description: prop.description,
        isRuntimeParam: prop.ui.is_load_param === false,
      };

      // Infer field type from schema
      if (prop.enum && Array.isArray(prop.enum)) {
        field.type = "select";
        field.options = prop.enum.map(String);
      } else if (prop.type === "boolean") {
        field.type = "toggle";
      } else if (prop.type === "integer" || prop.type === "number") {
        if (prop.minimum !== undefined && prop.maximum !== undefined) {
          field.type = "slider";
          field.min = prop.minimum;
          field.max = prop.maximum;
        } else {
          field.type = "number";
        }
      } else if (prop.type === "string") {
        field.type = "text";
      }

      dynamicConfigFields.push(field);
    });

    // Sort by ui.order if available
    dynamicConfigFields.sort((a, b) => {
      const propA = properties[a.label];
      const propB = properties[b.label];
      const orderA = propA?.ui?.order ?? 999;
      const orderB = propB?.ui?.order ?? 999;
      return orderA - orderB;
    });
  }

  // Extract dynamic config fields from pythonCode for custom processors
  let customProcessorFields: Array<{
    label: string;
    type: string;
    min?: number;
    max?: number;
    options?: string[];
    description?: string;
  }> = [];
  
  if (nodeType === "custom" && node.data.config?.pythonCode) {
    try {
      const parsed = parsePythonConfig(node.data.config.pythonCode as string);
      if (parsed.params && parsed.params.length > 0) {
        customProcessorFields = parsedParamsToConfigFields(parsed.params);
      }
    } catch (e) {
      // Failed to parse, fall back to default
    }
  }

  let configFields: Array<{
    label: string;
    type: string;
    min?: number;
    max?: number;
    options?: string[];
    description?: string;
    readonly?: boolean;
    accept?: string;
  }> = [];

  if (dynamicConfigFields.length > 0) {
    configFields = dynamicConfigFields;
  } else if (customProcessorFields.length > 0) {
    configFields = customProcessorFields;
  } else if (nodeConfigs[configKey]) {
    configFields = nodeConfigs[configKey];
  }
  
  const createNewKind = node.data.config?.createNewKind as string | undefined;

  const wizardKey = null;

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
                  // Use exact key match first (case-sensitive), then try lowercase
                  const value = node.data.config[field.label] ??
                    node.data.config[field.label.toLowerCase()] ??
                    (field.type === "slider" || field.type === "number" ? 0 :
                      field.type === "toggle" ? false : "");

                  return (
                    <div key={field.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium text-foreground line-clamp-1">{field.label}</label>
                        {/* {field.description && (
                          <span className="text-xs text-muted-foreground text-ellipsis line-clamp-1">{field.description}</span>
                        )} */}
                      </div>
                      {field.type === "text" && (
                        <input
                          type="text"
                          className={`w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${field.readonly ? "bg-muted/50 cursor-not-allowed" : ""}`}
                          value={String(value)}
                          readOnly={field.readonly}
                          onChange={(e) =>
                            !field.readonly && updateNodeConfig(node.id, { [field.label]: e.target.value })
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
          }
        </div>
      </aside>
    </div>
  );
}
