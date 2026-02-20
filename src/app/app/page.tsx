"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import NodePalette from "@/components/NodePalette";
import NodeCanvas from "@/components/NodeCanvas";
import PropertiesPanel from "@/components/PropertiesPanel";
import TemplateModal from "@/components/TemplateModal";
import AIAssistant from "@/components/AIAssistant";
import SaveModal from "@/components/SaveModal";
import OpenModal from "@/components/OpenModal";
import AuthModal from "@/components/AuthModal";
import { useGraphStore } from "@/store/graphStore";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useScopeServer } from "@/hooks/useScopeServer";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const addOutputNode = useGraphStore((state) => state.addOutputNode);
  
  const { saveWorkflow, loading: saveLoading } = useWorkflows();
  const {
    isConnected: isScopeConnected,
    isConnecting,
    pipelineStatus,
    loadPipeline,
    startWebRTC,
    stopWebRTC,
    connectToCloud,
    sendParameterUpdate,
  } = useScopeServer();
  
  const [user, setUser] = useState<{ email?: string; avatar_url?: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const handleVideoUploadFromFile = useCallback(async (file: File) => {
    // Clean up previous video element if exists
    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.src = '';
      videoElementRef.current = null;
    }

    // Create video element to play the file (like Scope does)
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.loop = true; // Loop the video continuously
    video.autoplay = true;
    videoElementRef.current = video;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
    });
    
    // Create canvas matching video resolution
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Start video playback
    await video.play();
    
    // Continuous frame capture at 15fps (like Scope)
    const FPS = 15;
    const stream = canvas.captureStream(FPS);
    
    // Draw frames continuously using requestAnimationFrame
    const drawFrame = () => {
      if (videoElementRef.current && ctx) {
        ctx.drawImage(videoElementRef.current, 0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(drawFrame);
    };
    drawFrame();
    
    setLocalStream(stream);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for video stream ready events from nodes
  useEffect(() => {
    const handleVideoStreamReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ stream: MediaStream; nodeId: string }>;
      console.log("[OpenScope] Video stream ready from node:", customEvent.detail.nodeId);
      setLocalStream(customEvent.detail.stream);
    };
    
    window.addEventListener('openscope:video-stream-ready', handleVideoStreamReady);
    return () => {
      window.removeEventListener('openscope:video-stream-ready', handleVideoStreamReady);
    };
  }, []);

  // Listen for AI assistant open request
  useEffect(() => {
    const handleOpenAI = () => {
      setShowAI(true);
    };
    
    window.addEventListener('openscope:open-ai-assistant', handleOpenAI);
    return () => {
      window.removeEventListener('openscope:open-ai-assistant', handleOpenAI);
    };
  }, []);

  const handleSave = async (name: string, description: string) => {
    await saveWorkflow(name, description);
  };

  const handleStartStream = useCallback(async () => {
    if (!isScopeConnected) {
      alert("Please ensure Scope server is running");
      return;
    }

    try {
      setIsLoading(true);
      
      const pluginConfig = nodes.find(n => n.data.type === "pluginConfig");
      
      // Get pipeline node - this is where the main pipeline is defined
      const pipelineNode = nodes.find(n => n.data.type === "pipeline");
      const pipelineId = pipelineNode?.data?.config?.pipelineId as string || 
                        pluginConfig?.data?.config?.pipelineId as string || 
                        "passthrough";
      
      // Get any processor-specific config from the pipeline node
      const pipelineConfig = pipelineNode?.data?.config || {};
      
      const mode = pluginConfig?.data?.config?.mode as string || "video";
      const remoteInference = pluginConfig?.data?.config?.remoteInference as boolean ?? false;
      const supportsPrompts = pluginConfig?.data?.config?.supportsPrompts as boolean ?? false;
      
      // Legacy: still check for standalone processor nodes (not using pipeline as processor)
      const processorNodeTypes = ['kaleidoscope', 'yoloMask', 'bloom', 'cosmicVFX', 'vfxPack'];
      const processorNodes = nodes.filter(n => processorNodeTypes.includes(n.data.type));
      
      // Map node types to their pipeline IDs (for legacy standalone processors)
      const processorPipelineIds: Record<string, string> = {
        'kaleidoscope': 'kaleido-scope-pre',
        'yoloMask': 'yolo-mask',
        'bloom': 'bloom',
        'cosmicVFX': 'cosmic-vfx',
        'vfxPack': 'vfx-pack',
      };
      
      // Check and install required plugins
      for (const node of processorNodes) {
        const processorType = node.data.type as string;
        try {
          const checkRes = await fetch(`/api/scope/plugins/check/${processorType}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (!checkData.installed) {
              console.log(`[OpenScope] Installing plugin for ${processorType}...`);
              const installRes = await fetch(`/api/scope/plugins/install/${processorType}`, {
                method: 'POST',
              });
              if (installRes.ok) {
                const installData = await installRes.json();
                console.log(`[OpenScope] ${installData.message}`);
              } else {
                console.error(`[OpenScope] Failed to install plugin for ${processorType}`);
              }
            } else {
              console.log(`[OpenScope] Plugin already installed for ${processorType}`);
            }
          }
        } catch (err) {
          console.error(`[OpenScope] Error checking/installing plugin for ${processorType}:`, err);
        }
      }
      
      const pipeline_ids = [
        ...processorNodes.map(n => processorPipelineIds[n.data.type]).filter(Boolean),
        pipelineId,
      ];
      
      // Get input nodes
      const videoInputNode = nodes.find(n => n.data.type === "videoInput");
      const textPromptNodes = nodes.filter(n => n.data.type === "textPrompt");
      const imageInputNodes = nodes.filter(n => n.data.type === "imageInput");
      
      // If remote inference is enabled, connect to cloud first
      if (remoteInference) {
        try {
          await connectToCloud();
        } catch (cloudErr) {
          console.warn("Cloud connection failed, continuing anyway:", cloudErr);
        }
      }
      
      // Include pipeline config parameters when loading pipeline
      await loadPipeline([pipelineId], { remoteInference, ...pipelineConfig });
      
      // Build prompts array from textPrompt nodes
      const prompts = textPromptNodes.map(node => ({
        text: (node.data.config?.text as string) || "",
        weight: (node.data.config?.weight as number) || 1,
      }));
      
      console.log("[OpenScope] Video input node:", videoInputNode);
      console.log("[OpenScope] Local stream:", localStream);
      console.log("[OpenScope] Mode:", mode);
      console.log("[OpenScope] Pipeline ID:", pipelineId);
      
      // Build initial parameters
      const initialParameters: Record<string, unknown> = {
        input_mode: mode,
        prompt_interpolation_method: "linear",
        noise_scale: 0.7,
        noise_controller: true,
        vace_context_scale: 1.0,
        pipeline_ids: pipeline_ids,
        recording: false,
      };
      
      // Add prompts if available
      if (supportsPrompts && prompts.length > 0) {
        initialParameters.prompts = prompts;
      }
      
      // Add reference images if available
      if (imageInputNodes.length > 0) {
        const images = imageInputNodes
          .map(n => n.data.config?.path as string)
          .filter(Boolean);
        if (images.length > 0) {
          initialParameters.images = images;
        }
      }
      
      console.log("[OpenScope] Initial parameters being sent:", JSON.stringify(initialParameters, null, 2));
      console.log("[OpenScope] Local stream for WebRTC:", localStream ? "available" : "NOT AVAILABLE");
      console.log("[OpenScope] Video tracks:", localStream?.getVideoTracks().length);
      
      if (!localStream) {
        alert("Please upload a video in the Video Input node first");
        setIsLoading(false);
        return;
      }
      
      // Start WebRTC - localStream will be sent if user uploaded video in Preview panel
      await startWebRTC((stream) => {
        setRemoteStream(stream);
        setIsStreaming(true);
      }, initialParameters, localStream);
      
    } catch (err) {
      console.error("Failed to start stream:", err);
      alert("Failed to start stream: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isScopeConnected, nodes, loadPipeline, startWebRTC, connectToCloud]);

  const handleStopStream = useCallback(() => {
    stopWebRTC();
    setIsStreaming(false);
    setRemoteStream(null);
  }, [stopWebRTC]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Header
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenSave={() => setShowSave(true)}
        onOpenOpen={() => setShowOpen(true)}
        onOpenAI={() => setShowAI(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        user={user}
        onAuthClick={() => setShowAuth(true)}
        isScopeConnected={isScopeConnected}
        isStreaming={isStreaming}
        onStartStream={handleStartStream}
        onStopStream={handleStopStream}
      />
      <div className="flex-1 flex min-h-0 w-full">
        {sidebarOpen && <NodePalette />}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          <NodeCanvas 
            localStream={localStream} 
            remoteStream={remoteStream}
            isStreaming={isStreaming}
            sendParameterUpdate={sendParameterUpdate}
          />
         
        </div>
        {selectedNode && <PropertiesPanel />}
      </div>

      {/* Modals */}
      <TemplateModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />

      <SaveModal
        isOpen={showSave}
        onClose={() => setShowSave(false)}
        onSave={handleSave}
        loading={saveLoading}
      />

      <OpenModal
        isOpen={showOpen}
        onClose={() => setShowOpen(false)}
      />

      <AIAssistant
        isOpen={showAI}
        onClose={() => setShowAI(false)}
      />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthSuccess={() => {}}
      />
    </div>
  );
}
