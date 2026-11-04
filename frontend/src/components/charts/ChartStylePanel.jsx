import { useState } from "react";
import { useChartStore } from "../../store/useChartStore";
import { COLOR_PRESETS, MULTI_PALETTES } from "./chartConstants";

export function ChartStylePanel({ onClose }) {
  const {
    title,
    xLabel,
    yLabel,
    showGrid,
    showValues,
    rotation,
    colorHex,
    theme,
    palette,
    orientation,
    sortOrder,
    limit,
    chartType,
    updateConfig,
  } = useChartStore();

  const [openSections, setOpenSections] = useState({
    titles: true,
    colors: true,
    axes: false,
    layout: false,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
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
          onClick={onClose}
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
            <div className="p-3.5 space-y-3 bg-white border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tytuł wykresu
                </label>
                <input
                  type="text"
                  value={title}
                  placeholder="Automatyczny tytuł wg kolumn"
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Etykieta osi X
                </label>
                <input
                  type="text"
                  value={xLabel}
                  placeholder="Domyślna nazwa kolumny X"
                  onChange={(e) => updateConfig({ xLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Etykieta osi Y
                </label>
                <input
                  type="text"
                  value={yLabel}
                  placeholder="Domyślna nazwa kolumny Y"
                  onChange={(e) => updateConfig({ yLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
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
            <div className="p-3.5 space-y-4 bg-white border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Kolor serii danych
                </label>
                <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => updateConfig({ colorHex: c.hex })}
                      style={{ backgroundColor: c.hex }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        colorHex === c.hex
                          ? "scale-115 ring-2 ring-purple-600 ring-offset-2"
                          : "hover:scale-105 opacity-90"
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={colorHex || "#a855f7"}
                    onChange={(e) =>
                      updateConfig({ colorHex: e.target.value })
                    }
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={colorHex || "#a855f7"}
                    onChange={(e) =>
                      updateConfig({ colorHex: e.target.value })
                    }
                    className="text-xs font-mono text-slate-700 bg-transparent uppercase outline-none flex-1"
                    maxLength={7}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Paleta wielobarwna
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.keys(MULTI_PALETTES).map((palKey) => (
                    <button
                      key={palKey}
                      onClick={() => updateConfig({ palette: palKey })}
                      className={`p-1.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        palette === palKey
                          ? "border-purple-500 bg-purple-50/50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-slate-700 capitalize">
                        {palKey}
                      </span>
                      <div className="flex h-2 rounded overflow-hidden">
                        {MULTI_PALETTES[palKey].slice(0, 5).map((col, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: col }}
                            className="flex-1"
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Motyw wykresu
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "white", label: "Jasny", icon: "☀️" },
                    { id: "dark", label: "Ciemny", icon: "🌙" },
                    { id: "minimal", label: "Minimal", icon: "📄" },
                  ].map((th) => (
                    <button
                      key={th.id}
                      onClick={() => updateConfig({ theme: th.id })}
                      className={`py-1.5 px-2 rounded-lg border text-center font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        theme === th.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{th.icon}</span>
                      <span>{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>
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
            <div className="p-3.5 space-y-4 bg-white border-t border-slate-100">
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 cursor-pointer border border-slate-200 transition-colors">
                  <span className="text-xs font-semibold text-slate-700">
                    Linie siatki (Grid)
                  </span>
                  <input
                    type="checkbox"
                    checked={showGrid !== false}
                    onChange={(e) =>
                      updateConfig({ showGrid: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 cursor-pointer border border-slate-200 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">
                      Etykiety wartości
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Wartości nad słupkami/punktami
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(showValues)}
                    onChange={(e) =>
                      updateConfig({ showValues: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Kąt etykiet osi X
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 30, 45, 90].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => updateConfig({ rotation: deg })}
                      className={`py-1.5 rounded-lg border font-semibold text-[11px] transition-all cursor-pointer ${
                        (rotation ?? 45) === deg
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
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
            <div className="p-3.5 space-y-4 bg-white border-t border-slate-100">
              {chartType === "bar" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Orientacja słupków
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => updateConfig({ orientation: "vertical" })}
                      className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orientation !== "horizontal"
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>📊</span> Pionowa
                    </button>
                    <button
                      onClick={() =>
                        updateConfig({ orientation: "horizontal" })
                      }
                      className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orientation === "horizontal"
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>📑</span> Pozioma
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Sortowanie
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "none", label: "Domyślne", icon: "⏹" },
                    { id: "desc", label: "Malejąco", icon: "⬇" },
                    { id: "asc", label: "Rosnąco", icon: "⬆" },
                    { id: "alpha", label: "A - Z", icon: "🔤" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateConfig({ sortOrder: s.id })}
                      className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        (sortOrder || "none") === s.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Limit danych (Top N)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "all", label: "Wszystko" },
                    { id: "5", label: "Top 5" },
                    { id: "10", label: "Top 10" },
                    { id: "20", label: "Top 20" },
                  ].map((lim) => (
                    <button
                      key={lim.id}
                      onClick={() => updateConfig({ limit: lim.id })}
                      className={`py-1.5 rounded-lg border font-semibold text-[11px] transition-all cursor-pointer ${
                        (limit || "all") === lim.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {lim.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

