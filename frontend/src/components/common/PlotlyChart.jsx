import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

/**
 * Uniwersalny komponent wrappera Plotly dla React 19
 *
 * @param {Array} data - Tablica serii danych Plotly (traces)
 * @param {Object} layout - Konfiguracja wyglądu wykresu (osie, tytuł, marginesy)
 * @param {Object} config - Opcje kontrolne Plotly (pasek narzędzi, responsywność)
 * @param {Function} onClick - Handler kliknięcia na element wykresu (np. pojedynczy słupek)
 * @param {Function} onSelected - Handler selekcji punktów (np. zaznaczenie lasso/box pod cross-filtering)
 * @param {boolean} isLoading - Wskaźnik ładowania danych
 */
export function PlotlyChart({
  data = [],
  layout = {},
  config = {},
  onClick,
  onSelected,
  onHover,
  style = { width: "100%", height: "100%", minHeight: "360px" },
  className = "",
  isLoading = false,
}) {
  const containerRef = useRef(null);

  // Domyślna, estetyczna konfiguracja paska narzędziowego
  const defaultPlotlyConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      "sendDataToCloud",
      "hoverClosestCartesian",
      "hoverCompareCartesian",
      "toggleSpikelines",
    ],
    toImageButtonOptions: {
      format: "png",
      filename: "wykres_dataflow",
      height: 700,
      width: 1000,
      scale: 2,
    },
    ...config,
  };

  // Domyślny, nowoczesny motyw dopasowany do aplikacji
  const defaultLayout = {
    autosize: true,
    margin: { l: 50, r: 30, t: 50, b: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: {
      family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      size: 12,
      color: "#475569",
    },
    xaxis: {
      gridcolor: "#e2e8f0",
      linecolor: "#cbd5e1",
      zerolinecolor: "#cbd5e1",
      tickfont: { size: 11, color: "#64748b" },
      ...layout.xaxis,
    },
    yaxis: {
      gridcolor: "#e2e8f0",
      linecolor: "#cbd5e1",
      zerolinecolor: "#cbd5e1",
      tickfont: { size: 11, color: "#64748b" },
      ...layout.yaxis,
    },
    ...layout,
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Klonujemy dane, aby uniknąć wewnętrznych mutacji obiektów przez Plotly.js
    const clonedData = data ? JSON.parse(JSON.stringify(data)) : [];
    const mergedLayout = { ...defaultLayout, ...layout };
    const mergedConfig = { ...defaultPlotlyConfig, ...config };

    Plotly.react(
      containerRef.current,
      clonedData,
      mergedLayout,
      mergedConfig
    );

    const elem = containerRef.current;

    // Podpięcie zdarzeń interaktywności
    const handleClick = (eData) => onClick?.(eData);
    const handleSelected = (eData) => onSelected?.(eData);
    const handleHover = (eData) => onHover?.(eData);

    elem.on?.("plotly_click", handleClick);
    elem.on?.("plotly_selected", handleSelected);
    elem.on?.("plotly_hover", handleHover);

    // Automatyczne dopasowanie rozmiaru przy zmianie okna/kontenera (ResizeObserver)
    const resizeObserver = new ResizeObserver(() => {
      if (elem && elem.data) {
        Plotly.Plots.resize(elem);
      }
    });
    resizeObserver.observe(elem);

    return () => {
      resizeObserver.disconnect();
      if (elem) {
        elem.removeAllListeners?.("plotly_click");
        elem.removeAllListeners?.("plotly_selected");
        elem.removeAllListeners?.("plotly_hover");
        Plotly.purge(elem);
      }
    };
  }, [data, layout, config]);

  return (
    <div className={`relative w-full h-full flex flex-col ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
            Renderowanie wykresu...
          </div>
        </div>
      )}
      <div ref={containerRef} style={style} className="w-full flex-1" />
    </div>
  );
}
