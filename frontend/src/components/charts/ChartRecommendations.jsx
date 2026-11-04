import { useChartStore } from "../../store/useChartStore";

export function ChartRecommendations({ effX, effY }) {
  const recommendations = useChartStore((s) => s.recommendations);
  const suggestionError = useChartStore((s) => s.suggestionError);
  const applyRecommendation = useChartStore((s) => s.applyRecommendation);

  const confidenceColors = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-300",
    medium: "bg-blue-100 text-blue-800 border-blue-300",
    low: "bg-slate-100 text-slate-700 border-slate-300",
  };

  const getChartLabel = (type) => {
    switch (type) {
      case "bar":
        return "📊 Słupkowy";
      case "line":
        return "📈 Liniowy";
      case "scatter":
        return "⚬ Punktowy";
      case "pie":
        return "🥧 Kołowy";
      case "heatmap":
        return "▦ Mapa ciepła";
      case "histogram":
        return "📊 Histogram";
      case "area":
        return "📈 Warstwowy";
      default:
        return type;
    }
  };

  return (
    <>
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
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-purple-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 capitalize flex items-center gap-1">
                      {getChartLabel(rec.chart_type)}
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
            ))}
          </div>
        </div>
      )}

      {suggestionError && (
        <div className="mx-6 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          {suggestionError}
        </div>
      )}
    </>
  );
}

