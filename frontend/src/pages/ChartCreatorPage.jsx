import { useState } from "react";

export default function ChartCreatorPage() {
  const [selectedChartType, setSelectedChartType] = useState("bar");
  const [dropZones, setDropZones] = useState({
    xAxis: "region",
    yAxis: "sprzedaz_pln",
    color: "kategoria",
    size: null,
  });

  const chartTypes = [
    { id: "bar", name: "Słupkowy (Bar)", icon: "📊", desc: "Porównanie kategorii" },
    { id: "line", name: "Liniowy (Line)", icon: "📈", desc: "Trendy w czasie" },
    { id: "scatter", name: "Punktowy (Scatter)", icon: "⚬", desc: "Zależność dwóch zmiennych" },
    { id: "pie", name: "Kołowy (Pie)", icon: "🥧", desc: "Udziały w całości" },
    { id: "heatmap", name: "Mapa ciepła (Heatmap)", icon: "▦", desc: "Rozkład macierzowy" },
  ];

  const sampleColumns = [
    { name: "id", type: "number", icon: "#" },
    { name: "data_zamowienia", type: "date", icon: "📅" },
    { name: "region", type: "category", icon: "Abc" },
    { name: "kategoria", type: "category", icon: "Abc" },
    { name: "sprzedaz_pln", type: "number", icon: "#" },
    { name: "marza_procent", type: "number", icon: "%" },
    { name: "ilosc_sztuk", type: "number", icon: "#" },
  ];

  const [activeTab, setActiveTab] = useState("visual"); // visual | code

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans overflow-hidden">
      {/* LEWY PANEL: Źródło danych i dostępne kolumny */}
      <div className="w-80 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kolumny danych</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Plik aktywny</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Przeciągaj kolumny do stref osi po prawej
          </p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {sampleColumns.map((col) => (
            <div
              key={col.name}
              draggable
              className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg cursor-grab active:cursor-grabbing text-sm transition-all shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center font-bold">
                  {col.icon}
                </span>
                <span className="font-medium text-slate-200">{col.name}</span>
              </div>
              <span className="text-[11px] text-slate-400 capitalize">{col.type}</span>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400 text-center">
          Wykryto 7 kolumn • 12 450 wierszy
        </div>
      </div>

      {/* ŚRODKOWY OBSZAR: Strefy Upuszczania i Podgląd */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Pasek narzędziowy typu wykresu */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {chartTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedChartType(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedChartType === t.id
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

        {/* STREFY UPUSZCZANIA (DROP ZONES) */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-4 gap-4 shrink-0 shadow-xs">
          <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Oś X (Wymiar)</span>
            <div className="mt-2 flex items-center justify-between bg-white border border-purple-200 px-2.5 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs font-semibold text-slate-800">{dropZones.xAxis || "Upuść tutaj"}</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono">Abc</span>
            </div>
          </div>

          <div className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Oś Y (Miara / Agregacja)</span>
            <div className="mt-2 flex items-center justify-between bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs font-semibold text-slate-800">{dropZones.yAxis || "Upuść tutaj"}</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">SUMA</span>
            </div>
          </div>

          <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Kolor / Grupa</span>
            <div className="mt-2 flex items-center justify-between bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs font-semibold text-slate-800">{dropZones.color || "Opcjonalne"}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">Abc</span>
            </div>
          </div>

          <div className="border-2 border-dashed border-amber-200 bg-amber-50/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Rozmiar punktu</span>
            <div className="mt-2 flex items-center justify-between bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Brak (opcjonalne)</span>
              <span className="text-[10px] text-slate-400 font-mono">+</span>
            </div>
          </div>
        </div>

        {/* PODGLĄD WYKRESU LUB KODU */}
        <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
          {activeTab === "visual" ? (
            <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Suma sprzedaz_pln wg region</h3>
                  <p className="text-xs text-slate-400">Podgląd dynamicznego wykresu z interaktywnymi etykietami</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">Interaktywny (Plotly / Vega)</span>
                  <button className="text-xs bg-purple-600 text-white font-semibold px-3 py-1 rounded-md hover:bg-purple-700 transition-colors cursor-pointer">
                    Zapisz do bazy
                  </button>
                </div>
              </div>

              {/* Makieta wykresu słupkowego */}
              <div className="w-full h-72 flex items-end justify-around gap-6 px-8 pb-4 pt-8 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                  <span className="text-xs font-semibold text-slate-600">340k zł</span>
                  <div className="w-full bg-purple-500 rounded-t-lg h-48 transition-all hover:bg-purple-600 hover:scale-105 cursor-pointer shadow-sm"></div>
                  <span className="text-xs text-slate-700 font-medium">Północ</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                  <span className="text-xs font-semibold text-slate-600">512k zł</span>
                  <div className="w-full bg-purple-600 rounded-t-lg h-60 transition-all hover:bg-purple-700 hover:scale-105 cursor-pointer shadow-sm"></div>
                  <span className="text-xs text-slate-700 font-medium">Południe</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                  <span className="text-xs font-semibold text-slate-600">220k zł</span>
                  <div className="w-full bg-purple-400 rounded-t-lg h-32 transition-all hover:bg-purple-500 hover:scale-105 cursor-pointer shadow-sm"></div>
                  <span className="text-xs text-slate-700 font-medium">Wschód</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                  <span className="text-xs font-semibold text-slate-600">428k zł</span>
                  <div className="w-full bg-purple-500 rounded-t-lg h-52 transition-all hover:bg-purple-600 hover:scale-105 cursor-pointer shadow-sm"></div>
                  <span className="text-xs text-slate-700 font-medium">Zachód</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-slate-400 font-bold uppercase">Specyfikacja Hybrydowa (Python / Plotly)</span>
                <span className="text-emerald-400">Dwustronna synchronizacja GUI &lt;--&gt; Kod</span>
              </div>
              <pre className="text-slate-200 overflow-x-auto leading-relaxed">
{`# Wygenerowane deklaratywnie przez Kreator Wykresów
import polars as pl
import plotly.express as px

# 1. Agregacja danych w silniku Polars
df = pl.read_parquet("storage/dataset_current.parquet")
agg = df.group_by("${dropZones.xAxis}").agg(
    pl.col("${dropZones.yAxis}").sum().alias("${dropZones.yAxis}")
).sort("${dropZones.yAxis}", descending=True)

# 2. Renderowanie interaktywnego wykresu
fig = px.bar(
    agg.to_pandas(),
    x="${dropZones.xAxis}",
    y="${dropZones.yAxis}",
    color="${dropZones.color}",
    title="Suma ${dropZones.yAxis} wg ${dropZones.xAxis}",
    template="plotly_white"
)
fig.show()`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
