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
};

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
  const addNode = useGraphStore((state) => state.addNode);

  const isInput = ["videoInput", "textPrompt", "imageInput", "parameters"].includes(nodeData.type);
  const isOutput = nodeData.type === "pipelineOutput";
  const isNoteGuide = nodeData.type === "noteGuide" || nodeData.type.startsWith("lesson");
  const isPipeline = nodeData.type.startsWith("pipeline_");
  const isEntryPoint = nodeData.type === "pluginConfig";
  const isCodeMode = nodeData.config?.isCodeMode as boolean ?? false;
  const currentCode = nodeData.config?.pythonCode as string | undefined;

  const showLeftHandle = !isEntryPoint;
  const showRightHandle = !isOutput;

  const isCustomProcessor = nodeData.type === "custom" &&
    (nodeData.config?.createNewKind === "preprocessor" || nodeData.config?.createNewKind === "postprocessor");
  const processorKind = nodeData.config?.createNewKind as "preprocessor" | "postprocessor" | undefined;

  const [nodeMode, setNodeMode] = useState<"chat" | "code" | "visual">(
    isCustomProcessor ? "chat" : isCodeMode ? "code" : "visual"
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
    : NODE_GUIDES[nodeData.type];

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant", content: string }[]>([]);
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
        const defaultCode = `# Define your processor here
# frames: tensor of shape (T, H, W, C) in [0, 1] range
# Return processed frames

def process(frames, **kwargs):
    return frames
`;
        updateNodeConfig(id, { isCodeMode: true, pythonCode: defaultCode });
      } else {
        updateNodeConfig(id, { isCodeMode: true });
      }
    } else {
      updateNodeConfig(id, { isCodeMode: false });
    }
  };

  const showChatButton = isCustomProcessor;
  const showCodeButton = !isOutput && !isNoteGuide;

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

      {/* Chat mode for custom processors */}
      {nodeMode === "chat" && isCustomProcessor && (
        <div className="px-3 pb-3 mt-2 border-t border-border/40 space-y-2 min-w-12">
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <span>Describe what you want this {processorKind} to do!</span>
            <button
              onClick={() => {
                const guideContent = processorKind === "preprocessor"
                  ? `We've got a growing set of pre-processor effect you can create right now, just describe what you want and it's gets created by the agent!

📷 GRAYSCALE
Convert video to black & white — lightweight, no model needed

🎨 SKETCH 
Generate scribble-style outlines from your video — great for artistic effects

🔄 OPTICAL FLOW
Track motion between frames — useful for stabilization or as input to other pipelines

📐 Yolo mask
Generate depth maps from video — powers VACE structural guidance

🔮 KALEIDOSCOPE Pre
Mirror symmetry with N-fold rotational patterns — create stunning reflective effects

With many more coming soon!`

                  : `We've got a growing set of post processor effect you can create right now, just describe what you want and it's gets created by the agent! 

✨ CHROMATIC ABERRATION
RGB channel displacement — that classic lens imperfection look

📺 VHS / RETRO
Scanlines, tracking distortion, noise — full retro CRT aesthetic

🖼️ HALFTONE
Newspaper dot pattern effect — retro print aesthetic

🔮 KALEIDOSCOPE
Mirror symmetry with rotational patterns — stunning reflective visuals

⚡ GLITCH
RGB split, scanlines, digital artifacts — digital corruption looks

💫 BLOOM
Soft glow around bright areas — dreamy aesthetic

With many more coming soon!`;

                addNode("noteGuide", { x: 100, y: 100 }, { title: `${processorKind} Guide (Beta)`, content: guideContent });
              }}
              className="text-primary hover:text-primary/80 underline font-medium"
            >
              Here's some ideas to explore
            </button>

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
              placeholder={`Create a ${processorKind} that...`}
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
          className="!w-3 !h-3 !bg-primary !border-2 !border-card"
        />
      )}
    </div>
  );
}

export default memo(ScopeNode);
