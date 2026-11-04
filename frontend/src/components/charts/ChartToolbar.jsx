import { CHART_TYPES } from "./chartConstants";
import { useChartStore } from "../../store/useChartStore";

export function ChartToolbar({
  renderEngine,
  setRenderEngine,
  activeTab,
  setActiveTab,
  isStylePanelOpen,
  setIsStylePanelOpen,
}) {
  const chartType = useChartStore((s) => s.chartType);
  const setChartType = useChartStore((s) => s.setChartType);

  return (
    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex items-center gap-2">
        {CHART_TYPES.map((t) => (
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

        {/* Przełącznik widoczności panelu stylu */}
        <button
          onClick={() => setIsStylePanelOpen((prev) => !prev)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border ${
            isStylePanelOpen
              ? "bg-purple-100 text-purple-700 border-purple-300 shadow-xs"
              : "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200"
          }`}
          title={isStylePanelOpen ? "Ukryj panel stylu" : "Pokaż panel stylu"}
        >
          <span>🎨</span>
          <span>Styl i format</span>
        </button>
      </div>
    </div>
  );
}

