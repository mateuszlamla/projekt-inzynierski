import { Icons } from "./icons";
import { NODE_WIDTH } from "./nodeRegistry";

export function PipelineNode({
  node,
  isActive,
  onHeaderMouseDown,
  onDoubleClick,
  onPortMouseDown,
  onPortMouseUp,
}) {
  const Icon = Icons[node.icon];
  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
      }}
      className={`bg-white rounded-xl shadow-md border-2 ${
        isActive ? "border-blue-500 shadow-blue-200 shadow-xl" : "border-slate-200"
      } flex flex-col z-10 transition-shadow`}
      onDoubleClick={(e) => onDoubleClick(e, node)}
    >
      <div
        className={`px-4 py-2 rounded-t-lg border-b border-slate-200 flex items-center justify-between cursor-move ${node.headerColor}`}
        onMouseDown={(e) => onHeaderMouseDown(e, node.id)}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon />}
          <span className="font-semibold text-sm">{node.label}</span>
        </div>
        <Icons.Settings />
      </div>

      <div className="p-3 relative h-12 bg-white rounded-b-lg">
        <div className="text-xs text-slate-400 text-center mt-1">
          2x klik by skonfigurować
        </div>

        {Array.from({ length: node.inputs }).map((_, idx) => (
          <div
            key={`in-${idx}`}
            onMouseDown={(e) => onPortMouseDown(e, node.id, true, idx)}
            onMouseUp={(e) => onPortMouseUp(e, node.id, true, idx)}
            className="absolute left-[-6px] w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-crosshair hover:scale-150 hover:border-blue-500 hover:bg-blue-100 transition-all"
            style={{
              top: node.inputs === 1 ? "50%" : `${25 + idx * 30}%`,
              transform: "translateY(-50%)",
            }}
            title="Input Port"
          />
        ))}

        {Array.from({ length: node.outputs }).map((_, idx) => (
          <div
            key={`out-${idx}`}
            onMouseDown={(e) => onPortMouseDown(e, node.id, false, idx)}
            onMouseUp={(e) => onPortMouseUp(e, node.id, false, idx)}
            className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-crosshair hover:scale-150 hover:border-blue-500 hover:bg-blue-100 transition-all"
            title="Output Port"
          />
        ))}
      </div>
    </div>
  );
}
