"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, Lightbulb, Loader2, Wand2, BookOpen, AlertTriangle, Code } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

interface Message {
  role: "user" | "assistant";
  content: string;
  code?: string;
  isProcessor?: boolean;
  suggestions?: any[];
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProcessorModeState {
  active: boolean;
  kind: "preprocessor" | "postprocessor" | null;
  nodePosition: { x: number; y: number } | null;
}

const quickActions = [
  { icon: Wand2, label: "Suggest Nodes", action: "suggest" },
  { icon: BookOpen, label: "Explain Node", action: "explain" },
  { icon: Lightbulb, label: "Help Me Build", action: "help" },
];

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: `Hi! I'm your OpenScope AI assistant. 

I can help you:
- Suggest nodes based on your goal
- Explain nodes that are available  
- Fix issues with your plugin
- Generate custom processors (Beta)

What would you like to create today?` 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "create-processor">("chat");
  const [processorMode, setProcessorMode] = useState<ProcessorModeState>({
    active: false,
    kind: null,
    nodePosition: null,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nodes = useGraphStore((state) => state.nodes);
  const addNode = useGraphStore((state) => state.addNode);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleCreateProcessor = (event: Event) => {
      const customEvent = event as CustomEvent<{ kind: string; position: { x: number; y: number } }>;
      const { kind, position } = customEvent.detail;
      
      setProcessorMode({
        active: true,
        kind: kind as "preprocessor" | "postprocessor",
        nodePosition: position,
      });
      setActiveTab("create-processor");
      setInput("");
      setMessages([
        {
          role: "assistant",
          content: `Great! Let's create a new ${kind} using AI (Beta).

⚠️ **Disclaimer**: This is AI-generated code and may contain errors. Please review before using.

Describe what you want the processor to do. For example:
- "Add a pixelate effect with adjustable block size"
- "Create a color inversion effect"
- "Add a scanline overlay effect"

What would you like to create?`,
          isProcessor: true,
        }
      ]);
    };

    window.addEventListener('openscope:create-custom-processor', handleCreateProcessor);
    return () => {
      window.removeEventListener('openscope:create-custom-processor', handleCreateProcessor);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      if (activeTab === "create-processor" && processorMode.active) {
        const response = await fetch("/api/ai/generate-processor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: processorMode.kind,
            description: userMessage,
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.code) {
          // Auto-add code to the node
          const allNodes = useGraphStore.getState().nodes;
          const updateNodeConfig = useGraphStore.getState().updateNodeConfig;
          const customNodes = allNodes
            .filter(n => n.data.type === "custom" && n.data.config?.createNewKind === processorMode.kind)
            .sort((a, b) => b.position.y - a.position.y);
          
          if (customNodes.length > 0) {
            const latestNode = customNodes[0];
            updateNodeConfig(latestNode.id, {
              pythonCode: data.code,
              code: data.code,
            });
          }
          
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: `I've added the generated code to your processor node!\n\n${data.code}\n\n⚠️ **Disclaimer**: ${data.disclaimer}\n\nYou can now click on the node to edit the name and parameters in the properties panel.`,
            code: data.code,
            isProcessor: true,
          }]);
          
          // Close the modal after a short delay
          setTimeout(() => {
            setProcessorMode({ active: false, kind: null, nodePosition: null });
            setActiveTab("chat");
            onClose();
          }, 1500);
        } else {
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: `Error: ${data.detail || "Failed to generate processor"}`,
          }]);
        }
      } else {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            node_graph: { nodes, edges: useGraphStore.getState().edges }
          })
        });
        
        const data = await response.json();
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.response || "Sorry, I didn't get a response. Please try again."
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Make sure the backend is running and Groq API is configured."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (loading) return;
    
    setActiveTab("chat");
    
    if (action === "suggest") {
      setInput("I want to create a video effect. Can you suggest which nodes I should use?");
    } else if (action === "explain") {
      setInput("Explain what the kaleido node does and when to use it.");
    } else if (action === "help") {
      setInput("Help me build a mirror effect plugin for Scope.");
    }
  };

  const handleAddProcessorToCanvas = (code: string) => {
    // The node was already added when dropped, find it and update its code
    const allNodes = useGraphStore.getState().nodes;
    const updateNodeConfig = useGraphStore.getState().updateNodeConfig;
    const selectNode = useGraphStore.getState().selectNode;
    
    // Find the most recently added custom node with matching kind
    const customNodes = allNodes
      .filter(n => n.data.type === "custom" && n.data.config?.createNewKind === processorMode.kind)
      .sort((a, b) => b.position.y - a.position.y);
    
    if (customNodes.length > 0) {
      const latestNode = customNodes[0];
      updateNodeConfig(latestNode.id, {
        pythonCode: code,
        code: code,
      });
      selectNode(latestNode.id);
    }
    
    setProcessorMode({ active: false, kind: null, nodePosition: null });
    setActiveTab("chat");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setProcessorMode({ active: false, kind: null, nodePosition: null });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-[420px] h-[600px] bg-card rounded-xl shadow-2xl border border-border flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {activeTab === "create-processor" ? "Create Processor (Beta)" : "Agent"}
            </h3>
          </div>
          {activeTab === "create-processor" && (
            <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">
              Beta
            </span>
          )}
        </div>
        <button onClick={handleClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Quick Actions */}
      {activeTab !== "create-processor" && (
        <div className="px-4 py-3 border-b border-border flex gap-2">
          {quickActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleQuickAction(action.action)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background hover:bg-accent border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      )}

     

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl p-4 ${
              msg.role === "user" 
                ? "bg-primary text-primary-foreground rounded-br-md" 
                : "bg-background border border-border rounded-bl-md"
            }`}>
              {msg.isProcessor && (
                <div className="mb-2 pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Code className="w-3 h-3" />
                    <span>Generated Processor</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">Beta</span>
                  </div>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <button
                    onClick={() => {
                      msg.suggestions?.forEach((s: any, i: number) => {
                        const x = 200 + i * 150;
                        const y = 200 + Math.random() * 100;
                        useGraphStore.getState().addNode(s.type, { x, y });
                      });
                    }}
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Click to add these nodes to canvas
                  </button>
                </div>
              )}

              {msg.code && msg.role === "assistant" && activeTab === "create-processor" && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <Code className="w-3 h-3" />
                    Code automatically added to node
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-background border border-border rounded-2xl rounded-bl-md p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {activeTab === "create-processor" ? "Generating processor code..." : "Thinking..."}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/50">
      
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeTab === "create-processor" ? "Describe the processor you want..." : "Ask me anything..."}
            className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
