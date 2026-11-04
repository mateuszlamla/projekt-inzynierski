import { useDatasetStore } from "../../store/useDatasetStore";
import { useChartStore } from "../../store/useChartStore";

export function ChartSidebar({
  activeColumns,
  effX,
  effY,
  uploadLoading,
  onQuickUpload,
}) {
  const { fileId, fileName, columns, rowsCount } = useDatasetStore();
  const setAxis = useChartStore((s) => s.setAxis);

  return (
    <div className="w-80 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Kolumny danych
          </span>
          {fileId ? (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              Aktywny: {fileName}
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
              Dane demo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Kliknij przycisk X lub Y przy kolumnie, aby zmienić osie
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-2">
        {activeColumns.map((col) => (
          <div
            key={col.name}
            className={`flex items-center justify-between p-2.5 rounded-lg text-sm transition-all shadow-xs border ${
              effX === col.name
                ? "bg-purple-950/60 border-purple-500"
                : effY === col.name
                  ? "bg-blue-950/60 border-blue-500"
                  : "bg-slate-800 hover:bg-slate-700/80 border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center font-bold shrink-0">
                {col.icon}
              </span>
              <span className="font-medium text-slate-200 truncate">
                {col.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setAxis("xAxis", col.name)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                  effX === col.name
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-700 text-slate-300 hover:bg-purple-900/60 hover:text-purple-200"
                }`}
                title="Przypisz do osi X"
              >
                X
              </button>
              <button
                onClick={() => setAxis("yAxis", col.name)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                  effY === col.name
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-700 text-slate-300 hover:bg-blue-900/60 hover:text-blue-200"
                }`}
                title="Przypisz do osi Y"
              >
                Y
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stopka lewego panelu z szybkim wgraniem */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
        {fileId ? (
          <div className="text-center text-[11px] text-slate-400">
            {columns?.length || 0} kolumn • {rowsCount?.toLocaleString()}{" "}
            wierszy
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-[11px] text-center font-semibold text-purple-400 cursor-pointer hover:text-purple-300">
              {uploadLoading ? "Wgrywanie..." : "📁 Wgraj własny plik CSV"}
              <input
                type="file"
                accept=".csv"
                onChange={onQuickUpload}
                disabled={uploadLoading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

