import { useState } from "react";
import { chartApi } from "../services/api";

export function BarChartSettings({ node, connections, nodes, updateNodeData }) {
  // Znajdź połączenie wchodzące do tego węzła (również po łańcuchu upstream)
  const inputConnection = connections.find((c) => c.target === node.id);
  let inputNode = inputConnection
    ? nodes.find((n) => n.id === inputConnection.source)
    : null;

  if (inputNode && !inputNode.data?.fileId) {
    let curr = inputNode;
    while (curr) {
      const upstreamConn = connections.find((c) => c.target === curr.id);
      if (!upstreamConn) break;
      const upstreamNode = nodes.find((n) => n.id === upstreamConn.source);
      if (upstreamNode?.data?.fileId) {
        inputNode = upstreamNode;
        break;
      }
      curr = upstreamNode;
    }
  }

  const columns = inputNode?.data?.columns || [];
  const fileId = inputNode?.data?.fileId;

  // Stany konfiguracji (zapisane w węźle lub domyślne)
  const [activeTab, setActiveTab] = useState("data"); // 'data' | 'style' | 'preview' | 'code'
  const [xCol, setXCol] = useState(node.data?.xCol || "");
  const [yCol, setYCol] = useState(node.data?.yCol || "");
  const [aggregation, setAggregation] = useState(node.data?.aggregation || "sum");
  const [sortOrder, setSortOrder] = useState(node.data?.sortOrder || "none");
  const [limit, setLimit] = useState(node.data?.limit || "all");

  // Wygląd i styl
  const [orientation, setOrientation] = useState(node.data?.orientation || "vertical");
  const [color, setColor] = useState(node.data?.color || "#a855f7");
  const [palette, setPalette] = useState(node.data?.palette || "custom");
  const [theme, setTheme] = useState(node.data?.theme || "white");
  const [customTitle, setCustomTitle] = useState(node.data?.customTitle || "");
  const [xLabel, setXLabel] = useState(node.data?.xLabel || "");
  const [yLabel, setYLabel] = useState(node.data?.yLabel || "");
  const [rotation, setRotation] = useState(node.data?.rotation ?? 45);
  const [showGrid, setShowGrid] = useState(node.data?.showGrid ?? true);
  const [showValues, setShowValues] = useState(node.data?.showValues ?? false);

  // Wyniki z serwera
  const [chartImage, setChartImage] = useState(node.data?.chartImage || null);
  const [pythonCode, setPythonCode] = useState(node.data?.pythonCode || null);
  const [summary, setSummary] = useState(node.data?.summary || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const colorPresets = [
    { label: "Fiolet", value: "#a855f7" },
    { label: "Błękit", value: "#3b82f6" },
    { label: "Szmaragd", value: "#10b981" },
    { label: "Bursztyn", value: "#f59e0b" },
    { label: "Czerwień", value: "#ef4444" },
    { label: "Grafit", value: "#334155" },
  ];

  const generateChart = async () => {
    if (!fileId || !xCol || !yCol) {
      alert("Najpierw połącz węzły i wybierz kolumny X oraz Y!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      file_id: fileId,
      x_col: xCol,
      y_col: yCol,
      aggregation,
      sort_order: sortOrder,
      limit: limit === "all" ? null : parseInt(limit, 10),
      orientation,
      color,
      palette,
      theme,
      title: customTitle || null,
      x_label: xLabel || null,
      y_label: yLabel || null,
      rotation: parseInt(rotation, 10),
      show_grid: showGrid,
      show_values: showValues,
    };

    try {
      const data = await chartApi.getBarChart(payload);

      if (data.error) {
        setErrorMsg(data.error);
        return;
      }

      setChartImage(data.image);
      setPythonCode(data.code);
      setSummary(data.summary);
      setActiveTab("preview");

      // Persystencja stanu w nadrzędnym stanie aplikacji
      if (updateNodeData) {
        updateNodeData(node.id, {
          xCol,
          yCol,
          aggregation,
          sortOrder,
          limit,
          orientation,
          color,
          palette,
          theme,
          customTitle,
          xLabel,
          yLabel,
          rotation,
          showGrid,
          showValues,
          chartImage: data.image,
          pythonCode: data.code,
          summary: data.summary,
        });
      }
    } catch (error) {
      console.error("Błąd generowania wykresu", error);
      setErrorMsg("Wystąpił błąd podczas generowania wykresu na serwerze.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!pythonCode) return;
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = () => {
    if (!chartImage) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${chartImage}`;
    link.download = `wykres-slupkowy-${xCol}-${yCol}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Pasek statusu połączenia */}
      <div className="text-xs px-3 py-2 bg-slate-100 rounded-lg text-slate-600 font-mono flex items-center justify-between border border-slate-200">
        <div className="flex items-center gap-3">
          <span>Dane źródłowe: {fileId ? "✅ Połączono" : "❌ Brak"}</span>
          {fileId && <span className="text-slate-400">|</span>}
          {fileId && <span>Plik: <strong className="text-slate-700">{fileId}</strong></span>}
        </div>
        <span className="text-slate-500 font-sans">Kolumn: {columns.length}</span>
      </div>

      {!fileId ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex flex-col gap-1">
          <strong className="font-semibold">Brak połączenia ze źródłem danych!</strong>
          <span className="text-slate-600">
            Przeciągnij przewód z portu wyjściowego węzła <strong>Import CSV</strong> do portu wejściowego tego wykresu.
          </span>
        </div>
      ) : (
        <>
          {/* Zakładki */}
          <div className="flex border-b border-slate-200 gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("data")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "data"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📊 1. Dane i Agregacja
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "style"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🎨 2. Styl i Wygląd
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "preview"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🖼️ 3. Podgląd wykresu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "code"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💻 4. Kod Python
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* ZAKŁADKA 1: DANE */}
          {activeTab === "data" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Oś X (Kategorie / Grupy):
                  </label>
                  <select
                    value={xCol}
                    onChange={(e) => setXCol(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">Wybierz kolumnę kategorii...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Oś Y (Wartości liczbowe):
                  </label>
                  <select
                    value={yCol}
                    onChange={(e) => setYCol(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">Wybierz kolumnę wartości...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Funkcja agregacji:
                  </label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="sum">Suma (Sum)</option>
                    <option value="mean">Średnia (Mean)</option>
                    <option value="count">Liczność (Count)</option>
                    <option value="median">Mediana (Median)</option>
                    <option value="min">Minimum (Min)</option>
                    <option value="max">Maksimum (Max)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Sortowanie słupków:
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="none">Brak (Kolejność w pliku)</option>
                    <option value="desc">Od największych (Malejąco)</option>
                    <option value="asc">Od najmniejszych (Rosnąco)</option>
                    <option value="alpha">Alfabetycznie (Kategoria A-Z)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Limit słupków:
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="all">Wszystkie kategorie</option>
                    <option value="5">Top 5</option>
                    <option value="10">Top 10</option>
                    <option value="15">Top 15</option>
                    <option value="20">Top 20</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ZAKŁADKA 2: STYL I WYGLĄD */}
          {activeTab === "style" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Orientacja wykresu:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation("vertical")}
                      className={`py-2 px-3 text-xs rounded-lg border font-medium transition-all ${
                        orientation === "vertical"
                          ? "border-purple-600 bg-purple-50 text-purple-700 font-semibold"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      ↕️ Pionowa
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation("horizontal")}
                      className={`py-2 px-3 text-xs rounded-lg border font-medium transition-all ${
                        orientation === "horizontal"
                          ? "border-purple-600 bg-purple-50 text-purple-700 font-semibold"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      ↔️ Pozioma (Top)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Motyw tła:
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="white">Jasny (Czysty biały)</option>
                    <option value="dark">Ciemny (Dark Slate)</option>
                    <option value="minimal">Minimalistyczny (Bez ramki)</option>
                  </select>
                </div>
              </div>

              {/* Kolorystyka i Palety */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Kolorystyka słupków:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={palette}
                      onChange={(e) => setPalette(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="custom">Jednolity kolor (wybrany obok)</option>
                      <option value="viridis">Viridis (Zielony-Niebieski)</option>
                      <option value="plasma">Plasma (Fiolet-Żółty)</option>
                      <option value="coolwarm">Coolwarm (Gradient zimno-ciepło)</option>
                      <option value="tab10">Tab10 (Różne kolory słupków)</option>
                      <option value="Pastel1">Pastel1 (Subtelne pastele)</option>
                    </select>
                  </div>

                  {palette === "custom" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-9 h-9 p-0.5 rounded cursor-pointer border border-slate-300 bg-white"
                        title="Wybierz dokładny kolor"
                      />
                      <div className="flex gap-1">
                        {colorPresets.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setColor(p.value)}
                            style={{ backgroundColor: p.value }}
                            className={`w-6 h-6 rounded-full border border-white shadow-sm transition-transform hover:scale-110 ${
                              color === p.value ? "ring-2 ring-purple-600 ring-offset-1" : ""
                            }`}
                            title={p.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tytuły i Etykiety */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Własny tytuł:
                  </label>
                  <input
                    type="text"
                    placeholder="Domyślny tytuł..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Podpis osi X:
                  </label>
                  <input
                    type="text"
                    placeholder="Domyślny X..."
                    value={xLabel}
                    onChange={(e) => setXLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Podpis osi Y:
                  </label>
                  <input
                    type="text"
                    placeholder="Domyślny Y..."
                    value={yLabel}
                    onChange={(e) => setYLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>

              {/* Przełączniki */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Obrót etykiet osi:
                  </label>
                  <select
                    value={rotation}
                    onChange={(e) => setRotation(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="0">0° (Poziomo)</option>
                    <option value="45">45° (Ukośnie)</option>
                    <option value="90">90° (Pionowo)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="showGrid"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="showGrid" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Siatka w tle
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="showValues"
                    checked={showValues}
                    onChange={(e) => setShowValues(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="showValues" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Wartości na słupkach
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* PRZYCISK RENDEROWANIA */}
          <button
            type="button"
            onClick={generateChart}
            disabled={loading || !xCol || !yCol}
            className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold transition-all shadow-md flex items-center justify-center gap-2 ${
              loading || !xCol || !yCol
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 hover:shadow-purple-200"
            }`}
          >
            {loading ? (
              <span>Generowanie wykresu w Pythonie...</span>
            ) : (
              <span>🚀 Renderuj wykres z aktualnymi ustawieniami</span>
            )}
          </button>

          {/* ZAKŁADKA 3: PODGLĄD WYKRESU */}
          {activeTab === "preview" && (
            <div className="space-y-3">
              {chartImage ? (
                <>
                  <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-inner flex flex-col items-center justify-center relative group">
                    <img
                      src={`data:image/png;base64,${chartImage}`}
                      alt="Wygenerowany wykres słupkowy"
                      className="max-h-[380px] w-auto object-contain rounded-lg shadow-sm"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        type="button"
                        onClick={downloadImage}
                        className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-medium rounded-lg backdrop-blur shadow transition-all flex items-center gap-1.5"
                      >
                        💾 Pobierz PNG
                      </button>
                    </div>
                  </div>

                  {summary && (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-purple-50 border border-purple-100 p-2 rounded-lg">
                        <div className="text-[10px] text-purple-600 font-semibold uppercase">Kategorie</div>
                        <div className="text-sm font-bold text-purple-900">{summary.categories_count}</div>
                      </div>
                      <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Suma</div>
                        <div className="text-sm font-bold text-slate-800">{summary.total_sum.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Średnia</div>
                        <div className="text-sm font-bold text-slate-800">{summary.mean.toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Zakres [Min - Max]</div>
                        <div className="text-sm font-bold text-slate-800">{summary.min} - {summary.max}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                  <p className="text-sm font-medium">Brak wyrenderowanego wykresu.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Wybierz kolumny w zakładce <strong>Dane</strong> i kliknij przycisk renderowania.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 4: KOD PYTHON */}
          {activeTab === "code" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Kod Pythona odzwierciedlający bieżącą konfigurację:</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-medium transition-colors"
                >
                  {copied ? "✅ Skopiowano!" : "📋 Kopiuj kod"}
                </button>
              </div>

              {pythonCode ? (
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-[350px] leading-relaxed border border-slate-800 select-text">
                  {pythonCode}
                </pre>
              ) : (
                <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                  Wyrenderuj wykres, aby zobaczyć wygenerowany skrypt w Pythonie.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
