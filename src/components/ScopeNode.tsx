"use client";

import { memo, useRef, useEffect, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Video,
  Type,
  Image as ImageIcon,
  Settings,
  Trash2,
  Zap,
  Code,
  Eye,
  StickyNote,
  Loader2,
  BrainCog,
  FileUp,
  Webcam,
  Send,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import CodeEditor from "./CodeEditor";
import { showSuccess, showError } from "@/lib/toast";
import { getCodeForNodeType } from "@/lib/codeTemplates";

const NODE_STYLE =
  "group min-w-[240px] max-w-[320px] rounded-lg bg-card border border-border transition-all cursor-grab active:cursor-grabbing relative";
const NODE_HEADER =
  "flex items-center gap-2 px-3 py-2 border-b border-border/60";
const ICON_BOX = "w-6 h-6 rounded flex items-center justify-center bg-background text-muted-foreground";

const nodeIcons: Record<string, React.ReactNode> = {
  pipeline: <Zap className="w-3 h-3" />,
  videoInput: <Video className="w-3 h-3" />,
  textPrompt: <Type className="w-3 h-3" />,
  imageInput: <ImageIcon className="w-3 h-3" />,
  parameters: <Settings className="w-3 h-3" />,
  pipelineOutput: <Zap className="w-3 h-3" />,
  noteGuide: <StickyNote className="w-3 h-3" />,
  pluginConfig: <Settings className="w-3 h-3" />,
  custom: <BrainCog className="w-3 h-3" />,
};

const NODE_GUIDES: Record<string, string> = {
  pipeline: "AI pipeline fetched from Scope server. Connect inputs and view output.",
  pluginConfig: "Defines your plugin's identity. Set pipeline ID, name, usage type, and input mode.",
  noteGuide: "Add notes and instructions for your workflow. Useful for documentation.",
  videoInput: "Accept video frames from camera or file. Connect to pipeline input.",
  textPrompt: "Text input with weight for AI generation. Connect to pipelines that support prompts.",
  imageInput: "Reference image for image-to-video pipelines. Connect to blend nodes.",
  parameters: "Key-value parameters for runtime configuration. Pass custom values to your pipeline.",
  custom: "AI-generated processor. Describe what you want in chat mode or write code directly.",
  pipelineOutput: "Main pipeline output marker. Connect pipeline to this to mark the end.",
  pipeline_customPreprocessor: "Starter preprocessor. Connect video on blue handle, Style nodes on purple handle.",
  pipeline_customPostprocessor: "Starter postprocessor. Connect video on blue handle, Style nodes on purple handle.",
  pipeline_: "Server pipeline. Connect video on blue handle, Style nodes on purple handle to add effects.",
  style_custom: "AI-generated style effect function. Describe the visual effect in chat mode.",
};

const STYLE_NODE_GUIDE = "Style effect node. Connect the purple output to a processor's purple input to add effects.";
const PROCESSOR_NODE_GUIDE = "Starter processor. Connect video input on left (blue), Style nodes on purple connector to add effects.";

interface EffectSchemaField {
  type: "slider" | "select" | "text" | "toggle";
  label?: string;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

function ScopeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as {
    label: string;
    type: string;
    config: Record<string, unknown>;
    localStream?: MediaStream | null;
    remoteStream?: MediaStream | null;
    isStreaming?: boolean;
    sendParameterUpdate?: (params: Record<string, unknown>) => void;
    effectSchema?: Record<string, EffectSchemaField>;
  };
  const selectNode = useGraphStore((state) => state.selectNode);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const updateNodeConfig = useGraphStore((state) => state.updateNodeConfig);
  const addNode = useGraphStore((state) => state.addNode);

  const isInput = ["videoInput", "textPrompt", "imageInput", "parameters"].includes(nodeData.type);
  const isOutput = nodeData.type === "pipelineOutput";
  const isNoteGuide = nodeData.type === "noteGuide" || nodeData.type.startsWith("lesson");
  const isPipeline = nodeData.type.startsWith("pipeline_");
  const isEntryPoint = nodeData.type === "pluginConfig";
  const isCodeMode = nodeData.config?.isCodeMode as boolean ?? false;
  const currentCode = nodeData.config?.pythonCode as string | undefined;

  const isStyleNode = nodeData.type.startsWith("style_");
  
  const showLeftHandle = !isEntryPoint && !isStyleNode;
  const showRightHandle = !isOutput;

  const isCustomProcessor = (nodeData.type === "custom" &&
    (nodeData.config?.createNewKind === "preprocessor" || nodeData.config?.createNewKind === "postprocessor")) ||
    nodeData.type === "pipeline_customPreprocessor" ||
    nodeData.type === "pipeline_customPostprocessor";
  
  // Server pipeline nodes (preprocessors/postprocessors from Scope server)
  const isServerProcessor = nodeData.type.startsWith("pipeline_") && 
    (nodeData.config?.usage === "preprocessor" || nodeData.config?.usage === "postprocessor");
  
  // Any processor node (custom or server)
  const isProcessorNode = isCustomProcessor || isServerProcessor;
  
  // Show style input handle for processor nodes
  const showStyleHandle = isProcessorNode;
  
  const processorKind = nodeData.config?.createNewKind as "preprocessor" | "postprocessor" | undefined;

  const [nodeMode, setNodeMode] = useState<"chat" | "code" | "visual">(
    isStyleNode || isCustomProcessor ? "visual" : isCodeMode ? "code" : "visual"
  );

  useEffect(() => {
    if (nodeData.type === "videoInput" && inputVideoRef.current && nodeData.localStream) {
      inputVideoRef.current.srcObject = nodeData.localStream;
      inputVideoRef.current.play().catch(console.error);
    }
  }, [nodeData.type, nodeData.localStream]);

  useEffect(() => {
    if (isOutput && outputVideoRef.current && nodeData.remoteStream) {
      outputVideoRef.current.srcObject = nodeData.remoteStream;
      outputVideoRef.current.play().catch(console.error);
    }
  }, [isOutput, nodeData.remoteStream]);

  const inputVideoRef = useRef<HTMLVideoElement>(null);
  const outputVideoRef = useRef<HTMLVideoElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const showVideoPreview = nodeData.type === "videoInput";
  const showImagePreview = nodeData.type === "imageInput";
  const videoPreviewUrl = nodeData.config?.videoPreviewUrl as string | undefined;
  const previewUrl = nodeData.config?.previewUrl as string | undefined;
  const width = nodeData.config?.width as number | undefined;
  const height = nodeData.config?.height as number | undefined;

  const configPreview = (() => {
    if (nodeData.type === "pluginConfig") {
      const cfg = nodeData.config;
      return `ID: ${cfg?.pipelineId || "—"} | ${cfg?.usage || "main"}`;
    }
    if (nodeData.type === "custom") {
      return nodeData.config?.name as string || "Custom";
    }
    if (nodeData.type.startsWith("pipeline_")) {
      return nodeData.config?.pipelineId as string || "";
    }
    if (nodeData.type.startsWith("style_")) {
      return (nodeData.config?.effectName as string) || nodeData.type.replace("style_", "").replace("_", " ") || "Style";
    }
    if (nodeData.type === "parameters") {
      const keys = Object.keys(nodeData.config || {}).filter(k => !["pipelineId", "pipelineName"].includes(k));
      return keys.length > 0 ? keys.join(", ") : "No params";
    }
    return null;
  })();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
            video.currentTime = 0;
            video.play().catch(() => { });
          }
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };
        video.onplay = drawFrame;
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

  const guideText = nodeData.type.startsWith("pipeline_")
    ? "AI pipeline from Scope server"
    : nodeData.type === "pipeline_customPreprocessor" || nodeData.type === "pipeline_customPostprocessor"
    ? PROCESSOR_NODE_GUIDE
    : nodeData.type.startsWith("style_")
    ? STYLE_NODE_GUIDE
    : NODE_GUIDES[nodeData.type];

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant", content: string }[]>([]);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStyleNode && selected && !nodeData.config?.pythonCode && nodeMode !== "chat") {
      setNodeMode("chat");
    }
  }, [isStyleNode, selected, nodeData.config?.pythonCode, nodeMode]);

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
    if (!chatInput.trim() || chatLoading) return;

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
          generator_type: isCustomProcessor ? "pipeline" : "style",
          processor_kind: processorKind,
          description: userMessage,
        })
      });

      const data = await response.json();

      if (response.ok && data.code) {
        updateNodeConfig(id, {
          pythonCode: data.code,
          code: data.code,
          isCodeMode: true,
          effectSchema: data.schema || {},
        });

        showSuccess(data.schema && Object.keys(data.schema).length > 0 
          ? "Controls added! Use visual mode to adjust parameters." 
          : "Code added to node. Switch to code mode to view.");

        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.schema && Object.keys(data.schema).length > 0
            ? `Effect created with ${Object.keys(data.schema).length} control(s)! Switch to visual mode to adjust.`
            : `Code added to node. Switch to code mode to view.`,
        }]);

        if (data.schema && Object.keys(data.schema).length > 0) {
          setNodeMode("visual");
        } else {
          setNodeMode("code");
        }
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

  const getDefaultCodeTemplate = (): string => {
    return getCodeForNodeType(nodeData.type, nodeData.config, nodeData.config?.createNewKind as string | undefined);
  };

  const toggleMode = (newMode: "chat" | "code" | "visual") => {
    setNodeMode(newMode);
    if (newMode === "code") {
      if (!currentCode) {
        const defaultCode = getDefaultCodeTemplate();
        updateNodeConfig(id, { isCodeMode: true, pythonCode: defaultCode });
      } else {
        updateNodeConfig(id, { isCodeMode: true });
      }
    } else {
      updateNodeConfig(id, { isCodeMode: false });
    }
  };

  const showChatButton = isStyleNode;
  const isInputNode = ["videoInput", "textPrompt", "imageInput", "parameters"].includes(nodeData.type);
  const showCodeButton = !isOutput && !isNoteGuide && !isInputNode;
  const showVisualButton = !isOutput && !isNoteGuide;

  return (
    <div
      className={`${NODE_STYLE} ${selected ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
      onClick={() => selectNode(id)}
    >
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
          id="main"
          className="!w-3 !h-3 !bg-primary !border-2 !border-card"
        />
      )}

      {/* Style input handle - for connecting Style nodes to processor */}
      {showStyleHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="styles"
          style={{ top: "50%", marginTop: -12 }}
          className="!w-3 !h-3 !bg-purple-500 !border-2 !border-card"
          title="Connect Style nodes here to add effects"
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
          {showVisualButton && (
            <button
              onClick={() => toggleMode("visual")}
              className={`p-1 rounded transition-colors ${nodeMode === "visual"
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
              className={`p-1 rounded transition-colors ${nodeMode === "chat"
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
              className={`p-1 rounded transition-colors ${nodeMode === "code"
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-accent hover:text-foreground text-muted-foreground"
                }`}
              title={nodeMode === "code" ? "Code mode" : "Switch to code mode"}
            >
              {<Code className="w-3.5 h-3.5" />}
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
              className={`flex items-center gap-1 px-2 py-1 flex-1 text-xs rounded border transition-colors justify-center ${nodeData.isStreaming === true && nodeData.localStream
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


      {/* Text preview for textPrompt */}
      {nodeData.type === "textPrompt" && (
        <div className="p-2">
          <textarea
            className="w-full px-2 py-1.5 bg-muted rounded text-xs text-foreground resize-none"
            rows={3}
            placeholder="Enter prompt..."
            value={String(nodeData.config?.text || "")}
            onChange={(e) => updateNodeConfig(id, { text: e.target.value })}
          />
        </div>
      )}

      {/* Output preview */}
      {isOutput && (
        <div className="p-2">
          <div className="relative aspect-video bg-muted rounded overflow-hidden">
            {nodeData.remoteStream ? (
              <video
                ref={outputVideoRef}
                className="w-full h-full object-contain"
                playsInline
                muted
                loop
                autoPlay
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Start streaming to see output
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat mode for style nodes - AI generates effect functions */}
      {nodeMode === "chat" && isStyleNode && (
        <div className="px-3 pb-3 mt-2 border-t border-border/40 space-y-2 min-w-12">
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            {isStyleNode 
              ? "Describe the style you want to create or changes to make."
              : "Describe what you're working on"}
          </div>

          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`text-xs p-2 rounded ${msg.role === "user"
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

          <div className="flex gap-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder={isStyleNode ? "Describe style or changes (e.g., 'add glow')" : ""}
              className="flex-1 px-2 py-1.5 bg-muted rounded text-xs text-foreground placeholder:text-muted-foreground"
              disabled={chatLoading}
            />
            <button
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              className="py-1.5 px-2 bg-primary text-primary-foreground rounded disabled:opacity-50 flex items-center justify-center"
            >
              {chatLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Visual mode: Schema controls for style nodes with effect parameters */}
      {nodeMode === "visual" && isStyleNode && nodeData.config?.effectSchema && Object.keys(nodeData.config.effectSchema as Record<string, EffectSchemaField>).length > 0 && (
        <div className="px-3 pb-3 mt-2 border-t border-border/40 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Effect Name</label>
            <input
              type="text"
              value={(nodeData.config?.effectName as string) || ""}
              onChange={(e) => updateNodeConfig(id, { effectName: e.target.value })}
              placeholder="e.g., Glow, Bloom, etc."
              className="w-full px-2 py-1 bg-muted rounded text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium">Parameters</div>
          {Object.entries(nodeData.config.effectSchema as Record<string, EffectSchemaField>).map(([key, field]) => (
            <div key={key} className="space-y-1">
              {field.type === "slider" && (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{field.label || key}</span>
                    <span>{String((nodeData.config as Record<string, unknown>)[key] ?? field.default)}</span>
                  </div>
                  <input
                    type="range"
                    min={field.min ?? 0}
                    max={field.max ?? 1}
                    step={field.step ?? 0.01}
                    value={(nodeData.config as Record<string, unknown>)[key] as number ?? field.default as number}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      updateNodeConfig(id, { [key]: newValue });
                      if (nodeData.sendParameterUpdate) {
                        nodeData.sendParameterUpdate({ [key]: newValue });
                      }
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </>
              )}
              {field.type === "toggle" && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(nodeData.config as Record<string, unknown>)[key] as boolean ?? field.default as boolean}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      updateNodeConfig(id, { [key]: newValue });
                      if (nodeData.sendParameterUpdate) {
                        nodeData.sendParameterUpdate({ [key]: newValue });
                      }
                    }}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span>{field.label || key}</span>
                </label>
              )}
              {field.type === "text" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">{field.label || key}</label>
                  <input
                    type="text"
                    value={(nodeData.config as Record<string, unknown>)[key] as string ?? field.default as string}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      updateNodeConfig(id, { [key]: newValue });
                      if (nodeData.sendParameterUpdate) {
                        nodeData.sendParameterUpdate({ [key]: newValue });
                      }
                    }}
                    className="w-full px-2 py-1 bg-muted rounded text-xs text-foreground"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Code mode */}
      {nodeMode === "code" && (
        <div className="p-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
          <CodeEditor
            value={String(currentCode || "")}
            onChange={(value) => updateNodeConfig(id, { pythonCode: value })}
            onClick={(e) => e.stopPropagation()}
          />
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
          id={isStyleNode ? "styles" : undefined}
          className={`!w-3 !h-3 !border-2 !border-card ${isStyleNode ? "!bg-purple-500" : "!bg-primary"}`}
        />
      )}
    </div>
  );
}

export default memo(ScopeNode);
