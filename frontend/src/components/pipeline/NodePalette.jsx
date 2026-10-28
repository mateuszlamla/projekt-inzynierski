import { Icons } from "./icons";
import { NODE_CATEGORIES } from "./nodeRegistry";

const handleDragStartTool = (e, tool, category) => {
  e.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      ...tool,
      categoryColor: category.color,
      headerColor: category.headerColor,
    }),
  );
  e.dataTransfer.effectAllowed = "copy";
};

export function NodePalette({ nodesCount, edgesCount }) {
  return (
    <div className="w-72 bg-slate-900 text-slate-100 flex flex-col shadow-2xl z-20 border-r border-slate-800 shrink-0">
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Paleta Węzłów</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Przeciągnij blok na siatkę przepływu
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {NODE_CATEGORIES.map((category) => (
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
                    onDragStart={(e) => handleDragStartTool(e, tool, category)}
                    className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg cursor-grab hover:bg-slate-700 active:cursor-grabbing border border-slate-700 hover:border-slate-500 transition-all shadow-sm"
                  >
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${category.color}`}
                    >
                      {Icon && <Icon />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {tool.label}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Wejść: {tool.inputs} • Wyjść: {tool.outputs}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Węzły: {nodesCount}</span>
        <span>Połączenia: {edgesCount}</span>
      </div>
    </div>
  );
}
