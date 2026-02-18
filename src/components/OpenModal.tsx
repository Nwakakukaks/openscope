"use client";

import { useState, useRef } from "react";
import { X, Upload, FolderOpen, Loader2 } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

interface OpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OpenModal({ isOpen, onClose }: OpenModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addNodesWithEdges = useGraphStore((state) => state.addNodesWithEdges);
  const clearAll = useGraphStore((state) => state.clearAll);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      
      // Simple parsing - extract config from plugin file
      const nodes = parsePluginFile(text);
      
      if (nodes.length === 0) {
        throw new Error("No valid nodes found in the plugin file");
      }

      clearAll();
      addNodesWithEdges(nodes, []);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse plugin file");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[400px] bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Open Plugin</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".py"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={handleClick}
            disabled={loading}
            className="w-full p-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-accent/30 transition-all flex flex-col items-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Loading plugin...</span>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10uted-foreground" text-m />
                <div className="text-center">
                  <span className="text-sm font-medium text-foreground">Click to upload a plugin file</span>
                  <span className="block text-xs text-muted-foreground mt-1">.py files only</span>
                </div>
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Upload a Scope plugin .py file to load its configuration
          </p>
        </div>
      </div>
    </div>
  );
}

function parsePluginFile(content: string): Array<{ type: string; position: { x: number; y: number }; config?: Record<string, unknown> }> {
  const nodes: Array<{ type: string; position: { x: number; y: number }; config?: Record<string, unknown> }> = [];
  
  // Try to extract config class
  const configMatch = content.match(/class\s+(\w+Config)\s*\(\s*BasePipelineConfig/);
  const classMatch = content.match(/class\s+(\w+)\s*\(\s*BasePipeline/);
  
  const pipelineId = configMatch ? configMatch[1].replace('Config', '').toLowerCase() : 'plugin';
  const pipelineName = classMatch ? classMatch[1] : 'My Plugin';
  
  // Extract usage and mode from config
  let usage = 'main';
  let mode = 'video';
  let supportsPrompts = false;
  
  const usageMatch = content.match(/usage:\s*str\s*=\s*["'](\w+)["']/);
  if (usageMatch) usage = usageMatch[1];
  
  const modeMatch = content.match(/mode:\s*str\s*=\s*["'](\w+)["']/);
  if (modeMatch) mode = modeMatch[1];
  
  const promptsMatch = content.match(/supports_prompts:\s*bool\s*=\s*(True|False)/);
  if (promptsMatch) supportsPrompts = promptsMatch[1] === 'True';

  // Add plugin config node
  nodes.push({
    type: 'pluginConfig',
    position: { x: 50, y: 50 },
    config: {
      pipelineId: pipelineId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      pipelineName: pipelineName,
      pipelineDescription: `Loaded from ${pipelineName}.py`,
      usage,
      mode,
      supportsPrompts,
    },
  });

  // Try to detect pipeline type
  let hasInput = false;
  let hasOutput = false;
  
  if (content.includes('def process')) {
    // Add appropriate input based on mode
    if (mode === 'video' || !content.includes('TextPrompt')) {
      nodes.push({
        type: 'videoInput',
        position: { x: 100, y: 200 },
      });
      hasInput = true;
    }
    
    if (usage === 'preprocessor') {
      nodes.push({
        type: 'preprocessorOutput',
        position: { x: 400, y: 200 },
      });
      hasOutput = true;
    } else if (usage === 'postprocessor') {
      nodes.push({
        type: 'postprocessorOutput',
        position: { x: 400, y: 200 },
      });
      hasOutput = true;
    } else {
      nodes.push({
        type: 'pipelineOutput',
        position: { x: 400, y: 200 },
      });
      hasOutput = true;
    }
  }

  // Add default edges
  if (hasInput && hasOutput) {
    nodes.push({ type: '', position: { x: 0, y: 0 } } as any);
  }

  return nodes;
}
