"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import "@xyflow/react/dist/style.css";

import { useGraphStore, nodeDefaults } from "@/store/graphStore";
import ScopeNode from "./ScopeNode";
import { Wrench } from "lucide-react";
import { generateNodeCode } from "@/lib/codeGenerator";
import { useMemo } from "react";

function getStarterProcessorCode(kind: "preprocessor" | "postprocessor"): string {
  const typeLabel = kind === "preprocessor" ? "Preprocessor" : "Postprocessor";
  return `"""Starter ${typeLabel} - Connect Style nodes to add effects."""

from typing import TYPE_CHECKING

import torch

from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class Starter${toPascalCase(kind)}Config:
    """Starter ${typeLabel} - parameters come from connected Style nodes."""
    
    pipeline_id = "starter-${kind}"
    pipeline_name = "Starter ${typeLabel}"
    pipeline_description = "Connect Style nodes to this processor to add effects"
    
    # Parameters will be auto-generated from connected Style nodes
    pass


class Starter${toPascalCase(kind)}Pipeline(Pipeline):
    """Starter ${typeLabel} processor - pass-through with Style effects."""
    
    def get_config_class(cls):
        return Starter${toPascalCase(kind)}Config

    def __init__(self, device=None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def prepare(self, **kwargs):
        return Requirements(input_size=1)

    def __call__(self, **kwargs):
        video = kwargs.get("video")
        if video is None:
            raise ValueError("Video required")
        
        frames = torch.stack([frame.squeeze(0) for frame in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        
        # Style effects will be applied here - parameters come from kwargs
        result = frames
        
        return {"video": result.clamp(0, 1).cpu()}


def register_pipelines(register):
    register(Starter${toPascalCase(kind)}Pipeline)`;
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

const nodeTypes = {
  scopeNode: ScopeNode as any,
};

interface NodeCanvasProps {
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  isStreaming?: boolean;
  sendParameterUpdate?: (params: Record<string, unknown>) => void;
}

export default function NodeCanvas({ localStream, remoteStream, isStreaming, sendParameterUpdate }: NodeCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const onNodesChange = useGraphStore((state) => state.onNodesChange);
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange);
  const addEdge = useGraphStore((state) => state.addEdge);
  const addNode = useGraphStore((state) => state.addNode);
  const selectNode = useGraphStore((state) => state.selectNode);

  // Custom onConnect that styles edges based on connection type
  const handleConnect = useCallback((connection: any) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    const isStyleConnection = 
      (sourceNode?.data?.type?.startsWith("style_")) ||
      (targetNode?.data?.type?.startsWith("style_")) ||
      connection.sourceHandle === "styles" ||
      connection.targetHandle === "styles";
    
    const edgeStyle = isStyleConnection 
      ? { stroke: "#a855f7", strokeWidth: 2, animated: true }
      : { stroke: "hsl(var(--primary))", strokeWidth: 2, animated: true };
    
    const newEdge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      type: "smoothstep",
      animated: true,
      style: edgeStyle,
    };
    
    addEdge(newEdge);
  }, [nodes, addEdge]);

  // Inject stream references into node data for video preview
  const nodesWithStreams = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        localStream,
        remoteStream,
        isStreaming,
        sendParameterUpdate,
      },
    }));
  }, [nodes, localStream, remoteStream, isStreaming, sendParameterUpdate]);

  useEffect(() => {
    if (wrapperRef.current) {
      const updateDimensions = () => {
        const { width, height } = wrapperRef.current!.getBoundingClientRect();
        setDimensions({ width, height });
      };

      updateDimensions();

      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(wrapperRef.current);

      return () => resizeObserver.disconnect();
    }
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("nodeType");
      if (!nodeType || !wrapperRef.current) return;
      const createNewKind = event.dataTransfer.getData("createNewKind") || undefined;
      const pipelineId = event.dataTransfer.getData("pipelineId") || undefined;
      const usage = event.dataTransfer.getData("usage") || undefined;

      const reactFlowBounds = wrapperRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 80,
        y: event.clientY - reactFlowBounds.top - 25,
      };

      // Handle Create New (Beta) from pre/post processor categories
      // These create a starter processor that users connect Style nodes to
      if (nodeType === "pipeline_customPreprocessor") {
        addNode("custom", position, { 
          createNewKind: "preprocessor",
          label: "Preprocessor",
          pythonCode: getStarterProcessorCode("preprocessor"),
          isCodeMode: false,
        });
        return;
      }
      if (nodeType === "pipeline_customPostprocessor") {
        addNode("custom", position, { 
          createNewKind: "postprocessor",
          label: "Postprocessor",
          pythonCode: getStarterProcessorCode("postprocessor"),
          isCodeMode: false,
        });
        return;
      }

      if (nodeType === "parameters" && createNewKind) {
        addNode(nodeType, position, { createNewKind });
      } else if (createNewKind === "preprocessor" || createNewKind === "postprocessor") {
        // Add the custom node - the in-canvas chat will appear when selected
        // Start with NO code - user generates via AI chat
        addNode("custom", position, { 
          createNewKind,
          pythonCode: "",
          isCodeMode: false,
        });
      } else if (pipelineId) {
        // Pass pipelineId and usage from drag data to addNode
        addNode(nodeType, position, { pipelineId, usage });
      } else {
        addNode(nodeType, position);
      }
    },
    [addNode]
  );

  return (
    <div ref={wrapperRef} data-tour="canvas" className="flex-1 min-h-0 relative z-0" style={{ width: '100%', height: '100%' }}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ReactFlow
          nodes={nodesWithStreams}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onSelectionChange={({ nodes: selectedNodes }) => {
            const selected = selectedNodes.find(n => n.selected);
            if (selected) {
              selectNode(selected.id);
            }
          }}
          nodeTypes={nodeTypes}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--border))"
          />
          <Controls
            position="bottom-left"
            className="!bg-card !border-border !rounded-lg overflow-hidden [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent [&>button:hover]:!text-foreground"
            showInteractive={false}
          />
          <MiniMap
            position="bottom-right"
            className="!bg-card !border-border !rounded-lg"
            style={{ width: 150, height: 100 }}
            nodeColor={() => "hsl(var(--muted-foreground))"}
            maskColor="hsl(var(--background) / 0.6)"
          />
          {nodes.length === 0 && (
            <Panel
              position="top-center"
              className="pointer-events-none"
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            >
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
                <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to OpenScope!</h3>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">To start building your plugin<span className="text-primary"><Wrench size={16} /></span></p>
                <p className="text-sm text-muted-foreground">Drag nodes from the left panel into the canvas.</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      )}
    </div>
  );
}
