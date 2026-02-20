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
  Tv,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

interface NodeCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  nodes: {
    type: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    pipelineId?: string;
    enabled?: boolean;
    createNewKind?: "preprocessor" | "postprocessor";
  }[];
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
      case "Settings":
      case "Input":
      case "Pipeline":
      case "Output":
      case "Guides":
      case "Pre-processor":
      case "Post-processor":
        return true;
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
      const response = await fetch("/api/scope/pipelines/list");
      if (!response.ok) {
        throw new Error("Failed to fetch pipelines");
      }
      const data = await response.json();
      setPipelines(data);
      console.log(data)
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

  const handleDragStart = (
    e: React.DragEvent,
    nodeType: string,
    pipelineId?: string,
    createNewKind?: "preprocessor" | "postprocessor"
  ) => {
    e.dataTransfer.setData("nodeType", nodeType);
    if (pipelineId) {
      e.dataTransfer.setData("pipelineId", pipelineId);
    }
    if (createNewKind) {
      e.dataTransfer.setData("createNewKind", createNewKind);
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const isPreprocessor = (p: PipelineInfo): boolean => {
    const id = p.pipeline_id;
    return id === "yolo_mask" || id === "kaleido-scope-pre";
  };

  const isPostprocessor = (p: PipelineInfo): boolean => {
    const id = p.pipeline_id;
    return id === "bloom" || id === "cosmic-vfx" || id === "vfx-pack" || id === "kaleido-scope-post";
  };

  const pipelineNodes = pipelines
    .filter(p => !isPreprocessor(p) && !isPostprocessor(p))
    .map((p) => ({
      type: `pipeline_${p.pipeline_id}`,
      label: p.pipeline_name,
      icon: <Zap className="w-4 h-4" />,
      description: p.pipeline_description || `${p.supported_modes?.join(", ") || "video"} mode`,
      pipelineId: p.pipeline_id,
    }));

  const getInputNodes = () => {
    return [
      { type: "videoInput", label: "Video Input", icon: <Video className="w-4 h-4" />, description: "Accept video frames", enabled: mode === "video" },
      { type: "textPrompt", label: "Text Prompt", icon: <Type className="w-4 h-4" />, description: "Text with weights", enabled: mode === "text" || supportsPrompts === true },
      { type: "imageInput", label: "Image Input", icon: <Image className="w-4 h-4" />, description: "Reference images", enabled: true },
    ];
  };

  const getOutputNodes = () => {
    return [
      { type: "pipelineOutput", label: "Main Pipeline", icon: <Zap className="w-4 h-4" />, description: "Main output", enabled: true },
    ];
  };

  const getPreprocessorNodes = () => {
    const preprocessorPipelines = pipelines.filter(isPreprocessor);
    
    return [
      { type: "pipeline_customPreprocessor", label: "Create New (Beta)", icon: <Sparkles className="w-4 h-4" />, description: "AI generate a processor", enabled: true, createNewKind: "preprocessor" as const },
      ...preprocessorPipelines.map(p => ({
        type: `pipeline_${p.pipeline_id}`,
        label: p.pipeline_name,
        icon: <Hexagon className="w-4 h-4" />,
        description: p.pipeline_description || "Preprocessor pipeline",
        enabled: true,
        pipelineId: p.pipeline_id,
      })),
    ];
  };

  const getPostprocessorNodes = () => {
    const postprocessorPipelines = pipelines.filter(isPostprocessor);
    
    return [
      { type: "pipeline_customPostprocessor", label: "Create New (Beta)", icon: <Sparkles className="w-4 h-4" />, description: "AI generate a processor", enabled: true, createNewKind: "postprocessor" as const },
      ...postprocessorPipelines.map(p => ({
        type: `pipeline_${p.pipeline_id}`,
        label: p.pipeline_name,
        icon: <Sparkles className="w-4 h-4" />,
        description: p.pipeline_description || "Postprocessor pipeline",
        enabled: true,
        pipelineId: p.pipeline_id,
      })),
    ];
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
      name: "Pre-processor",
      icon: <Layers className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: getPreprocessorNodes(),
    },
    {
      name: "Post-processor",
      icon: <Play className="w-4 h-4" />,
      color: "text-slate-400",
      nodes: getPostprocessorNodes(),
    },
    // {
    //   name: "Settings",
    //   icon: <Settings className="w-4 h-4" />,
    //   color: "text-slate-400",
    //   nodes: [
    //     { type: "noiseSettings", label: "Noise", icon: <Settings className="w-4 h-4" />, description: "Noise scale & controller" },
    //     { type: "vaceSettings", label: "VACE", icon: <Settings className="w-4 h-4" />, description: "VACE context guidance" },
    //     { type: "resolutionSettings", label: "Resolution", icon: <Maximize className="w-4 h-4" />, description: "Output resolution" },
    //     { type: "advancedSettings", label: "Advanced", icon: <Settings className="w-4 h-4" />, description: "Denoising steps, quantization" },
    //     { type: "loraSettings", label: "LoRA", icon: <Loader2 className="w-4 h-4" />, description: "LoRA adapters" },
    //   ],
    // },
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
                  category.nodes.map((node) => {
                    const nodeEnabled = enabled && (node.enabled !== false);
                    const isComingSoon = node.enabled === false;
                    return (
                    <div
                      key={node.type}
                      draggable={nodeEnabled}
                      onDragStart={(e) => nodeEnabled && handleDragStart(e, node.type, node.pipelineId, node.createNewKind)}
                      title={!nodeEnabled ? (node.enabled === false ? "Coming Soon - This processor is not yet available" : "Set usage to include this category in Plugin Config to enable") : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                        nodeEnabled
                          ? "text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-grab active:cursor-grabbing hover:border-border"
                          : "text-muted-foreground/50 cursor-not-allowed border-transparent opacity-60"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center bg-background border ${nodeEnabled ? "border-border " + category.color : "border-border/50 text-muted-foreground/40"} ${nodeEnabled ? "group-hover:border-primary/30" : ""}`}>
                        {node.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          {node.label}
                        
                        </div>
                        <div className="text-xs truncate">{node.description}</div>
                      </div>
                    </div>
                  );
                  })
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
