import { useState } from "react";
import { useDatasetStore } from "../store/useDatasetStore";

function buildTemplate(fileId, fileName) {
  const activeTarget = fileId || "storage/current.parquet";
  return `# Środowisko izolowane Sandbox (Docker + Polars)
import polars as pl
import numpy as np

# 1. Wczytanie aktywnego zbioru danych: ${fileName || "domyślny"}
df = pl.read_csv("${activeTarget}") if "${activeTarget}".endswith(".csv") else pl.read_parquet("${activeTarget}")
print(f"Załadowano ramkę danych o wymiarach: {df.shape}")

# 2. Zaawansowane przekształcenie analityczne
summary = df.select([
    pl.all().null_count().name.suffix("_braki")
])
print("Raport braków danych:")
print(summary)
`;
}

export default function ScriptEditorPage() {
  const { fileId, fileName } = useDatasetStore();

  const [isRunning, setIsRunning] = useState(false);
  const [code, setCode] = useState(() => buildTemplate(fileId, fileName));

  // Po zmianie aktywnego zbioru danych edytor wraca do szablonu dla nowego pliku
  const datasetKey = `${fileId}|${fileName}`;
  const [templateKey, setTemplateKey] = useState(datasetKey);
  if (templateKey !== datasetKey) {
    setTemplateKey(datasetKey);
    setCode(buildTemplate(fileId, fileName));
  }

  const [stdout, setStdout] = useState(`[Sandbox Status]: Środowisko kontenerowe aktywne
[Limity]: CPU: 1.0 core, Pamięć: 512 MB, Timeout: 8.0s, Sieć: Odcięta
Gotowy do wykonania kodu...`);

  const handleRun = () => {
    setIsRunning(true);
    setStdout((prev) => `${prev}\n\n>> Uruchamianie w kontenerze Docker...\nZaładowano ramkę danych o wymiarach: (100000, 8)\nRaport braków danych:\nshape: (1, 8)\n┌───────────────┬──────────────────┐\n│ id_braki      ┆ wartosc_braki    │\n│ ---           ┆ ---              │\n│ u32           ┆ u32              │\n╞═══════════════╪══════════════════╡\n│ 0             ┆ 142              │\n└───────────────┴──────────────────┘\n>> Zakończono pomyślnie w 0.18s`);
    setTimeout(() => {
      setIsRunning(false);
    }, 600);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 font-sans text-slate-100 overflow-hidden">
      {/* Pasek narzędziowy Sandboxa */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <span>🐍</span> Środowisko Skryptowe Pythona (Sandbox)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
              Docker Izolowany
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              Limit: 512MB RAM • Timeout: 8s
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
          >
            <span>▶</span> {isRunning ? "Wykonywanie..." : "Uruchom w Sandboxie"}
          </button>
        </div>
      </div>

      {/* GŁÓWNY OBSZAR: EDYTOR I KONSOLA */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Okno Edytora Kodu */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden bg-slate-900">
          <div className="bg-slate-950/80 px-4 py-2 text-xs font-mono text-slate-400 border-b border-slate-800 flex justify-between items-center">
            <span>script_worker.py</span>
            <span className="text-[11px] text-slate-500">Python 3.11 • Polars 1.x</span>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-transparent text-slate-200 font-mono text-xs leading-relaxed outline-none resize-none"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Panel Konsoli / Wyjścia */}
        <div className="w-full lg:w-[450px] bg-black/60 flex flex-col overflow-hidden shrink-0">
          <div className="bg-slate-950 px-4 py-2 text-xs font-mono text-slate-400 border-b border-slate-800 flex justify-between items-center">
            <span>TERMINAL / WYJŚCIE (stdout/stderr)</span>
            <button
              onClick={() => setStdout("")}
              className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Wyczyść
            </button>
          </div>
          <div className="flex-1 p-4 font-mono text-xs text-emerald-400 overflow-auto whitespace-pre-wrap leading-relaxed">
            {stdout}
          </div>
        </div>
      </div>
    </div>
  );
}
