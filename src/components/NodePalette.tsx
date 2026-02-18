"use client";

import { useState, useEffect } from "react";
import {
  Video,
  Type,
  Image,
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
  ChevronDown,
  GripVertical,
  StickyNote,
  Plug,
  Scan,
  Eye,
  Palette,
  Maximize,
  Sparkles,
  Waves,
  Grid3X3,
  Loader2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

interface NodeCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  nodes: { type: string; label: string; icon: React.ReactNode; description: string; pipelineId?: string }[];
  isLoading?: boolean;
}

interface PipelineInfo {
  pipeline_id: string;
  pipeline_name: string;
  pipeline_description?: string;
  supported_modes: string[];
  default_mode?: string;
  plugin_name?: string;
}

export default function NodePalette() {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const addNode = useGraphStore((state) => state.addNode);
  const nodes = useGraphStore((state) => state.nodes);

  const pluginConfigNode = nodes.find((n) => n.data.type === "pluginConfig");
  const usage = (pluginConfigNode?.data?.config?.usage as string) || "main";
  const mode = (pluginConfigNode?.data?.config?.mode as string) || "video";
  const supportsPrompts = pluginConfigNode?.data?.config?.supportsPrompts as boolean;

  const isCategoryEnabled = (categoryName: string): boolean => {
    if (usage === "all") return true;
    switch (categoryName) {
      case "Plugin Config":
      case "Input":
      case "Pipeline":
      case "Output":
      case "Guides":
        return true;
      case "Preprocessor":
        return usage === "preprocessor" || usage === "all";
      case "Postprocessor":
        return usage === "postprocessor" || usage === "all";
      case "Effects":
        return usage === "postprocessor" || usage === "all";
      default:
        return true;
    }
  };

  const toggleCategory = (name: string) => {
    if (expanded.includes(name)) {
      setExpanded(expanded.filter((n) => n !== name));
    } else {
      setExpanded([...expanded, name]);
    }
  };

  const fetchPipelines = async () => {
    setPipelinesLoading(true);
    setPipelinesError(null);
    try {
      const response = await fetch("/api/scope/pipelines/list?scope_url=http://localhost:8000");
      if (!response.ok) {
        throw new Error("Failed to fetch pipelines");
      }
      const data = await response.json();
      setPipelines(data);
    } catch (error) {
      console.error("Failed to fetch pipelines:", error);
      setPipelinesError("Could not connect to Scope server");
    } finally {
      setPipelinesLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleDragStart = (e: React.DragEvent, nodeType: string, pipelineId?: string) => {
    e.dataTransfer.setData("nodeType", nodeType);
    if (pipelineId) {
      e.dataTransfer.setData("pipelineId", pipelineId);
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const pipelineNodes = pipelines.map((p) => ({
    type: `pipeline_${p.pipeline_id}`,
    label: p.pipeline_name,
    icon: <Zap className="w-4 h-4" />,
    description: p.pipeline_description || `${p.supported_modes?.join(", ") || "video"} mode`,
    pipelineId: p.pipeline_id,
  }));

  const getInputNodes = () => {
    const inputNodes = [];
    if (mode === "video") {
      inputNodes.push({ type: "videoInput", label: "Video Input", icon: <Video className="w-4 h-4" />, description: "Accept video frames" });
    }
    if (mode === "text" || supportsPrompts === true) {
      inputNodes.push({ type: "textPrompt", label: "Text Prompt", icon: <Type className="w-4 h-4" />, description: "Text with weights" });
    }
    // Image Input always available as reference
    inputNodes.push({ type: "imageInput", label: "Image Input", icon: <Image className="w-4 h-4" />, description: "Reference images" });
    return inputNodes;
  };

  const getOutputNodes = () => {
    const outputNodes = [];
    if (usage === "main" || usage === "all") {
      outputNodes.push({ type: "pipelineOutput", label: "Main Pipeline", icon: <Zap className="w-4 h-4" />, description: "Main output" });
    }
    if (usage === "preprocessor" || usage === "all") {
      outputNodes.push({ type: "preprocessorOutput", label: "Preprocessor", icon: <Layers className="w-4 h-4" />, description: "Pre-process" });
    }
    if (usage === "postprocessor" || usage === "all") {
      outputNodes.push({ type: "postprocessorOutput", label: "Postprocessor", icon: <Play className="w-4 h-4" />, description: "Post-process" });
    }
    return outputNodes;
  };

  const nodeCategories: NodeCategory[] = [
    {
      name: "Plugin Config",
      icon: <Plug className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: [
        { type: "pluginConfig", label: "Plugin Config", icon: <Plug className="w-4 h-4" />, description: "Pipeline settings" },
      ],
    },
    {
      name: "Input",
      icon: <Video className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: getInputNodes(),
    },
    {
      name: "Pipeline",
      icon: <Zap className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: pipelineNodes,
      isLoading: pipelinesLoading,
    },
    {
      name: "Preprocessor",
      icon: <Layers className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: [
        { type: "parameters", label: "Create New", icon: <Settings className="w-4 h-4" />, description: "Custom pre-processor" },
        { type: "segmentation", label: "Segmentation", icon: <Scan className="w-4 h-4" />, description: "Object detection" },
        { type: "depthEstimation", label: "Depth", icon: <Eye className="w-4 h-4" />, description: "Depth estimation" },
        { type: "backgroundRemoval", label: "Bg Remove", icon: <EyeOff className="w-4 h-4" />, description: "Remove background" },
      ],
    },
    {
      name: "Postprocessor",
      icon: <Play className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: [
        { type: "parameters", label: "Create New", icon: <Settings className="w-4 h-4" />, description: "Custom post-processor" },
        { type: "colorGrading", label: "Color Grading", icon: <Palette className="w-4 h-4" />, description: "Color adjustment" },
        { type: "upscaling", label: "Upscale", icon: <Maximize className="w-4 h-4" />, description: "Resolution upscale" },
        { type: "denoising", label: "Denoise", icon: <Waves className="w-4 h-4" />, description: "Remove noise" },
        { type: "styleTransfer", label: "Style", icon: <Sparkles className="w-4 h-4" />, description: "Art style transfer" },
      ],
    },
    {
      name: "Effects",
      icon: <SunMedium className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: [
        { type: "parameters", label: "New", icon: <Settings className="w-4 h-4" />, description: "Create custom effect" },
        { type: "blur", label: "Blur", icon: <CircleDashed className="w-4 h-4" />, description: "Gaussian blur" },
        { type: "mirror", label: "Mirror", icon: <Maximize2 className="w-4 h-4" />, description: "Mirror effect" },
        { type: "kaleido", label: "Kaleido", icon: <Hexagon className="w-4 h-4" />, description: "Symmetry effect" },
        { type: "vignette", label: "Vignette", icon: <Grid3X3 className="w-4 h-4" />, description: "Edge darkening" },
      ],
    },
    {
      name: "Output",
      icon: <Play className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: getOutputNodes(),
    },
    {
      name: "Guides",
      icon: <StickyNote className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: [
        { type: "lessonGettingStarted", label: "1. Getting Started", icon: <StickyNote className="w-4 h-4" />, description: "What is OpenScope?" },
        { type: "lessonFirstProcessor", label: "2. First Processor", icon: <StickyNote className="w-4 h-4" />, description: "Create your first processor" },
        { type: "lessonNodeTypes", label: "3. Node Types", icon: <StickyNote className="w-4 h-4" />, description: "Understanding the nodes" },
        { type: "lessonPreprocessors", label: "4. Preprocessors", icon: <StickyNote className="w-4 h-4" />, description: "Working with preprocessors" },
        { type: "lessonPostprocessors", label: "5. Postprocessors", icon: <StickyNote className="w-4 h-4" />, description: "Working with postprocessors" },
        { type: "noteGuide", label: "Custom Note", icon: <StickyNote className="w-4 h-4" />, description: "Add your own note" },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-card border-r border-border flex flex-col min-h-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          Node Library
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Drag nodes to canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {nodeCategories.map((category) => {
          const enabled = isCategoryEnabled(category.name);
          return (
          <div key={category.name} className="mb-2">
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              <div className={`flex items-center gap-2 ${category.color}`}>
                {category.icon}
                <span>{category.name}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.includes(category.name) ? "rotate-180" : ""}`}
              />
            </button>
            {expanded.includes(category.name) && (
              <div className="mt-1 space-y-1 ml-2">
                {category.isLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : category.nodes.length > 0 ? (
                  category.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable={enabled}
                      onDragStart={(e) => enabled && handleDragStart(e, node.type, node.pipelineId)}
                      title={!enabled ? "Set usage to include this category in Plugin Config to enable" : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                        enabled 
                          ? "text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-grab active:cursor-grabbing hover:border-border"
                          : "text-muted-foreground/40 cursor-not-allowed border-transparent opacity-60"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center bg-background border border-border ${enabled ? category.color : "text-muted-foreground/40"} ${enabled ? "group-hover:border-primary/30" : ""}`}>
                        {node.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{node.label}</div>
                        <div className="text-xs truncate">{node.description}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    {pipelinesError || "No pipelines found"}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Built with ❤️ by @serial winner
        </div>
      </div>
    </aside>
  );
}
