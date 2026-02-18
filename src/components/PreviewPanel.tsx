"use client";

import { useState } from "react";
import { X, Play, Pause, SkipBack, SkipForward, RefreshCw, Maximize2 } from "lucide-react";

interface PreviewPanelProps {
  onClose: () => void;
}

export default function PreviewPanel({ onClose }: PreviewPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames] = useState(24);

  return (
    <div className="h-72 bg-card border-t border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Play className="w-3 h-3 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Preview</span>
          <span className="text-xs text-muted-foreground ml-2">Real-time output</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Playback Controls */}
          <div className="flex items-center gap-1 mr-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-foreground" />
              ) : (
                <Play className="w-4 h-4 text-foreground" />
              )}
            </button>
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <SkipBack className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <SkipForward className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </button>

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
        {/* Original */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Input</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-background p-4">
            <div className="relative w-full aspect-video max-w-xs bg-zinc-900 rounded-lg border border-border flex items-center justify-center overflow-hidden">
              {/* Placeholder for actual video */}
              <div className="text-center">
                <p className="text-xs text-zinc-600">No input video</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Output</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-background p-4">
            <div className="relative w-full aspect-video max-w-xs bg-zinc-900 rounded-lg border border-border flex items-center justify-center overflow-hidden">
              {isPlaying ? (
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="text-center">

                  <p className="text-xs text-zinc-600">Click play to preview</p>
                </div>
              )}

              {/* Processing indicator */}
              {isPlaying && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-primary/20 rounded">
                  <span className="text-xs text-primary font-medium">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono w-12">00:00</span>
          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-background rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted-foreground font-mono w-12 text-right">
            {String(Math.floor(currentFrame / 24)).padStart(2, '0')}:{String(currentFrame % 24).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
