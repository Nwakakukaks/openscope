"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import NodePalette from "@/components/NodePalette";
import NodeCanvas from "@/components/NodeCanvas";
import PropertiesPanel from "@/components/PropertiesPanel";
import PreviewPanel from "@/components/PreviewPanel";
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
  const [showPreview, setShowPreview] = useState(false);
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
  } = useScopeServer();
  
  const [user, setUser] = useState<{ email?: string; avatar_url?: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Handle video upload from node properties
  useEffect(() => {
    const handleVideoUpload = (event: Event) => {
      const customEvent = event as CustomEvent<{ file: File; nodeId: string }>;
      handleVideoUploadFromFile(customEvent.detail.file);
    };
    
    const handleVideoStreamReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ stream: MediaStream; nodeId: string }>;
      console.log("[OpenScope] Video stream ready from node:", customEvent.detail.nodeId);
      setLocalStream(customEvent.detail.stream);
    };
    
    window.addEventListener('openscope:video-upload', handleVideoUpload);
    window.addEventListener('openscope:video-stream-ready', handleVideoStreamReady);
    return () => {
      window.removeEventListener('openscope:video-upload', handleVideoUpload);
      window.removeEventListener('openscope:video-stream-ready', handleVideoStreamReady);
    };
  }, []);

  const handleVideoUploadFromFile = useCallback(async (file: File) => {
    // Create video element to play the file
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    
    // Create canvas and capture stream at 15fps (like Scope)
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    const stream = canvas.captureStream(15); // 15fps like Scope
    
    // Play video and draw frames to canvas
    video.play();
    const drawFrame = () => {
      if (video.paused || video.ended) return;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    };
    video.onplay = drawFrame;
    
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

  const handleSave = async (name: string, description: string) => {
    await saveWorkflow(name, description);
  };

  const handlePreview = () => {
    addOutputNode();
    setShowPreview(true);
  };

  const handleVideoUpload = useCallback(async (file: File) => {
    await handleVideoUploadFromFile(file);
  }, [handleVideoUploadFromFile]);

  const handleStartStream = useCallback(async () => {
    if (!isScopeConnected) {
      alert("Please ensure Scope server is running at http://localhost:8000");
      return;
    }

    try {
      setIsLoading(true);
      
      const pluginConfig = nodes.find(n => n.data.type === "pluginConfig");
      const pipelineId = pluginConfig?.data?.config?.pipelineId as string || "my-plugin";
      const mode = pluginConfig?.data?.config?.mode as string || "video";
      const remoteInference = pluginConfig?.data?.config?.remoteInference as boolean ?? true;
      const supportsPrompts = pluginConfig?.data?.config?.supportsPrompts as boolean ?? false;
      
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
      
      await loadPipeline([pipelineId], { remoteInference });
      
      // Build prompts array from textPrompt nodes
      const prompts = textPromptNodes.map(node => ({
        text: (node.data.config?.text as string) || "",
        weight: (node.data.config?.weight as number) || 1,
      }));
      
      console.log("[OpenScope] Video input node:", videoInputNode);
      console.log("[OpenScope] Local stream:", localStream);
      console.log("[OpenScope] Mode:", mode);
      console.log("[OpenScope] Pipeline ID:", pipelineId);
      
      // Build initial parameters like Scope frontend does
      const initialParameters: Record<string, unknown> = {
        input_mode: mode,
        prompt_interpolation_method: "linear",
        noise_scale: 0.7,
        noise_controller: true,
        vace_context_scale: 1.0,
        pipeline_ids: [pipelineId],
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

  const handleClosePreview = useCallback(() => {
    if (isStreaming) {
      handleStopStream();
    }
    setShowPreview(false);
  }, [isStreaming, handleStopStream]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Header
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenSave={() => setShowSave(true)}
        onOpenOpen={() => setShowOpen(true)}
        onOpenAI={() => setShowAI(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onPreview={handlePreview}
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
          <NodeCanvas />
          {showPreview && (
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <PreviewPanel
                onClose={handleClosePreview}
                remoteStream={remoteStream}
                localStream={localStream}
                isStreaming={isStreaming}
                isLoading={isLoading}
                onStartStream={handleStartStream}
                onStopStream={handleStopStream}
                onVideoUpload={handleVideoUpload}
              />
            </div>
          )}
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
