"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, Layers, Sparkles, Palette, Wand2, Image, Type, Sun, Eye, Github, Plug, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { showError, showSuccess } from "@/lib/toast";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  nodes: any[];
  edges?: { source: number; target: number }[];
  github_url?: string;
}

interface InstalledPlugin {
  name: string;
  version: string | null;
  pipelines: string[];
}

const categoryIcons: Record<string, any> = {
  "Starter": <Layers className="w-4 h-4" />,
  "Community": <Github className="w-4 h-4" />,
  "Effects": <Sparkles className="w-4 h-4" />,
  "Adjustments": <Sun className="w-4 h-4" />,
  "Advanced": <Wand2 className="w-4 h-4" />,
  "Generation": <Type className="w-4 h-4" />,
};

type TabType = "templates" | "plugins";

export default function TemplateModal({ isOpen, onClose }: TemplateModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Plugin management state
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  
const addNodesWithEdges = useGraphStore((state) => state.addNodesWithEdges);
const clearAll = useGraphStore((state) => state.clearAll);

const transformGitUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("git+")) {
    return trimmed;
  }
  const gitHosts = ["github.com", "gitlab.com", "bitbucket.org"];
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const isGitHost = gitHosts.some(host => trimmed.includes(host));
    if (isGitHost) {
      return `git+${trimmed}`;
    }
  }
  return trimmed;
};

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      if (activeTab === "plugins") {
        fetchPlugins();
      }
    }
  }, [isOpen, activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/templates/");
      const data = await response.json();
      setTemplates(data);

      const cats = await fetch("/api/templates/categories");
      const catData = await cats.json();
      setCategories(catData);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      showError("Failed to load templates", "Could not connect to template server");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlugins = async () => {
    setPluginsLoading(true);
    try {
      const response = await fetch("/api/scope/plugins");
      if (response.ok) {
        const data = await response.json();
        setPlugins(data.plugins || []);
      }
    } catch (error) {
      console.error("Failed to fetch plugins:", error);
    } finally {
      setPluginsLoading(false);
    }
  };

  const handleInstallPlugin = async () => {
    if (!installUrl.trim()) return;
    
    setInstalling(true);
    try {
      const response = await fetch("/api/scope/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: transformGitUrl(installUrl.trim()) }),
      });
      
      if (response.ok) {
        showSuccess("Plugin installed", "Restarting server to load new plugin...");
        setInstallUrl("");
        
        await fetch("/api/scope/restart", { method: "POST" });
        
        let attempts = 0;
        while (attempts < 30) {
          try {
            const health = await fetch("/health");
            if (health.ok) break;
          } catch {}
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }
        
        showSuccess("Server restarted", "New plugin is now available");
        fetchPlugins();
      } else {
        const error = await response.json();
        showError("Install failed", error.detail || "Failed to install plugin");
      }
    } catch (error) {
      showError("Install failed", "Could not connect to server");
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallPlugin = async (pluginName: string) => {
    setUninstalling(pluginName);
    try {
      const response = await fetch(`/api/scope/plugins/${pluginName}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        showSuccess("Plugin uninstalled", `${pluginName} has been removed`);
        fetchPlugins();
      } else {
        const error = await response.json();
        showError("Uninstall failed", error.detail || "Failed to uninstall plugin");
      }
    } catch (error) {
      showError("Uninstall failed", "Could not connect to server");
    } finally {
      setUninstalling(null);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template.id);
    clearAll();
    const nodes = template.nodes.map((node: any) => ({
      type: node.type,
      position: node.position,
      config: node.config,
    }));
    addNodesWithEdges(nodes, template.edges || []);
    onClose();
    setSelectedTemplate(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[900px] max-h-[85vh] bg-card rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {activeTab === "templates" ? "Choose a Template" : "Manage Plugins"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTab === "templates" 
                ? "Start with pre-built plugins from the community" 
                : "Install plugins from GitHub or other sources"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "templates"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => setActiveTab("plugins")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "plugins"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plug className="w-4 h-4" />
            Plugins
          </button>
        </div>

        {activeTab === "templates" ? (
          <>
            {/* Search & Filter */}
            <div className="px-6 py-4 border-b border-border space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`p-4 bg-background hover:bg-accent/30 border rounded-xl text-left transition-all group ${selectedTemplate === template.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                        }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground group-hover:text-primary truncate">{template.icon} {template.name}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {filteredTemplates.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No templates found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-background/50">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filteredTemplates.length} templates available</span>
                <span>Select a template to get started</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Plugins Tab */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Install Section */}
              <div className="p-4 bg-background border border-border rounded-xl">
                <h3 className="font-medium text-foreground mb-3">Install Plugin</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="GitHub URL or package name"
                    value={installUrl}
                    onChange={(e) => setInstallUrl(e.target.value)}
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={(e) => e.key === "Enter" && handleInstallPlugin()}
                  />
                  <button
                    onClick={handleInstallPlugin}
                    disabled={installing || !installUrl.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {installing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                       
                        Install
                      </>
                    )}
                  </button>
                </div>
              
              </div>

              {/* Installed Plugins */}
              <div>
                <h3 className="font-medium text-foreground mb-3">Installed Plugins</h3>
                {pluginsLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : plugins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Plug className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No plugins installed</p>
                
                  </div>
                ) : (
                  <div className="space-y-2">
                    {plugins.map((plugin) => (
                      <div
                        key={plugin.name}
                        className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-foreground">{plugin.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {plugin.pipelines.length} pipeline(s)
                            {plugin.version && ` • v${plugin.version}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUninstallPlugin(plugin.name)}
                          disabled={uninstalling === plugin.name}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {uninstalling === plugin.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-background/50">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{plugins.length} plugin(s) installed</span>
                <span>Changes apply immediately</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
