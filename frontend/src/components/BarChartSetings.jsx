import { useState } from "react";
import axios from "axios";

export function BarChartSettings({ node, connections, nodes }) {
  const inputConnection = connections.find((c) => c.target === node.id);
  const inputNode = inputConnection
    ? nodes.find((n) => n.id === inputConnection.source)
    : null;

  const columns = inputNode?.data?.columns || [];
  const fileId = inputNode?.data?.fileId;

  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");

  const [chartImage, setChartImage] = useState(null);

  const generateChart = async () => {
    if (!fileId || !xCol || !yCol) {
      alert("Najpierw połącz węzły i wybierz kolumny!");
      return;
    }

    try {
      const response = await axios.get("http://localhost:8000/plot/bar", {
        params: {
          file_id: fileId,
          x_col: xCol,
          y_col: yCol,
        },
      });

      if (response.data.error) {
        alert("Błąd serwera: " + response.data.error);
        return;
      }

      setChartImage(response.data.image);
    } catch (error) {
      console.error("Błąd generowania wykresu", error);
      alert("Wystąpił błąd podczas generowania wykresu na serwerze.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs px-3 py-2 bg-slate-100 rounded text-slate-500 font-mono">
        Debug: Podłączony węzeł: {inputNode ? "✅" : "❌"} | ID Pliku:{" "}
        {fileId ? "✅" : "❌"} | Kolumn: {columns.length}
      </div>

      {!fileId ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
          <strong className="block mb-1">Brak danych na wejściu!</strong>
          Upewnij się, że kabel idzie od <strong>Wyjścia z CSV</strong> do{" "}
          <strong>Wejścia Wykresu</strong>.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">
              Oś X (Kategorie tekstowe):
            </label>
            <select
              onChange={(e) => setXCol(e.target.value)}
              value={xCol}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
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
              onChange={(e) => setYCol(e.target.value)}
              value={yCol}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">Wybierz kolumnę...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={generateChart}
            className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Renderuj w Pythonie
          </button>
        </div>
      )}

      {/* Wyświetlanie obrazka Base64 */}
      {chartImage && (
        <div className="mt-4 bg-white p-2 border border-slate-200 rounded-lg flex justify-center">
          <img
            src={`data:image/png;base64,${chartImage}`}
            alt="Wygenerowany wykres"
            className="max-w-full h-auto rounded"
          />
        </div>
      )}
    </div>
  );
}
