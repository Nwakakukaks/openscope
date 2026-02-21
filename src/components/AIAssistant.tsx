"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Lightbulb, Loader2, Wand2, BookOpen } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: any[];
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
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

What would you like to create today?` 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nodes = useGraphStore((state) => state.nodes);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
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
    
    if (action === "suggest") {
      setInput("I want to create a video effect. Can you suggest which nodes I should use?");
    } else if (action === "explain") {
      setInput("Explain what the kaleido node does and when to use it.");
    } else if (action === "help") {
      setInput("Help me build a mirror effect plugin for Scope.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-[420px] h-[600px] bg-card rounded-xl shadow-2xl border border-border flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
      
            <h3 className="font-semibold text-foreground">Agent</h3>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Quick Actions */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl p-4 ${
              msg.role === "user" 
                ? "bg-primary text-primary-foreground rounded-br-md" 
                : "bg-background border border-border rounded-bl-md"
            }`}>
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
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-background border border-border rounded-2xl rounded-bl-md p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
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
            placeholder="Ask me anything..."
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
