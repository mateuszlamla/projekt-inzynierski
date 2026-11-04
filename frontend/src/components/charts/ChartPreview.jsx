import { PlotlyChart } from "../common/PlotlyChart";
import { useChartStore } from "../../store/useChartStore";

export function ChartPreview({
  activeTab,
  renderEngine,
  effX,
  effY,
  fileId,
  plotlyPlotData,
  plotlyLayout,
  interactionEvent,
  onClearInteraction,
  onPlotlyClick,
  onPlotlySelected,
}) {
  const {
    chartType,
    aggregation,
    title,
    theme,
    chartImage,
    summary,
    isLoading,
    error,
  } = useChartStore();

  const isDark = theme === "dark";

  return (
    <>
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
            onClick={onClearInteraction}
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
          <div
            className={`w-full max-w-5xl rounded-2xl p-6 shadow-sm flex flex-col items-center min-h-[460px] transition-all duration-200 ${
              isDark
                ? "bg-slate-900 border border-slate-800 text-white"
                : "bg-white border border-slate-200 text-slate-800"
            }`}
          >
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3
                  className={`font-bold text-base ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  {title || `${aggregation.toUpperCase()} ${effY} wg ${effX}`}
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
                  onClick={onPlotlyClick}
                  onSelected={onPlotlySelected}
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
          /* ZAKŁADKA KOD */
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
    title="${title || `${aggregation.toUpperCase()} ${effY} wg ${effX}`}",
    template="${isDark ? "plotly_dark" : "plotly_white"}"
)

# Wyświetlenie interaktywne lub zapis statyczny do raportu PDF (Sekcja 3):
# fig.write_image("raport_wykres.png", scale=2)
fig.show()`}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

