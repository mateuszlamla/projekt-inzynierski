import { useChartStore } from "../../store/useChartStore";

export function ChartDropZones({
  effX,
  effY,
  fileId,
  isLoading,
  isSuggesting,
  onGenerate,
  onGetSuggestions,
}) {
  const { xAxis, yAxis, color, aggregation, setAxis, updateConfig } =
    useChartStore();

  return (
    <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-4 gap-4 shrink-0 shadow-xs">
      {/* OŚ X */}
      <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
          Oś X (Wymiar / Grupowanie)
        </span>
        <div className="mt-2 flex items-center justify-between bg-white border border-purple-200 px-2.5 py-1.5 rounded-lg shadow-xs">
          <span className="text-xs font-semibold text-purple-900 truncate">
            {effX}
          </span>
          {xAxis && (
            <button
              onClick={() => setAxis("xAxis", "")}
              className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer font-bold"
              title="Wyczyść ręczny wybór"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* OŚ Y */}
      <div className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            Oś Y (Miara)
          </span>
          <select
            value={aggregation}
            onChange={(e) => updateConfig({ aggregation: e.target.value })}
            className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded cursor-pointer border border-blue-200 outline-none"
          >
            <option value="sum">SUMA</option>
            <option value="mean">ŚREDNIA</option>
            <option value="count">LICZNOŚĆ</option>
            <option value="min">MIN</option>
            <option value="max">MAX</option>
            <option value="median">MEDIANA</option>
          </select>
        </div>
        <div className="mt-2 flex items-center justify-between bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg shadow-xs">
          <span className="text-xs font-semibold text-blue-900 truncate">
            {effY}
          </span>
          {yAxis && (
            <button
              onClick={() => setAxis("yAxis", "")}
              className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer font-bold"
              title="Wyczyść ręczny wybór"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* KOLOR / GRUPA */}
      <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          Kolor / Grupa
        </span>
        <div className="mt-2 flex items-center justify-between bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-xs">
          <span className="text-xs font-semibold text-slate-800 truncate">
            {color || "Domyślny fiolet"}
          </span>
          {color && (
            <button
              onClick={() => setAxis("color", "")}
              className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* PRZYCISKI AKCJI */}
      <div className="flex flex-col justify-end gap-2">
        <button
          onClick={onGetSuggestions}
          disabled={isSuggesting || !fileId}
          className="w-full h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="Inteligentna analiza typów kolumn i dobór optymalnego wykresu"
        >
          <span>🪄</span>{" "}
          {isSuggesting ? "Analizowanie..." : "Sugeruj wykres"}
        </button>
        <button
          onClick={onGenerate}
          disabled={isLoading || !fileId}
          className="w-full h-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>⚡</span>{" "}
          {isLoading ? "Generowanie..." : "Generuj z Backend"}
        </button>
      </div>
    </div>
  );
}

