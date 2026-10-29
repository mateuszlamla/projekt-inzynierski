import { useState } from "react";

export default function DashboardsPage() {
  const [selectedDashboard] = useState("Sprzedaż i Operacje 2026");

  const kpis = [
    { title: "Przychód Całkowity", value: "1,500,240 zł", delta: "+12.4%", positive: true },
    { title: "Liczba Transakcji", value: "34,890", delta: "+4.1%", positive: true },
    { title: "Średnia Wartość Koszyka", value: "43.00 zł", delta: "-1.8%", positive: false },
    { title: "Wskaźnik Retencji", value: "78.2%", delta: "+3.5%", positive: true },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 font-sans overflow-hidden">
      {/* Pasek kontrolny Dashboardu */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🎛️</span> {selectedDashboard}
            </h1>
            <p className="text-xs text-slate-400">Widok siatki kafelków (react-grid-layout) z filtrami w czasie rzeczywistym</p>
          </div>
        </div>

        {/* Akcje dashboardu */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400">Zakres:</span>
            <span className="font-semibold">Ostatnie 30 dni</span>
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer">
            <span>+</span> Dodaj kafelek
          </button>
          <button className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer">
            Zapisz układ
          </button>
        </div>
      </div>

      {/* Pasek filtrów globalnych */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center gap-4 text-xs shrink-0">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Filtry globalne:</span>
        <div className="flex items-center gap-2">
          <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-xs">
            Region: <strong className="text-blue-600">Wszystkie</strong>
          </span>
          <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-xs">
            Kategoria: <strong className="text-blue-600">Elektronika</strong>
          </span>
          <button className="text-slate-400 hover:text-slate-600 text-[11px] underline ml-2 cursor-pointer">
            Wyczyść filtry
          </button>
        </div>
      </div>

      {/* GŁÓWNA SIATKA DASHBOARDU */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Kafelki KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500">{kpi.title}</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-800">{kpi.value}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${kpi.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {kpi.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Kafelki wykresów w siatce */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kafelek 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Dynamika sprzedaży w czasie</h3>
                <span className="text-[11px] text-slate-400">Podgląd z próbowaniem LTTB</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button className="p-1 hover:bg-slate-100 rounded text-xs cursor-pointer">⋮</button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400 text-xs">
              [Wykres liniowy: Plotly.js z obsługą Zoom / Pan]
            </div>
          </div>

          {/* Kafelek 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Udział kategorii w przychodzie</h3>
                <span className="text-[11px] text-slate-400">Obsługa Cross-filtering (kliknij segment)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button className="p-1 hover:bg-slate-100 rounded text-xs cursor-pointer">⋮</button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400 text-xs">
              [Wykres słupkowy / kołowy: Powiązany z filtrem globalnym]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
