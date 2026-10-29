import { useState, useRef, useEffect } from "react";
import { ConnectionLines } from "../components/pipeline/ConnectionLines";
import { Icons } from "../components/pipeline/icons";
import { NodePalette } from "../components/pipeline/NodePalette";
import { NodeSettingsModal } from "../components/pipeline/NodeSettingsModal";
import { NODE_WIDTH } from "../components/pipeline/nodeRegistry";
import { PipelineNode } from "../components/pipeline/PipelineNode";

export default function PipelinePage() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [draggingNode, setDraggingNode] = useState(null); // {id, startX, startY, offsetX, offsetY}
  const [connecting, setConnecting] = useState(null); // {nodeId, portIndex, isInput, x, y}
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeModalNode, setActiveModalNode] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });

      if (draggingNode) {
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === draggingNode.id
              ? {
                  ...n,
                  x: e.clientX - draggingNode.offsetX,
                  y: e.clientY - draggingNode.offsetY,
                }
              : n,
          ),
        );
      }
    };

    const handleMouseUp = () => {
      setDraggingNode(null);
      setConnecting(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNode]);

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const dataString = e.dataTransfer.getData("application/json");
    if (!dataString) return;

    const tool = JSON.parse(dataString);
    const rect = canvasRef.current.getBoundingClientRect();

    const newNode = {
      ...tool,
      id: `node${Date.now()}`,
      x: Math.max(20, e.clientX - rect.left - NODE_WIDTH / 2),
      y: Math.max(20, e.clientY - rect.top - 40),
      config: {},
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNode({
      id: nodeId,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y,
    });
  };

  const handleDoubleClick = (e, node) => {
    e.stopPropagation();
    setActiveModalNode(node);
  };

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setActiveModalNode(null);
  };

  const updateNodeData = (nodeId, newData) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n,
      ),
    );
  };

  const startConnection = (e, nodeId, isInput, portIndex) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setConnecting({
      nodeId,
      isInput,
      portIndex,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const finishConnection = (e, nodeId, isInput) => {
    e.stopPropagation();
    if (!connecting) return;
    if (connecting.nodeId === nodeId) {
      setConnecting(null);
      return;
    }
    if (connecting.isInput === isInput) {
      setConnecting(null);
      return;
    }

    const source = connecting.isInput ? nodeId : connecting.nodeId;
    const target = connecting.isInput ? connecting.nodeId : nodeId;

    if (edges.some((e) => e.source === source && e.target === target)) {
      setConnecting(null);
      return;
    }

    setEdges([...edges, { id: `edge_${source}_${target}`, source, target }]);
    setConnecting(null);
  };

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans text-slate-800 overflow-hidden select-none">
      {/* PANEL BOCZNY (TOOLBOX) */}
      <NodePalette nodesCount={nodes.length} edgesCount={edges.length} />

      {/* OBSZAR ROBOCZY (CANVAS) */}
      <div
        ref={canvasRef}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        className="flex-1 h-full relative overflow-hidden bg-slate-50 cursor-default"
        style={{
          backgroundImage:
            "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
      >
        <ConnectionLines
          nodes={nodes}
          edges={edges}
          connecting={connecting}
          mousePos={mousePos}
          onEdgeClick={(edgeId) => setEdges(edges.filter((e) => e.id !== edgeId))}
        />

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-2xl max-w-md bg-white/60 backdrop-blur-xs">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icons.Combine />
              </div>
              <h3 className="font-bold text-slate-700 text-base">Pusty potok przetwarzania</h3>
              <p className="text-xs text-slate-500 mt-1">
                Przeciągnij węzeł z lewego panelu (np. <strong>Import CSV</strong>), a następnie połącz go z <strong>Wykres słupkowy</strong>.
              </p>
            </div>
          </div>
        )}

        {nodes.map((node) => (
          <PipelineNode
            key={node.id}
            node={node}
            isActive={activeModalNode?.id === node.id}
            onHeaderMouseDown={handleNodeMouseDown}
            onDoubleClick={handleDoubleClick}
            onPortMouseDown={startConnection}
            onPortMouseUp={finishConnection}
          />
        ))}
      </div>

      {/* MODAL USTAWIEŃ WĘZŁA */}
      {activeModalNode && (
        <NodeSettingsModal
          node={activeModalNode}
          nodes={nodes}
          edges={edges}
          updateNodeData={updateNodeData}
          onClose={() => setActiveModalNode(null)}
          onDelete={deleteNode}
        />
      )}
    </div>
  );
}
