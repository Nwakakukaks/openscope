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
  const onConnect = useGraphStore((state) => state.onConnect);
  const addNode = useGraphStore((state) => state.addNode);
  const selectNode = useGraphStore((state) => state.selectNode);

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
      if (nodeType === "pipeline_customPreprocessor") {
        addNode("custom", position, { 
          createNewKind: "preprocessor",
          pythonCode: generateNodeCode("custom", { createNewKind: "preprocessor" }),
          isCodeMode: true,
        });
        return;
      }
      if (nodeType === "pipeline_customPostprocessor") {
        addNode("custom", position, { 
          createNewKind: "postprocessor",
          pythonCode: generateNodeCode("custom", { createNewKind: "postprocessor" }),
          isCodeMode: true,
        });
        return;
      }

      if (nodeType === "parameters" && createNewKind) {
        addNode(nodeType, position, { createNewKind });
      } else if (createNewKind === "preprocessor" || createNewKind === "postprocessor") {
        // Add the custom node - the in-canvas chat will appear when selected
        addNode("custom", position, { 
          createNewKind,
          pythonCode: generateNodeCode("custom", { createNewKind }),
          isCodeMode: true,
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
          onConnect={onConnect}
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
