"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, Layers, Sparkles, Palette, Wand2, Image, Type, Sun, Eye, Github } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

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

const categoryIcons: Record<string, any> = {
  "Starter": <Layers className="w-4 h-4" />,
  "Community": <Github className="w-4 h-4" />,
  "Effects": <Sparkles className="w-4 h-4" />,
  "Adjustments": <Sun className="w-4 h-4" />,
  "Advanced": <Wand2 className="w-4 h-4" />,
  "Generation": <Type className="w-4 h-4" />,
};

export default function TemplateModal({ isOpen, onClose }: TemplateModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const addNodesWithEdges = useGraphStore((state) => state.addNodesWithEdges);
  const clearAll = useGraphStore((state) => state.clearAll);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

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
    } finally {
      setLoading(false);
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

    // Clear all nodes and edges first
    clearAll();

    // Add template nodes with edges
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[900px] max-h-[85vh] bg-card rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Choose a Template</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Start with pre-built plugins from the community</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

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
              <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
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
      </div>
    </div>
  );
}
