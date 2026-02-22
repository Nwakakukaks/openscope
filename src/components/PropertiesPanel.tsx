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

const NODE_GUIDES: Record<string, { title: string; description: string; usage: string; example?: string }> = {
  pipeline: {
    title: "Pipeline",
    description: "AI pipeline fetched from Scope server.",
    usage: "Select a pipeline from the Scope server.",
  },
  pluginConfig: {
    title: "Plugin Configuration",
    description: "Defines how your plugin appears in Scope.",
    usage: "Set pipeline ID, name, usage type, and input mode.",
  },
  noteGuide: {
    title: "Note / Guide",
    description: "Add notes and instructions.",
    usage: "Write any notes.",
  },
  videoInput: {
    title: "Video Input",
    description: "Accept video frames from camera or video file.",
    usage: "Connect to the start of your pipeline.",
  },
  textPrompt: {
    title: "Text Prompt",
    description: "Text input with optional weight for AI generation.",
    usage: "Connect to pipelines that support prompts.",
  },
  imageInput: {
    title: "Image Input",
    description: "Reference image input for image-to-video.",
    usage: "Connect to image-to-video pipelines.",
  },
  parameters: {
    title: "Parameters",
    description: "Key-value parameter storage for runtime config.",
    usage: "Add custom parameters.",
  },
  pipelineOutput: {
    title: "Pipeline Output",
    description: "Mark this as the main pipeline output.",
    usage: "Set usage to 'main' for generative pipelines.",
  },
  custom: {
    title: "Custom Processor",
    description: "AI-generated processor with custom code.",
    usage: "Describe what you want the processor to do.",
  },
};

const nodeConfigs: Record<string, { label: string; type: string; min?: number; max?: number; options?: string[]; description?: string; readonly?: boolean; accept?: string }[]> = {
  pipeline: [
    { label: "pipelineId", type: "select-dynamic", description: "Select pipeline from Scope server" },
  ],
  noteGuide: [
    { label: "Title", type: "text", description: "Note title" },
    { label: "Content", type: "textarea", description: "Instructions or notes" },
  ],
  videoInput: [
    { label: "Frames", type: "number", min: 1, max: 100, description: "Number of frames to buffer" },
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
  custom: [],
  pluginConfig: [
    { label: "pipelineId", type: "select-dynamic", description: "(Main generation pipeline)" },
    { label: "pluginName", type: "text", description: "Plugin display name" },
    { label: "pluginDescription", type: "textarea", description: "Plugin description" },
    { label: "usage", type: "select", options: ["main", "preprocessor", "postprocessor", "all"], description: "Pipeline type" },
    { label: "mode", type: "select", options: ["text", "video"], description: "Input mode" },
    { label: "supportsPrompts", type: "toggle", description: "Enable text prompts" },
  ],
};

interface PropsPanelProps {
  forceShow?: boolean;
  sendParameterUpdate?: (params: Record<string, unknown>) => void;
  isStreaming?: boolean;
}

export default function PropertiesPanel({ forceShow, sendParameterUpdate, isStreaming }: PropsPanelProps) {
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [pipelineSchemas, setPipelineSchemas] = useState<Record<string, PipelineInfo>>({});
  const [pipelinesLoading, setPipelinesLoading] = useState(false);

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

  const handlePluginConfigChange = (key: string, value: unknown) => {
    if (key === "pipelineId" && typeof value === "string") {
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
  if (!node) {
    if (forceShow) {
      return (
        <div data-tour="properties-panel" className="absolute right-0 top-0 h-full z-50" onClick={(e) => e.stopPropagation()}>
          <aside className="w-80 bg-card border-l border-border flex flex-col shrink-0 h-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Properties</h2>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Info className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Select a node</p>
                <p className="text-xs text-muted-foreground mt-1">Click on any node to configure its properties</p>
              </div>
            </div>
          </aside>
        </div>
      );
    }
    return null;
  }

  const nodeType = node.data.type;
  const isPipelineNode = nodeType.startsWith("pipeline_") || nodeType === "pipeline";
  
  const configKey = isPipelineNode ? "pipeline" : nodeType;

  let pipelineId = "";
  if (isPipelineNode) {
    pipelineId = (node.data.config?.pipelineId as string) || "";
    if (!pipelineId && nodeType.startsWith("pipeline_")) {
      pipelineId = nodeType.replace("pipeline_", "");
    }
  }

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
      if (!prop.ui) return;

      const field: typeof dynamicConfigFields[0] = {
        label: prop.ui.label || key,
        type: "text",
        description: prop.description,
        isRuntimeParam: prop.ui.is_load_param === false,
      };

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

    dynamicConfigFields.sort((a, b) => {
      const propA = properties[a.label];
      const propB = properties[b.label];
      const orderA = propA?.ui?.order ?? 999;
      const orderB = propB?.ui?.order ?? 999;
      return orderA - orderB;
    });
  }

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

  const handleConfigChange = (key: string, newValue: unknown) => {
    updateNodeConfig(node.id, { [key]: newValue });
    
    if (sendParameterUpdate && isStreaming) {
      const paramKey = key.charAt(0).toLowerCase() + key.slice(1);
      sendParameterUpdate({ [paramKey]: newValue });
    }
  };

  return (
    <div data-tour="properties-panel" className="absolute right-0 top-0 h-full z-50" onClick={(e) => e.stopPropagation()}>
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
                  const value = node.data.config[field.label] ??
                    node.data.config[field.label.toLowerCase()] ??
                    (field.type === "slider" || field.type === "number" ? 0 :
                      field.type === "toggle" ? false : "");

                  return (
                    <div key={field.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium text-foreground line-clamp-1">{field.label}</label>
                      </div>
                      {field.type === "text" && (
                        <input
                          type="text"
                          className={`w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${field.readonly ? "bg-muted/50 cursor-not-allowed" : ""}`}
                          value={String(value)}
                          readOnly={field.readonly}
                          onChange={(e) =>
                            !field.readonly && handleConfigChange(field.label, e.target.value)
                          }
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          rows={field.label === "Content" ? 22 : 3}
                          value={String(value)}
                          onChange={(e) =>
                            handleConfigChange(field.label, e.target.value)
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
                            handleConfigChange(field.label, parseFloat(e.target.value))
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
                              handleConfigChange(field.label, parseFloat(e.target.value))
                            }
                          />
                        </div>
                      )}

                      {field.type === "select-dynamic" && (
                        <select
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                          value={String(value)}
                          onChange={(e) =>
                            handleConfigChange(field.label, e.target.value)
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
                              : handleConfigChange(field.label, e.target.value)
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
                            !field.readonly && handleConfigChange(field.label, !value)
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
