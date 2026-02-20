"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Save,
  FolderOpen,
  Download,
  ChevronDown,
  FolderPlus,
  Github,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircleQuestion,
  CircleUser,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { generatePluginFiles } from "@/lib/codeGenerator";
import JSZip from "jszip";

interface HeaderProps {
  onOpenTemplates: () => void;
  onOpenSave: () => void;
  onOpenOpen: () => void;
  onOpenAI: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  user: { email?: string; avatar_url?: string } | null;
  onAuthClick: () => void;
  isScopeConnected?: boolean;
  isStreaming?: boolean;
  onStartStream?: () => void;
  onStopStream?: () => void;
}

export default function Header({ 
  onOpenTemplates, 
  onOpenSave, 
  onOpenOpen, 
  onOpenAI, 
  onToggleSidebar, 
  sidebarOpen,
  user,
  onAuthClick,
  isScopeConnected,
  isStreaming,
  onStartStream,
  onStopStream,
}: HeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const handleExport = async () => {
    const files = generatePluginFiles(nodes, edges);
    const zip = new JSZip();
    
    for (const [filename, content] of Object.entries(files)) {
      zip.file(filename, content);
    }
    
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my_plugin.zip";
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
          title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">OpenScope</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Plugin Builder</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border mx-2" />
        <nav className="flex items-center gap-1">
          <ActionButton icon={FolderPlus} label="Templates" onClick={onOpenTemplates} />
          {/* <ActionButton icon={FolderOpen} label="Open" onClick={onOpenOpen} /> */}
          <ActionButton icon={Save} label="Save" onClick={onOpenSave} />
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {/* Scope Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
          {isScopeConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          {/* <span className="text-xs text-muted-foreground">
            {isScopeConnected ? "Scope Connected" : "Scope Offline"}
          </span> */}
        </div>
        
        {/* Streaming Controls */}
        {isStreaming ? (
          <button
            onClick={onStopStream}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <Pause className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={onStartStream}
            className="flex items-center gap-2 px-4 py-2 rounded-lg  bg-accent text-accent-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
        )}
        <button
          onClick={onOpenAI}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-muted transition-colors text-sm font-medium"
        >
          <MessageCircleQuestion className="w-4 h-4" />
          Agent
        </button>
        {/* <div className="h-8 w-px bg-border mx-1" /> */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden">
              <div className="p-1">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  <Download className="w-4 h-4 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Export as Plugin</div>
                    <div className="text-xs text-muted-foreground">Python file</div>
                  </div>
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
                  <Github className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">Publish to GitHub</div>
                    <div className="text-xs text-muted-foreground">Share your plugin</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="h-8 w-px bg-border mx-1" />
        <button
          onClick={onAuthClick}
          className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-accent transition-colors"
        >
          {user ? (
            <div className="flex items-center gap-2">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <CircleUser className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <CircleUser className="w-5 h-5" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors font-medium"
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
