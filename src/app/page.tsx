"use client";

import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const addOutputNode = useGraphStore((state) => state.addOutputNode);
  const { saveWorkflow, loading: saveLoading } = useWorkflows();
  const [user, setUser] = useState<{ email?: string; avatar_url?: string } | null>(null);

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
  };

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
      />
      <div className="flex-1 flex min-h-0 w-full">
        {sidebarOpen && <NodePalette />}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          <NodeCanvas />
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
