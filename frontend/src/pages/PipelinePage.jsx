import { useState, useRef, useEffect } from "react";
import { ConnectionLines } from "../components/pipeline/ConnectionLines";
import { Icons } from "../components/pipeline/icons";
import { NodePalette } from "../components/pipeline/NodePalette";
import { NodeSettingsModal } from "../components/pipeline/NodeSettingsModal";
import { NODE_WIDTH } from "../components/pipeline/nodeRegistry";
import { PipelineNode } from "../components/pipeline/PipelineNode";
import { usePipelineStore } from "../store/usePipelineStore";

export default function PipelinePage() {
  const {
    nodes,
    edges,
    addNode,
    updateNodePosition,
    updateNodeData,
    deleteNode,
    addEdge,
    deleteEdge,
  } = usePipelineStore();

  const [draggingNode, setDraggingNode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeModalNodeId, setActiveModalNodeId] = useState(null);

  const activeModalNode = nodes.find((n) => n.id === activeModalNodeId) || null;

  const canvasRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });

      if (draggingNode) {
        updateNodePosition(
          draggingNode.id,
          e.clientX - draggingNode.offsetX,
          e.clientY - draggingNode.offsetY,
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
  }, [draggingNode, updateNodePosition]);

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

    addNode(newNode);
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
    setActiveModalNodeId(node.id);
  };

  const handleDeleteNode = (nodeId) => {
    deleteNode(nodeId);
    setActiveModalNodeId(null);
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
    if (connecting.nodeId === nodeId || connecting.isInput === isInput) {
      setConnecting(null);
      return;
    }

    const source = connecting.isInput ? nodeId : connecting.nodeId;
    const target = connecting.isInput ? connecting.nodeId : nodeId;

    addEdge({ id: `edge_${source}_${target}`, source, target });
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
          backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
      >
        <ConnectionLines
          nodes={nodes}
          edges={edges}
          connecting={connecting}
          mousePos={mousePos}
          onEdgeClick={(edgeId) => deleteEdge(edgeId)}
        />

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-2xl max-w-md bg-white/60 backdrop-blur-xs">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icons.Combine />
              </div>
              <h3 className="font-bold text-slate-700 text-base">
                Pusty potok przetwarzania
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Przeciągnij węzeł z lewego panelu (np.{" "}
                <strong>Import CSV</strong>), a następnie połącz go z{" "}
                <strong>Wykres słupkowy</strong>.
              </p>
            </div>
          </div>
        )}

        {nodes.map((node) => (
          <PipelineNode
            key={node.id}
            node={node}
            isActive={activeModalNode === node.id}
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
          onClose={() => setActiveModalNodeId(null)}
          onDelete={handleDeleteNode}
        />
      )}
    </div>
  );
}
