import { useState } from "react";
import { mlApi } from "../services/api";

export function LinearRegressionSettings({
  node,
  connections,
  nodes,
  updateNodeData,
}) {
  // Znajdź połączenie wchodzące do tego węzła
  const inputConnection = connections.find((c) => c.target === node.id);

  // Znajdź węzeł źródłowy z danymi (również po łańcuchu upstream)
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

  const [xCol, setXCol] = useState(node.data?.xCol || "");
  const [yCol, setYCol] = useState(node.data?.yCol || "");
  const [modelResult, setModelResult] = useState(node.data?.modelResult || null);
  const [predictX, setPredictX] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const trainModel = async () => {
    if (!fileId || !xCol || !yCol) {
      alert("Najpierw połącz węzły i wybierz obie kolumny!");
      return;
    }

    if (xCol === yCol) {
      alert("Cecha X i zmienna objaśniana Y muszą być różnymi kolumnami!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await mlApi.trainLinearRegression({
        file_id: fileId,
        x_col: xCol,
        y_col: yCol,
      });

      if (data.error) {
        setErrorMsg(data.error);
        return;
      }

      setModelResult(data);
      updateNodeData?.(node.id, {
        xCol,
        yCol,
        modelResult: data,
      });
    } catch (error) {
      console.error("Błąd trenowania regresji:", error);
      setErrorMsg(error.message || "Wystąpił błąd podczas komunikacji z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  // Obliczenie predykcji w czasie rzeczywistym
  const calculatedY =
    modelResult && predictX !== "" && !isNaN(Number(predictX))
      ? (modelResult.slope * Number(predictX) + modelResult.intercept).toFixed(2)
      : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Pasek diagnostyczny */}
      <div className="text-xs px-3 py-2 bg-slate-100 rounded text-slate-500 font-mono">
        Debug: Podłączony węzeł: {inputNode ? "✅" : "❌"} | ID Pliku:{" "}
        {fileId ? "✅" : "❌"} | Kolumn: {columns.length}
      </div>

      {!fileId ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
          <strong className="block mb-1">Brak danych na wejściu!</strong>
          Połącz wyjście węzła <strong>Import CSV</strong> z wejściem tego
          węzła.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Wybór zmiennej X */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">
              Cecha X (Zmienna niezależna):
            </label>
            <select
              onChange={(e) => {
                setXCol(e.target.value);
                updateNodeData?.(node.id, { xCol: e.target.value });
              }}
              value={xCol}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
            >
              <option value="">Wybierz kolumnę X...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Wybór zmiennej Y */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">
              Cel Y (Zmienna objaśniana):
            </label>
            <select
              onChange={(e) => {
                setYCol(e.target.value);
                updateNodeData?.(node.id, { yCol: e.target.value });
              }}
              value={yCol}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
            >
              <option value="">Wybierz kolumnę Y...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Przycisk trenowania */}
          <button
            onClick={trainModel}
            disabled={loading}
            className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 disabled:bg-yellow-300 text-slate-900 font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-slate-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Trenowanie modelu...
              </>
            ) : (
              "Wytrenuj model (Scikit-Learn)"
            )}
          </button>
        </div>
      )}

      {/* Wyniki i ewaluacja modelu */}
      {modelResult && (
        <div className="mt-3 space-y-3 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Wyniki dopasowania
            </h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${modelResult.r2_score >= 0.7
                  ? "bg-green-100 text-green-700"
                  : modelResult.r2_score >= 0.4
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-700"
                }`}
            >
              R² = {modelResult.r2_score.toFixed(3)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block mb-0.5">Współczynnik (a):</span>
              <span className="font-semibold text-slate-700 font-mono">
                {modelResult.slope.toFixed(4)}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block mb-0.5">Wyraz wolny (b):</span>
              <span className="font-semibold text-slate-700 font-mono">
                {modelResult.intercept.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-yellow-50/70 border border-yellow-200 rounded-lg text-xs">
            <span className="text-yellow-800 font-semibold block mb-0.5">
              Równanie regresji:
            </span>
            <code className="text-slate-800 font-mono font-medium block overflow-x-auto">
              {modelResult.formula}
            </code>
          </div>

          {/* Wykres */}
          {modelResult.image && (
            <div className="border border-slate-200 rounded-lg overflow-hidden flex justify-center bg-slate-50 p-1">
              <img
                src={`data:image/png;base64,${modelResult.image}`}
                alt="Wykres regresji liniowej"
                className="max-w-full h-auto rounded"
              />
            </div>
          )}

          {/* Interaktywny symulator predykcji */}
          <div className="p-3 bg-slate-900 text-slate-100 rounded-lg space-y-2 mt-2">
            <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1">
              ⚡ Szybka predykcja live
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={`Wartość dla ${xCol || "X"}`}
                value={predictX}
                onChange={(e) => setPredictX(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
              <div className="text-xs font-mono font-semibold px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-yellow-300 min-w-[70px] text-center">
                {calculatedY !== null ? calculatedY : "---"}
              </div>
            </div>
            {calculatedY !== null && (
              <p className="text-[11px] text-slate-400">
                Dla {xCol} = {predictX} przewidywane {yCol} wynosi{" "}
                <span className="text-white font-semibold">{calculatedY}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
