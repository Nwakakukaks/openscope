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

const nodeTypes = {
  scopeNode: ScopeNode as any,
};

export default function NodeCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const onNodesChange = useGraphStore((state) => state.onNodesChange);
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange);
  const onConnect = useGraphStore((state) => state.onConnect);
  const addNode = useGraphStore((state) => state.addNode);
  const selectNode = useGraphStore((state) => state.selectNode);

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

      const reactFlowBounds = wrapperRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 80,
        y: event.clientY - reactFlowBounds.top - 25,
      };

      addNode(nodeType, position);
    },
    [addNode]
  );

  return (
    <div ref={wrapperRef} className="flex-1 min-h-0 relative" style={{ width: '100%', height: '100%' }}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ReactFlow
          nodes={nodes}
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
