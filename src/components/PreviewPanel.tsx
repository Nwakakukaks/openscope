"use client";

import { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Upload, Video } from "lucide-react";

interface PreviewPanelProps {
  onClose: () => void;
  remoteStream?: MediaStream | null;
  localStream?: MediaStream | null;
  isStreaming?: boolean;
  isLoading?: boolean;
  onStartStream?: () => void;
  onStopStream?: () => void;
  onVideoUpload?: (file: File) => void;
}

export default function PreviewPanel({ 
  onClose, 
  remoteStream,
  localStream,
  isStreaming = false,
  isLoading = false,
  onStartStream,
  onStopStream,
  onVideoUpload,
}: PreviewPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames] = useState(24);
  const [inputStream, setInputStream] = useState<MediaStream | null>(null);
  
  const inputVideoRef = useRef<HTMLVideoElement>(null);
  const outputVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (inputVideoRef.current && localStream) {
      inputVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (outputVideoRef.current && remoteStream) {
      outputVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onVideoUpload) {
      onVideoUpload(file);
    }
  };

  const handlePlayPause = () => {
    if (isStreaming) {
      onStopStream?.();
    } else {
      onStartStream?.();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="h-80 bg-card border-t border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Video className="w-3 h-3 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Preview</span>
          <span className="text-xs text-muted-foreground ml-2">
            {isStreaming ? "Streaming" : "Ready"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
          >
            {isStreaming ? (
              <Pause className="w-4 h-4 text-foreground" />
            ) : (
              <Play className="w-4 h-4 text-foreground" />
            )}
          </button>

          <label className="p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </label>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex">
        {/* Input */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Input</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-background p-2">
            <div className="relative w-full aspect-video max-w-[200px] bg-zinc-900 rounded-lg border border-border flex items-center justify-center overflow-hidden">
              {localStream ? (
                <video
                  ref={inputVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-xs text-zinc-500 hover:text-primary">
                      Upload video
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Output</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-background p-2">
            <div className="relative w-full aspect-video max-w-[200px] bg-zinc-900 rounded-lg border border-border flex items-center justify-center overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
              ) : remoteStream ? (
                <video
                  ref={outputVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <p className="text-xs text-zinc-600">
                    {isStreaming ? "Processing..." : "Click play to start"}
                  </p>
                </div>
              )}

              {isStreaming && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/20 rounded">
                  <span className="text-xs text-green-500 font-medium">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono w-12">00:00</span>
          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-background rounded-full appearance-none cursor-pointer accent-primary"
            disabled={isStreaming}
          />
          <span className="text-xs text-muted-foreground font-mono w-12 text-right">
            {String(Math.floor(currentFrame / 24)).padStart(2, '0')}:{String(currentFrame % 24).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
