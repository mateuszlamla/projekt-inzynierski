import { NODE_WIDTH } from "./nodeRegistry";

function getPortPosition(nodes, nodeId, isInput, portIndex = 0) {
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
}

export function ConnectionLines({ nodes, edges, connecting, mousePos, onEdgeClick }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {edges.map((edge) => {
        const start = getPortPosition(nodes, edge.source, false);
        const end = getPortPosition(nodes, edge.target, true);
        const d = `M ${start.x} ${start.y} C ${start.x + 50} ${start.y}, ${end.x - 50} ${end.y}, ${end.x} ${end.y}`;

        return (
          <path
            key={edge.id}
            d={d}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3"
            className="hover:stroke-slate-400 transition-colors cursor-pointer pointer-events-auto"
            onClick={() => onEdgeClick(edge.id)}
          />
        );
      })}

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
}
