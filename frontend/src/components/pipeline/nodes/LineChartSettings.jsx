import { useState } from "react";
import { chartApi } from "../../../api/charts";
import { useUpstreamDataset } from "../../../hooks/useUpstreamDataset";

export function LineChartSettings({ node, connections, nodes, updateNodeData }) {
  const { sourceNode: inputNode, fileId, columns } = useUpstreamDataset(
    node,
    nodes,
    connections,
  );

  const [xCol, setXCol] = useState(node.data?.xCol || "");
  const [yCol, setYCol] = useState(node.data?.yCol || "");
  const [chartImage, setChartImage] = useState(node.data?.chartImage || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const generateChart = async () => {
    if (!fileId || !xCol || !yCol) {
      alert("Najpierw połącz węzły i wybierz kolumny!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await chartApi.getLineChart(fileId, xCol, yCol);

      if (data.error) {
        setErrorMsg(data.error);
        return;
      }

      setChartImage(data.image);
      updateNodeData?.(node.id, {
        chartImage: data.image,
        xCol,
        yCol,
      });
    } catch (error) {
      console.error("Błąd generowania wykresu liniowego", error);
      setErrorMsg(error.message || "Wystąpił błąd podczas komunikacji z serwerem.");
    } finally {
      setLoading(false);
    }
  };

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
          Upewnij się, że kabel idzie od <strong>Wyjścia z CSV</strong> do{" "}
          <strong>Wejścia Wykresu liniowego</strong>.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">
              Oś X (Kategorie / Oś czasu):
            </label>
            <select
              onChange={(e) => {
                setXCol(e.target.value);
                updateNodeData?.(node.id, { xCol: e.target.value });
              }}
              value={xCol}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Wybierz kolumnę...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">
              Oś Y (Wartości liczbowe):
            </label>
            <select
              onChange={(e) => {
                setYCol(e.target.value);
                updateNodeData?.(node.id, { yCol: e.target.value });
              }}
              value={yCol}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Wybierz kolumnę...</option>
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

          <button
            onClick={generateChart}
            disabled={loading}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                Generowanie wykresu...
              </>
            ) : (
              "Renderuj w Pythonie"
            )}
          </button>
        </div>
      )}

      {/* Wyświetlanie obrazka Base64 */}
      {chartImage && (
        <div className="mt-4 bg-white p-2 border border-slate-200 rounded-lg flex flex-col items-center">
          <img
            src={`data:image/png;base64,${chartImage}`}
            alt="Wygenerowany wykres liniowy"
            className="max-w-full h-auto rounded"
          />
        </div>
      )}
    </div>
  );
}
