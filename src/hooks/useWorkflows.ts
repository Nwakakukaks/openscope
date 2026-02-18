import { useCallback, useEffect, useState } from 'react';
import { supabase, Workflow, WorkflowVersion } from '@/lib/supabase';
import { useGraphStore, NodeData } from '@/store/graphStore';
import { Edge } from '@xyflow/react';

interface UseWorkflowsReturn {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  saveWorkflow: (name: string, description?: string) => Promise<Workflow | null>;
  loadWorkflow: (workflow: Workflow) => void;
  deleteWorkflow: (id: string) => Promise<void>;
  fetchWorkflows: () => Promise<void>;
}

export function useWorkflows(): UseWorkflowsReturn {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const addNodesWithEdges = useGraphStore((state) => state.addNodesWithEdges);
  const clearAll = useGraphStore((state) => state.clearAll);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setWorkflows(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveWorkflow = useCallback(async (name: string, description?: string): Promise<Workflow | null> => {
    setLoading(true);
    setError(null);
    try {
      const pluginConfigNode = nodes.find(n => n.data.type === 'pluginConfig');
      const pluginConfig = pluginConfigNode?.data?.config || {};
      
      const workflowData = {
        name,
        description: description || '',
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        plugin_config: pluginConfig,
      };

      const { data, error: insertError } = await supabase
        .from('workflows')
        .insert(workflowData)
        .select()
        .single();

      if (insertError) throw insertError;
      
      await fetchWorkflows();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
      return null;
    } finally {
      setLoading(false);
    }
  }, [nodes, edges, fetchWorkflows]);

  const loadWorkflow = useCallback((workflow: Workflow) => {
    clearAll();
    
    const loadedNodes = (workflow.nodes as Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: NodeData;
    }>).map(n => ({
      type: n.type,
      position: n.position,
      config: n.data?.config || {},
    }));
    
    const loadedEdges = (workflow.edges as Array<{
      source: number;
      target: number;
    }>);
    
    addNodesWithEdges(loadedNodes, loadedEdges);
  }, [clearAll, addNodesWithEdges]);

  const deleteWorkflow = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    } finally {
      setLoading(false);
    }
  }, [fetchWorkflows]);

  return {
    workflows,
    loading,
    error,
    saveWorkflow,
    loadWorkflow,
    deleteWorkflow,
    fetchWorkflows,
  };
}
