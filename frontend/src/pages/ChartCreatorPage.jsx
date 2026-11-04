import { useState, useMemo } from "react";
import { useDatasetStore } from "../store/useDatasetStore";
import { useChartStore } from "../store/useChartStore";
import { PlotlyChart } from "../components/common/PlotlyChart";

// Przykładowy zbiór danych używany, gdy użytkownik nie wgrał jeszcze własnego pliku CSV
const SAMPLE_DATASET = [
  {
    region: "Północ",
    kategoria: "Elektronika",
    sprzedaz_pln: 145000,
    marza_procent: 22,
    ilosc_sztuk: 320,
    data_zamowienia: "2026-01-15",
  },
  {
    region: "Północ",
    kategoria: "Moda",
    sprzedaz_pln: 85000,
    marza_procent: 35,
    ilosc_sztuk: 540,
    data_zamowienia: "2026-02-10",
  },
  {
    region: "Północ",
    kategoria: "Dom",
    sprzedaz_pln: 110000,
    marza_procent: 18,
    ilosc_sztuk: 210,
    data_zamowienia: "2026-03-05",
  },
  {
    region: "Południe",
    kategoria: "Elektronika",
    sprzedaz_pln: 230000,
    marza_procent: 25,
    ilosc_sztuk: 480,
    data_zamowienia: "2026-01-20",
  },
  {
    region: "Południe",
    kategoria: "Moda",
    sprzedaz_pln: 160000,
    marza_procent: 40,
    ilosc_sztuk: 920,
    data_zamowienia: "2026-02-18",
  },
  {
    region: "Południe",
    kategoria: "Dom",
    sprzedaz_pln: 122000,
    marza_procent: 20,
    ilosc_sztuk: 310,
    data_zamowienia: "2026-03-22",
  },
  {
    region: "Wschód",
    kategoria: "Elektronika",
    sprzedaz_pln: 95000,
    marza_procent: 19,
    ilosc_sztuk: 190,
    data_zamowienia: "2026-01-12",
  },
  {
    region: "Wschód",
    kategoria: "Moda",
    sprzedaz_pln: 65000,
    marza_procent: 32,
    ilosc_sztuk: 410,
    data_zamowienia: "2026-02-14",
  },
  {
    region: "Wschód",
    kategoria: "Dom",
    sprzedaz_pln: 60000,
    marza_procent: 15,
    ilosc_sztuk: 150,
    data_zamowienia: "2026-03-10",
  },
  {
    region: "Zachód",
    kategoria: "Elektronika",
    sprzedaz_pln: 185000,
    marza_procent: 24,
    ilosc_sztuk: 390,
    data_zamowienia: "2026-01-28",
  },
  {
    region: "Zachód",
    kategoria: "Moda",
    sprzedaz_pln: 130000,
    marza_procent: 38,
    ilosc_sztuk: 780,
    data_zamowienia: "2026-02-25",
  },
  {
    region: "Zachód",
    kategoria: "Dom",
    sprzedaz_pln: 113000,
    marza_procent: 21,
    ilosc_sztuk: 280,
    data_zamowienia: "2026-03-18",
  },
  {
    region: "Centrum",
    kategoria: "Elektronika",
    sprzedaz_pln: 280000,
    marza_procent: 26,
    ilosc_sztuk: 610,
    data_zamowienia: "2026-01-31",
  },
  {
    region: "Centrum",
    kategoria: "Moda",
    sprzedaz_pln: 195000,
    marza_procent: 42,
    ilosc_sztuk: 1150,
    data_zamowienia: "2026-02-28",
  },
  {
    region: "Centrum",
    kategoria: "Dom",
    sprzedaz_pln: 135000,
    marza_procent: 23,
    ilosc_sztuk: 340,
    data_zamowienia: "2026-03-25",
  },
];

export default function ChartCreatorPage() {
  const { fileId, fileName, columns, rowsCount, previewData, uploadFile } =
    useDatasetStore();

  const {
    chartType,
    xAxis,
    yAxis,
    color,
    aggregation,
    chartImage,
    summary,
    isLoading,
    error,
    recommendations,
    isSuggesting,
    suggestionError,
    fetchSuggestions,
    applyRecommendation,
    setChartType,
    setAxis,
    updateConfig,
    generateChart,
  } = useChartStore();

  const [activeTab, setActiveTab] = useState("visual"); // visual | code
  const [renderEngine, setRenderEngine] = useState("plotly"); // plotly | static
  const [uploadLoading, setUploadLoading] = useState(false);
  const [interactionEvent, setInteractionEvent] = useState(null);
  const [isStylePanelOpen, setOpenStylePanel] = useState(true);
  const [openSections, setOpenSections] = useState({
    titles: true,
    colors: true,
    axes: false,
    layout: false,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const chartTypes = [
    {
      id: "bar",
      name: "Słupkowy (Bar)",
      icon: "📊",
      desc: "Porównanie kategorii",
    },
    { id: "line", name: "Liniowy (Line)", icon: "📈", desc: "Trendy w czasie" },
    {
      id: "scatter",
      name: "Punktowy (Scatter)",
      icon: "⚬",
      desc: "Zależność dwóch zmiennych",
    },
    { id: "pie", name: "Kołowy (Pie)", icon: "🥧", desc: "Udziały w całości" },
    {
      id: "heatmap",
      name: "Mapa ciepła (Heatmap)",
      icon: "▦",
      desc: "Rozkład macierzowy",
    },
  ];

  // Użyj kolumn z wgranego pliku lub domyślnych z szablonu
  const activeColumns = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.map((c) => ({ name: c, type: "data", icon: "•" }));
    }
    return [
      { name: "region", type: "category", icon: "Abc" },
      { name: "sprzedaz_pln", type: "number", icon: "#" },
      { name: "kategoria", type: "category", icon: "Abc" },
      { name: "data_zamowienia", type: "date", icon: "📅" },
      { name: "marza_procent", type: "number", icon: "%" },
      { name: "ilosc_sztuk", type: "number", icon: "#" },
    ];
  }, [columns]);

  // Efektywne kolumny X i Y — jeśli użytkownik jeszcze nie kliknął, przyjmujemy pierwsze 2 kolumny
  const effX = xAxis || activeColumns[0]?.name || "region";
  const effY =
    yAxis ||
    (activeColumns[1]?.name !== effX
      ? activeColumns[1]?.name
      : activeColumns[0]?.name) ||
    "sprzedaz_pln";

  // Aktywne źródło danych: wgrane wiersze lub szablon demo
  const datasetToUse = useMemo(() => {
    if (previewData && previewData.length > 0) {
      return previewData;
    }
    return SAMPLE_DATASET;
  }, [previewData]);

  // Dynamiczne grupowanie i agregacja danych w locie
  const aggregatedData = useMemo(() => {
    if (!datasetToUse || datasetToUse.length === 0) {
      return { labels: [], values: [] };
    }

    const groups = {};

    datasetToUse.forEach((row) => {
      const rawX = row[effX];
      const key =
        rawX !== undefined && rawX !== null && rawX !== ""
          ? String(rawX)
          : "(brak)";
      const rawY = row[effY];
      const numY = Number(rawY);
      const val = isNaN(numY) ? 1 : numY;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(val);
    });

    const labels = Object.keys(groups);
    const values = labels.map((key) => {
      const items = groups[key];
      if (aggregation === "count") return items.length;
      if (aggregation === "mean") {
        const sum = items.reduce((acc, v) => acc + v, 0);
        return Math.round((sum / (items.length || 1)) * 100) / 100;
      }
      if (aggregation === "min") return Math.min(...items);
      if (aggregation === "max") return Math.max(...items);
      if (aggregation === "median") {
        const sorted = [...items].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
          ? sorted[mid]
          : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
      }
      // default: sum
      return items.reduce((acc, v) => acc + v, 0);
    });

    return { labels, values };
  }, [datasetToUse, effX, effY, aggregation]);

  // Obliczenie serii danych Plotly na podstawie zagregowanych wartości
  const plotlyPlotData = useMemo(() => {
    const { labels, values } = aggregatedData;

    if (chartType === "bar") {
      return [
        {
          type: "bar",
          x: labels,
          y: values,
          marker: {
            color: "#a855f7",
            line: { color: "#7e22ce", width: 1.5 },
          },
          hovertemplate: `<b>%{x}</b><br>${aggregation.toUpperCase()} ${effY}: %{y:,.2f}<extra></extra>`,
        },
      ];
    } else if (chartType === "line") {
      return [
        {
          type: "scatter",
          mode: "lines+markers",
          x: labels,
          y: values,
          line: { color: "#3b82f6", width: 3, shape: "spline" },
          marker: { color: "#1d4ed8", size: 8 },
          hovertemplate: `<b>%{x}</b><br>${effY}: %{y:,.2f}<extra></extra>`,
        },
      ];
    } else if (chartType === "scatter") {
      const rawX = datasetToUse.map((r) => Number(r[effX]) || 0);
      const rawY = datasetToUse.map((r) => Number(r[effY]) || 0);
      return [
        {
          type: "scatter",
          mode: "markers",
          x: rawX,
          y: rawY,
          marker: {
            color: "#10b981",
            size: 10,
            opacity: 0.85,
            line: { color: "#047857", width: 1.5 },
          },
          hovertemplate: `${effX}: %{x}<br>${effY}: %{y}<extra></extra>`,
        },
      ];
    } else if (chartType === "pie") {
      return [
        {
          type: "pie",
          labels: labels.slice(0, 10),
          values: values.slice(0, 10),
          marker: {
            colors: [
              "#a855f7",
              "#3b82f6",
              "#10b981",
              "#f59e0b",
              "#ec4899",
              "#06b6d4",
            ],
          },
          textinfo: "label+percent",
          hoverinfo: "label+value+percent",
        },
      ];
    } else if (chartType === "heatmap") {
      const chunks = [];
      for (let i = 0; i < values.length; i += 4) {
        chunks.push(values.slice(i, i + 4));
      }
      return [
        {
          type: "heatmap",
          z:
            chunks.length > 0
              ? chunks
              : [
                  [1, 2, 3],
                  [4, 5, 6],
                ],
          colorscale: "Viridis",
        },
      ];
    }
    return [];
  }, [aggregatedData, chartType, effX, effY, aggregation, datasetToUse]);

  const plotlyLayout = useMemo(() => {
    return {
      title: {
        text: `${aggregation.toUpperCase()} ${effY} wg ${effX}`,
        font: { size: 14, color: "#1e293b", weight: "bold" },
      },
      xaxis: {
        title: effX,
        tickangle: -30,
      },
      yaxis: {
        title: `${aggregation.toUpperCase()} (${effY})`,
      },
      uirevision: "true",
      datarevision: `${effX}_${effY}_${aggregation}_${chartType}`,
    };
  }, [effX, effY, aggregation, chartType]);

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
  const handleGetSuggestions = () => {
    if (!fileId) {
      alert(
        "Najpierw wgrtaj plik CSV, aby silnik mógł przeanalizować typy i unikać danych!",
      );
      return;
    }

    const colsToAnalyze = [effX, effY].filter(Boolean);
    fetchSuggestions(fileId, colsToAnalyze);
  };

  const handlePlotlyClick = (eData) => {
    const pt = eData.points?.[0];
    if (pt) {
      setInteractionEvent(
        `Kliknięto element: ${pt.x || pt.label || "Punkt"} = ${pt.y ?? pt.value} (index: ${pt.pointIndex})`,
      );
    }
  };

  const handlePlotlySelected = (eData) => {
    const pts = eData?.points || [];
    if (pts.length > 0) {
      setInteractionEvent(
        `Zaznaczono lasso/boxem: ${pts.length} punktów (Cross-filtering aktywny)`,
      );
    } else {
      setInteractionEvent(null);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans overflow-hidden">
      {/* LEWY PANEL: Źródło danych i dostępne kolumny */}
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
              {columns.length} kolumn • {rowsCount?.toLocaleString()} wierszy
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] text-center font-semibold text-purple-400 cursor-pointer hover:text-purple-300">
                {uploadLoading ? "Wgrywanie..." : "📁 Wgraj własny plik CSV"}
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

          <div className="flex items-center gap-3">
            {/* Przełącznik silnika renderowania (Plotly vs Statyczny) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setRenderEngine("plotly")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  renderEngine === "plotly"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Dynamiczny wykres renderowany w przeglądarce"
              >
                Plotly.js (WebGL/SVG)
              </button>
              <button
                onClick={() => setRenderEngine("static")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  renderEngine === "static"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Statyczny render PNG z backendu"
              >
                Matplotlib (PNG)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("visual")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === "visual"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                GUI
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === "code"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Kod
              </button>
            </div>
            {/* Przełącznik widoczności panelu stylu (Task 2.1) */}
            <button
              onClick={() => setIsStylePanelOpen((prev) => !prev)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border ${
                isStylePanelOpen
                  ? "bg-purple-100 text-purple-700 border-purple-300 shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200"
              }`}
              title={
                isStylePanelOpen ? "Ukryj panel stylu" : "Pokaż panel stylu"
              }
            >
              <span>🎨</span>
              <span>Styl i format</span>
            </button>
          </div>
        </div>

        {/* STREFY PRZYPISANIA OSI (DROP ZONES) */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-4 gap-4 shrink-0 shadow-xs">
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

          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={handleGetSuggestions}
              disabled={isSuggesting || !fileId}
              className="w-full h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Inteligentna analiza typów kolumn i dobór optymalnego wykresu"
            >
              <span>🪄</span>{" "}
              {isSuggesting ? "Analizowanie..." : "Sugeruj wykres"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !fileId}
              className="w-full h-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>{" "}
              {isLoading ? "Generowanie..." : "Generuj z Backend"}
            </button>
          </div>
        </div>

        {/* PANEL INTELIGENTNYCH REKOMENDACJI WYKRESÓW */}
        {recommendations && recommendations.length > 0 && (
          <div className="mx-6 mt-3 p-3.5 bg-gradient-to-r from-amber-50/80 to-purple-50/80 border border-amber-200/80 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">🪄</span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Rekomendowane wizualizacje ({recommendations.length})
                </span>
                <span className="text-[10px] text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200">
                  Dla kolumn: {effX} + {effY}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {recommendations.slice(0, 3).map((rec, idx) => {
                const confidenceColors = {
                  high: "bg-emerald-100 text-emerald-800 border-emerald-300",
                  medium: "bg-blue-100 text-blue-800 border-blue-300",
                  low: "bg-slate-100 text-slate-700 border-slate-300",
                };

                return (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-purple-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900 capitalize flex items-center gap-1">
                          {rec.chart_type === "bar" && "📊 Słupkowy"}
                          {rec.chart_type === "line" && "📈 Liniowy"}
                          {rec.chart_type === "scatter" && "⚬ Punktowy"}
                          {rec.chart_type === "pie" && "🥧 Kołowy"}
                          {rec.chart_type === "heatmap" && "▦ Mapa ciepła"}
                          {rec.chart_type === "histogram" && "📊 Histogram"}
                          {rec.chart_type === "area" && "📈 Warstwowy"}
                          {![
                            "bar",
                            "line",
                            "scatter",
                            "pie",
                            "heatmap",
                            "histogram",
                            "area",
                          ].includes(rec.chart_type) && rec.chart_type}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            confidenceColors[rec.confidence] ||
                            confidenceColors.medium
                          }`}
                        >
                          {Math.round(rec.score * 100)}% trafności
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        X: {rec.suggested_x}{" "}
                        {rec.suggested_y ? `| Y: ${rec.suggested_y}` : ""}
                      </span>
                      <button
                        onClick={() => applyRecommendation(rec)}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Zastosuj
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {suggestionError && (
          <div className="mx-6 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {suggestionError}
          </div>
        )}

        {/* Informacja o interakcji użytkownika z wykresem (Task 0.4 / Cross-filtering) */}
        {interactionEvent && (
          <div className="mx-6 mt-3 px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-purple-600 font-bold">
                🎯 Zdarzenie wykresu:
              </span>
              <span>{interactionEvent}</span>
            </div>
            <button
              onClick={() => setInteractionEvent(null)}
              className="text-purple-400 hover:text-purple-700 font-bold text-xs cursor-pointer"
            >
              Wyczyść
            </button>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* PODGLĄD WYKRESU LUB KODU */}
        <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
          {activeTab === "visual" ? (
            <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center min-h-[460px]">
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {aggregation.toUpperCase()} {effY} wg {effX}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {renderEngine === "plotly"
                      ? "Silnik Plotly.js — pełna interaktywność (zoom, pan, hover, box select)"
                      : "Silnik Matplotlib — statyczny zrzut obrazu Base64 z serwera"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">
                    {renderEngine === "plotly" ? "WebGL / SVG" : "PNG"}
                  </span>
                </div>
              </div>

              {renderEngine === "plotly" ? (
                /* INTERAKTYWNY WYKRES PLOTLY */
                <div className="w-full h-[400px]">
                  <PlotlyChart
                    data={plotlyPlotData}
                    layout={plotlyLayout}
                    onClick={handlePlotlyClick}
                    onSelected={handlePlotlySelected}
                    isLoading={isLoading}
                  />
                </div>
              ) : chartImage ? (
                /* STATYCZNY WYKRES MATPLOTLIB */
                <div className="w-full flex flex-col items-center">
                  <img
                    src={`data:image/png;base64,${chartImage}`}
                    alt="Wygenerowany wykres"
                    className="max-h-[380px] object-contain rounded-xl shadow-sm border border-slate-100"
                  />
                  {summary && (
                    <div className="mt-4 flex gap-4 text-xs text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                      <span>
                        Kategorie: <strong>{summary.categories_count}</strong>
                      </span>
                      <span>
                        Suma:{" "}
                        <strong>{summary.total_sum?.toLocaleString()}</strong>
                      </span>
                      <span>
                        Średnia: <strong>{summary.mean?.toFixed(2)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center p-6">
                  <span className="text-3xl mb-2">📊</span>
                  <p className="text-sm font-semibold text-slate-700">
                    Brak wygenerowanego obrazu Matplotlib
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Przełącz na silnik <strong>Plotly.js</strong> lub kliknij{" "}
                    <strong>„Generuj z Backend”</strong>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-slate-400 font-bold uppercase">
                  Specyfikacja Hybrydowa (Python / Plotly)
                </span>
                <span className="text-emerald-400">
                  GUI &lt;--&gt; Kod (Plotly Express)
                </span>
              </div>
              <pre className="text-slate-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {`# Wykres wygenerowany w konwencji Plotly Express (zgodny z React oraz raportem PDF)
import polars as pl
import plotly.express as px

# 1. Wczytanie i agregacja danych
df = pl.read_csv("${fileId || "dane.csv"}")
agg = df.group_by("${effX}").agg(
    pl.col("${effY}").${aggregation}().alias("${effY}")
)

# 2. Tworzenie figury Plotly
fig = px.${chartType === "pie" ? "pie" : chartType === "line" ? "line" : chartType === "scatter" ? "scatter" : "bar"}(
    agg.to_pandas(),
    x="${effX}",
    y="${effY}",
    title="${aggregation.toUpperCase()} ${effY} wg ${effX}",
    template="plotly_white"
)

# Wyświetlenie interaktywne lub zapis statyczny do raportu PDF (Sekcja 3):
# fig.write_image("raport_wykres.png", scale=2)
fig.show()`}
              </pre>
            </div>
          )}
        </div>
      </div>
      {/* PRAWY PANEL: Formatowanie i Styl Wykresu (Task 2.1) */}
      {isStylePanelOpen && (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-xs z-10 animate-in slide-in-from-right duration-200">
          {/* Nagłówek prawego panelu */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">🎨</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Formatowanie
                </h4>
                <p className="text-[10px] text-slate-500">
                  Wygląd, etykiety i układ
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsStylePanelOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md text-xs cursor-pointer"
              title="Zwiń panel"
            >
              ✕
            </button>
          </div>

          {/* Zawartość sekcji formatowania (przewijana) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {/* SEKCJA 1: Tytuł i Etykiety */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => toggleSection("titles")}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>📝</span> Tytuł i Etykiety
                </span>
                <span className="text-slate-400 text-[10px]">
                  {openSections.titles ? "▲" : "▼"}
                </span>
              </button>
              {openSections.titles && (
                <div className="p-3.5 space-y-3 bg-white border-t border-slate-100 text-slate-500 text-[11px]">
                  <p>Tytuł wykresu, opisy osi X i Y (Task 2.3).</p>
                </div>
              )}
            </div>

            {/* SEKCJA 2: Kolorystyka i Motyw */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => toggleSection("colors")}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>🎨</span> Kolorystyka i Motyw
                </span>
                <span className="text-slate-400 text-[10px]">
                  {openSections.colors ? "▲" : "▼"}
                </span>
              </button>
              {openSections.colors && (
                <div className="p-3.5 space-y-3 bg-white border-t border-slate-100 text-slate-500 text-[11px]">
                  <p>
                    Palety kolorystyczne, kolor serii i motyw tła (Task 2.2).
                  </p>
                </div>
              )}
            </div>

            {/* SEKCJA 3: Osie i Siatka */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => toggleSection("axes")}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>📐</span> Osie i Siatka
                </span>
                <span className="text-slate-400 text-[10px]">
                  {openSections.axes ? "▲" : "▼"}
                </span>
              </button>
              {openSections.axes && (
                <div className="p-3.5 space-y-3 bg-white border-t border-slate-100 text-slate-500 text-[11px]">
                  <p>Siatka, obrót etykiet i etykiety wartości (Task 2.3).</p>
                </div>
              )}
            </div>

            {/* SEKCJA 4: Układ i Sortowanie */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => toggleSection("layout")}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>📊</span> Układ i Sortowanie
                </span>
                <span className="text-slate-400 text-[10px]">
                  {openSections.layout ? "▲" : "▼"}
                </span>
              </button>
              {openSections.layout && (
                <div className="p-3.5 space-y-3 bg-white border-t border-slate-100 text-slate-500 text-[11px]">
                  <p>
                    Orientacja pionowa/pozioma, sortowanie i Top N (Task 2.4).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
