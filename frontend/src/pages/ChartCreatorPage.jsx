import { useState } from "react";
import { useDatasetStore } from "../store/useDatasetStore";
import { useChartStore } from "../store/useChartStore";

export default function ChartCreatorPage() {
  const { fileId, fileName, columns, rowsCount, uploadFile } = useDatasetStore();

  const {
    chartType,
    xAxis,
    yAxis,
    color,
    size,
    aggregation,
    chartImage,
    pythonCode,
    summary,
    isLoading,
    error,
    setChartType,
    setAxis,
    updateConfig,
    generateChart,
  } = useChartStore();

  const [activeTab, setActiveTab] = useState("visual"); // visual | code
  const [uploadLoading, setUploadLoading] = useState(false);

  const chartTypes = [
    { id: "bar", name: "Słupkowy (Bar)", icon: "📊", desc: "Porównanie kategorii" },
    { id: "line", name: "Liniowy (Line)", icon: "📈", desc: "Trendy w czasie" },
    { id: "scatter", name: "Punktowy (Scatter)", icon: "⚬", desc: "Zależność dwóch zmiennych" },
    { id: "pie", name: "Kołowy (Pie)", icon: "🥧", desc: "Udziały w całości" },
    { id: "heatmap", name: "Mapa ciepła (Heatmap)", icon: "▦", desc: "Rozkład macierzowy" },
  ];

  // Jeśli brak pliku w store, podpowiedz kolumny przykładowe
  const activeColumns =
    columns && columns.length > 0
      ? columns.map((c) => ({ name: c, type: "data", icon: "•" }))
      : [
          { name: "region", type: "category", icon: "Abc" },
          { name: "sprzedaz_pln", type: "number", icon: "#" },
          { name: "kategoria", type: "category", icon: "Abc" },
          { name: "data_zamowienia", type: "date", icon: "📅" },
          { name: "ilosc_sztuk", type: "number", icon: "#" },
        ];

  const handleQuickUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      await uploadFile(file);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!fileId) {
      alert("Najpierw wgraj plik CSV!");
      return;
    }
    generateChart(fileId);
  };

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans overflow-hidden">
      {/* LEWY PANEL: Źródło danych i dostępne kolumny */}
      <div className="w-80 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kolumny danych</span>
            {fileId ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                Aktywny: {fileName}
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                Brak pliku
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kliknij kolumnę, aby przypisać do osi X lub Y
          </p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {activeColumns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-sm transition-all shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center font-bold shrink-0">
                  {col.icon}
                </span>
                <span className="font-medium text-slate-200 truncate">{col.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setAxis("xAxis", col.name)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                    xAxis === col.name
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                  title="Przypisz do osi X"
                >
                  X
                </button>
                <button
                  onClick={() => setAxis("yAxis", col.name)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                    yAxis === col.name
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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
              {columns.length} kolumn • {rowsCount?.toLocaleString()} wierszy
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] text-center font-semibold text-purple-400 cursor-pointer hover:text-purple-300">
                {uploadLoading ? "Wgrywanie..." : "📁 Wgraj plik CSV tutaj"}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleQuickUpload}
                  disabled={uploadLoading}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ŚRODKOWY OBSZAR: Strefy Upuszczania i Podgląd */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Pasek narzędziowy typu wykresu */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            {chartTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  chartType === t.id
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("visual")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "visual"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              GUI Kreatora
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "code"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Edytor Kodu (Hybrydowy)
            </button>
          </div>
        </div>

        {/* STREFY PRZYPISANIA OSI (DROP ZONES) */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-4 gap-4 shrink-0 shadow-xs">
          <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Oś X (Wymiar)</span>
            <div className="mt-2 flex items-center justify-between bg-white border border-purple-200 px-2.5 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs font-semibold text-slate-800 truncate">{xAxis || "Wybierz z listy"}</span>
              {xAxis && (
                <button
                  onClick={() => setAxis("xAxis", "")}
                  className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Oś Y (Miara)</span>
              <select
                value={aggregation}
                onChange={(e) => updateConfig({ aggregation: e.target.value })}
                className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded cursor-pointer border-0 outline-none"
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
              <span className="text-xs font-semibold text-slate-800 truncate">{yAxis || "Wybierz z listy"}</span>
              {yAxis && (
                <button
                  onClick={() => setAxis("yAxis", "")}
                  className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Kolor / Grupa</span>
            <div className="mt-2 flex items-center justify-between bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs font-semibold text-slate-800 truncate">{color || "Opcjonalne"}</span>
              {color && (
                <button
                  onClick={() => setAxis("color", "")}
                  className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !fileId || !xAxis || !yAxis}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⚡</span> {isLoading ? "Generowanie..." : "Generuj Wykres"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* PODGLĄD WYKRESU LUB KODU */}
        <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
          {activeTab === "visual" ? (
            <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {xAxis && yAxis ? `${aggregation.toUpperCase()} ${yAxis} wg ${xAxis}` : "Podgląd Wykresu"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {fileId ? `Zbiór: ${fileName}` : "Wybierz osie i kliknij Generuj Wykres"}
                  </p>
                </div>
                {chartImage && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">
                      Wygenerowano
                    </span>
                  </div>
                )}
              </div>

              {chartImage ? (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`data:image/png;base64,${chartImage}`}
                    alt="Wygenerowany wykres"
                    className="max-h-[380px] object-contain rounded-xl shadow-sm border border-slate-100"
                  />
                  {summary && (
                    <div className="mt-4 flex gap-4 text-xs text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                      <span>Kategorie: <strong>{summary.categories_count}</strong></span>
                      <span>Suma: <strong>{summary.total_sum?.toLocaleString()}</strong></span>
                      <span>Średnia: <strong>{summary.mean?.toFixed(2)}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center p-6">
                  <span className="text-3xl mb-2">📊</span>
                  <p className="text-sm font-semibold text-slate-700">Brak aktywnego podglądu</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Przypisz kolumny X oraz Y, a następnie kliknij <strong>„Generuj Wykres”</strong> aby pobrać dane.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-slate-400 font-bold uppercase">Specyfikacja Hybrydowa (Python)</span>
                <span className="text-emerald-400">GUI &lt;--&gt; Kod</span>
              </div>
              <pre className="text-slate-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {pythonCode || `# Kod wygeneruje się automatycznie po kliknięciu „Generuj Wykres”\nimport polars as pl\n\n# df = pl.read_csv("${fileId || "dane.csv"}")`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
