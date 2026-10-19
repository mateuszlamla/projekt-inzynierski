import { useState, useRef, useEffect } from "react";
import { BarChartSettings } from "./components/BarChartSetings";
import { LineChartSettings } from "./components/LineChartSettings";
import { LinearRegressionSettings } from "./components/LinearRegressionSettings";
import { CsvUploadSettings } from "./components/CsvUploadSettings";
import { DataViewSettings } from "./components/DataViewSettings";

const Icons = {
  Database: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  ),
  FileText: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Filter: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  ),
  Combine: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  ),
  BarChart: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  ),
  LineChart: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 3v18h18"></path>
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
    </svg>
  ),
  Settings: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  X: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
};

const TOOLBOX = [
  {
    category: "Źródła danych",
    color: "bg-emerald-500 border-emerald-600",
    headerColor: "bg-emerald-100 text-emerald-800",
    items: [
      {
        type: "csv",
        label: "Import CSV",
        icon: "FIleText",
        inputs: 0,
        outputs: 1,
      },
      {
        type: "database",
        label: "Baza danych",
        icon: "Database",
        inputs: 0,
        outputs: 1,
      },
    ],
  },
  {
    category: "Transformacja",
    color: "bg-blue-500 border-blue-600",
    headerColor: "bg-blue-100 text-blue-800",
    items: [
      {
        type: "filter",
        label: "Filtruj",
        icon: "Filter",
        inputs: 1,
        outputs: 1,
      },
      {
        type: "combine",
        label: "Łącz",
        icon: "Combine",
        inputs: 2,
        outputs: 1,
      },
    ],
  },
  {
    category: "Wizualizacja",
    color: "bg-purple-500 border-purple-600",
    headerColor: "bg-purple-100 text-purple-800",
    items: [
      {
        type: "bar_chart",
        label: "Wykres słupkowy",
        icon: "BarChart",
        inputs: 1,
        outputs: 0,
      },
      {
        type: "table_view",
        label: "Podgląd danych",
        icon: "FileText",
        inputs: 1,
        outputs: 0,
      },
      {
        type: "line_chart",
        label: "Wykres liniowy",
        icon: "LineChart",
        inputs: 1,
        outputs: 0,
      },
    ],
  },
  {
    category: "Machine Learning",
    color: "bg-yellow-500 border-yellow-600",
    headerColor: "bg-yellow-100 text-yellow-800",
    items: [
      {
        type: "linear_regression",
        label: "Regresja liniowa",
        icon: "LineChart",
        inputs: 1,
        outputs: 1,
      },
    ],
  }
];

const NODE_WIDTH = 220;

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [draggingNode, setDraggingNode] = useState(null); // {id, startX, startY, offsetX, offsetY}

  const [connecting, setConnecting] = useState(null); // {nopdeID, portIndex, isInput, x, y}
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
      setConnecting(null); // Przerwij tworzenie połączenia jeśli puszczono myszkę
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNode]);

  const handleDragStartTool = (e, tool, category) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ...tool,
        categoryColor: category.color,
        headerColor: category.header,
      }),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

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
      x: e.clientX - rect.left - NODE_WIDTH / 2,
      y: e.clientY - rect.top - 40,
      config: {},
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    //const rect = canvasRef.current.getBoundingClientRect();
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
    // Używamy prevNodes, aby zawsze nadpisywać najnowszą możliwą wersję planszy
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

  const getPortPosition = (nodeId, isInput, portIndex = 0) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const portOffset = isInput
      ? (node.inputs ?? node.Inputs) === 1
        ? 40
        : 25 + portIndex * 30
      : 40;

    return {
      x: isInput ? node.x : node.x + NODE_WIDTH,
      y: node.y + portOffset,
    };
  };

  const renderLines = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {/* Rysowanie zatwierdzonych krawędzi */}
        {edges.map((edge) => {
          const start = getPortPosition(edge.source, false);
          const end = getPortPosition(edge.target, true);
          // Krzywa Beziera do ładnego wyginania się kabla
          const d = `M ${start.x} ${start.y} C ${start.x + 50} ${start.y}, ${end.x - 50} ${end.y}, ${end.x} ${end.y}`;

          return (
            <path
              key={edge.id}
              d={d}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="3"
              className="hover:stroke-slate-400 transition-colors cursor-pointer pointer-events-auto"
              onClick={() => setEdges(edges.filter((e) => e.id !== edge.id))}
            />
          );
        })}

        {/* Rysowanie linii podczas przeciągania */}
        {connecting && (
          <path
            d={`M ${connecting.x} ${connecting.y} C ${connecting.x + (connecting.isInput ? -50 : 50)} ${connecting.y}, ${mousePos.x + (connecting.isInput ? 50 : -50)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="5,5"
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-800 overflow-hidden select-none">
      {/* PANEL BOCZNY */}
      <div className="w-72 bg-slate-900 text-slate-100 flex flex-col shadow-2xl z-20 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 bg-slate-950">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Database /> DataFlow Builder
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Przeciągnij skrypty na planszę
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {TOOLBOX.map((category) => (
            <div key={category.category} className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {category.category}
              </h2>

              <div className="grid grid-cols-1 gap-2">
                {category.items.map((tool) => {
                  const Icon = Icons[tool.icon];
                  return (
                    <div
                      key={tool.type}
                      draggable
                      onDragStart={(e) =>
                        handleDragStartTool(e, tool, category)
                      }
                      className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg cursor-grab hover:bg-slate-700 active:cursor-grabbing border border-slate-700 hover:border-slate-500 transition-all shadow-sm"
                    >
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${category.color}`}
                      >
                        {Icon && <Icon />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-200">
                          {tool.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PLANSZA (Canvas) */}
      <div
        ref={canvasRef}
        className="flex-1 relative bg-slate-50 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:30px_30px] overflow-hidden"
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        {/* Linie łączące */}
        {renderLines()}

        {/* Instrukcja na starcie */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-white/80 p-6 rounded-2xl shadow-xl backdrop-blur-sm border border-slate-200 text-center max-w-sm">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Database />
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                Zbuduj swój pipeline
              </h3>
              <p className="text-slate-500 text-sm mt-2">
                Przeciągnij bloki z lewego panelu. <br />
                Kliknij dwukrotnie węzeł, by go skonfigurować.
                <br />
                Połącz kropki, by przesłać dane.
              </p>
            </div>
          </div>
        )}

        {/* Renderowanie węzłów */}
        {nodes.map((node) => {
          const Icon = Icons[node.icon];
          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: node.x,
                top: node.y,
                width: NODE_WIDTH,
              }}
              className={`bg-white rounded-xl shadow-md border-2 ${activeModalNode?.id === node.id ? "border-blue-500 shadow-blue-200 shadow-xl" : "border-slate-200"} flex flex-col z-10 transition-shadow`}
              onDoubleClick={(e) => handleDoubleClick(e, node)}
            >
              {/* Nagłówek węzła z mechanizmem przeciągania */}
              <div
                className={`px-4 py-2 rounded-t-lg border-b border-slate-200 flex items-center justify-between cursor-move ${node.headerColor}`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <div className="flex items-center gap-2">
                  {Icon && <Icon />}
                  <span className="font-semibold text-sm">{node.label}</span>
                </div>
                <Icons.Settings />
              </div>

              {/* Ciało węzła z portami */}
              <div className="p-3 relative h-12 bg-white rounded-b-lg">
                <div className="text-xs text-slate-400 text-center mt-1">
                  Dbl-click to config
                </div>

                {/* Porty Wejścia (Lewa strona) */}
                {Array.from({ length: node.inputs }).map((_, idx) => (
                  <div
                    key={`in-${idx}`}
                    onMouseDown={(e) => startConnection(e, node.id, true, idx)}
                    onMouseUp={(e) => finishConnection(e, node.id, true, idx)}
                    className="absolute left-[-6px] w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-crosshair hover:scale-150 hover:border-blue-500 hover:bg-blue-100 transition-all"
                    style={{
                      top: node.inputs === 1 ? "50%" : `${25 + idx * 30}%`,
                      transform: "translateY(-50%)",
                    }}
                    title="Input Port"
                  />
                ))}

                {/* Porty Wyjścia (Prawa strona) */}
                {Array.from({ length: node.outputs }).map((_, idx) => (
                  <div
                    key={`out-${idx}`}
                    onMouseDown={(e) => startConnection(e, node.id, false, idx)}
                    onMouseUp={(e) => finishConnection(e, node.id, false, idx)}
                    className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-crosshair hover:scale-150 hover:border-blue-500 hover:bg-blue-100 transition-all"
                    title="Output Port"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL USTAWIEŃ SKRYPTU */}
      {activeModalNode && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`px-6 py-4 flex items-center justify-between ${activeModalNode.headerColor}`}
            >
              <div className="flex items-center gap-2">
                <Icons.Settings />
                <h3 className="font-bold text-lg">
                  Konfiguracja: {activeModalNode.label}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalNode(null)}
                className="hover:bg-black/10 p-1 rounded-md transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-50">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Nazwa węzła
                </label>
                <input
                  type="text"
                  defaultValue={activeModalNode.label}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {activeModalNode.type === "csv" && (
                <CsvUploadSettings
                  node={activeModalNode}
                  updateNodeData={updateNodeData}
                  onClose={() => setActiveModalNode(null)}
                />
              )}

              {activeModalNode.type === "filter" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Warunek filtru
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option>Wartość {">"} 0</option>
                    <option>Wartość {"<"} 0</option>
                    <option>Usuń puste (Null)</option>
                  </select>
                </div>
              )}

              {activeModalNode.type === "bar_chart" && (
                <BarChartSettings
                  node={activeModalNode}
                  connections={edges}
                  nodes={nodes}
                  onClose={() => setActiveModalNode(null)}
                />
              )}

              {activeModalNode.type === "line_chart" && (
                <LineChartSettings
                  node={activeModalNode}
                  connections={edges}
                  nodes={nodes}
                  updateNodeData={updateNodeData}
                  onClose={() => setActiveModalNode(null)}
                />
              )}

              {activeModalNode.type === "table_view" && (
                <DataViewSettings
                  node={activeModalNode}
                  connections={edges}
                  nodes={nodes}
                  onClose={() => setActiveModalNode(null)}
                />
              )}

              {activeModalNode.type === "linear_regression" && (
                <LinearRegressionSettings
                  node={activeModalNode}
                  connections={edges}
                  nodes={nodes}
                  updateNodeData={updateNodeData}
                  onClose={() => setActiveModalNode(null)}
                />
              )}

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => setActiveModalNode(null)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Zapisz zmiany
                </button>
                <button
                  onClick={() => deleteNode(activeModalNode.id)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-medium rounded-lg transition-colors"
                >
                  Usuń węzeł
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
