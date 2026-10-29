import { Icons } from "./icons";
import { NODE_SETTINGS } from "./nodeRegistry";

export function NodeSettingsModal({ node, nodes, edges, updateNodeData, onClose, onDelete }) {
  const settings = NODE_SETTINGS[node.type];
  const SettingsComponent = settings?.component;

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl ${
          settings?.wide ? "w-[780px] max-w-[95vw] max-h-[92vh]" : "w-[440px] max-w-[95vw]"
        } overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}
      >
        <div
          className={`px-6 py-4 flex items-center justify-between ${node.headerColor} shrink-0`}
        >
          <div className="flex items-center gap-2">
            <Icons.Settings />
            <h3 className="font-bold text-lg">Konfiguracja: {node.label}</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-black/10 p-1 rounded-md transition-colors cursor-pointer"
          >
            <Icons.X />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-slate-50 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Nazwa węzła
            </label>
            <input
              type="text"
              defaultValue={node.label}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {SettingsComponent && (
            <SettingsComponent
              node={node}
              connections={edges}
              nodes={nodes}
              updateNodeData={updateNodeData}
              onClose={onClose}
            />
          )}

          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer"
            >
              Zapisz zmiany
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Usuń węzeł
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
