import { useState } from "react";
import { analysisApi } from "../services/api";

const numberFormat = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 });

function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return numberFormat.format(value);
  return String(value);
}

const NUMERIC_COLUMNS = [
  { key: "count", label: "N" },
  { key: "missing", label: "Braki" },
  { key: "mean", label: "Średnia" },
  { key: "std", label: "Odch. std." },
  { key: "min", label: "Min" },
  { key: "q1", label: "Q1" },
  { key: "median", label: "Mediana" },
  { key: "q3", label: "Q3" },
  { key: "max", label: "Max" },
];

export function DescriptiveStatsSettings({
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

  // null oznacza wszystkie kolumny
  const [selectedColumns, setSelectedColumns] = useState(
    node.data?.selectedColumns || null,
  );
  const [statsResult, setStatsResult] = useState(node.data?.statsResult || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isSelected = (col) => selectedColumns === null || selectedColumns.includes(col);

  const toggleColumn = (col) => {
    const current = selectedColumns === null ? columns : selectedColumns;
    const next = current.includes(col)
      ? current.filter((c) => c !== col)
      : columns.filter((c) => c === col || current.includes(c));
    const value = next.length === columns.length ? null : next;
    setSelectedColumns(value);
    updateNodeData?.(node.id, { selectedColumns: value });
  };

  const selectAll = (all) => {
    const value = all ? null : [];
    setSelectedColumns(value);
    updateNodeData?.(node.id, { selectedColumns: value });
  };

  const computeStats = async () => {
    if (selectedColumns?.length === 0) {
      setErrorMsg("Zaznacz co najmniej jedną kolumnę.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await analysisApi.getDescriptiveStats({
        file_id: fileId,
        columns: selectedColumns,
      });

      setStatsResult(data);
      updateNodeData?.(node.id, { selectedColumns, statsResult: data });
    } catch (error) {
      console.error("Błąd obliczania statystyk:", error);
      setErrorMsg(error.message || "Wystąpił błąd podczas komunikacji z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!fileId ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
          <strong className="block mb-1">Brak danych na wejściu!</strong>
          Połącz wyjście węzła <strong>Import CSV</strong> (bezpośrednio lub
          przez transformacje) z wejściem tego węzła.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Wybór kolumn */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Kolumny do analizy:
              </label>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => selectAll(true)}
                  className="text-teal-700 hover:underline cursor-pointer"
                >
                  Zaznacz wszystkie
                </button>
                <button
                  onClick={() => selectAll(false)}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Odznacz wszystkie
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
              {columns.map((col) => (
                <label
                  key={col}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                    isSelected(col)
                      ? "bg-teal-50 border-teal-300 text-teal-800"
                      : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(col)}
                    onChange={() => toggleColumn(col)}
                    className="accent-teal-600"
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <button
            onClick={computeStats}
            disabled={loading}
            className="mt-1 w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-300 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? "Obliczanie..." : "Oblicz statystyki"}
          </button>
        </div>
      )}

      {/* Wyniki */}
      {statsResult && (
        <div className="space-y-4 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statystyki opisowe
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-teal-100 text-teal-800">
              {formatValue(statsResult.rows_count)} wierszy
            </span>
          </div>

          {statsResult.numeric.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-slate-700">
                Kolumny liczbowe
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">
                        Kolumna
                      </th>
                      {NUMERIC_COLUMNS.map(({ key, label }) => (
                        <th
                          key={key}
                          className="p-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap text-right"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statsResult.numeric.map((row) => (
                      <tr
                        key={row.column}
                        className="hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <td className="p-2 font-medium text-slate-700 whitespace-nowrap">
                          {row.column}
                        </td>
                        {NUMERIC_COLUMNS.map(({ key }) => (
                          <td
                            key={key}
                            className={`p-2 whitespace-nowrap text-right font-mono tabular-nums ${
                              key === "missing" && row.missing > 0
                                ? "text-amber-700"
                                : "text-slate-600"
                            }`}
                          >
                            {formatValue(row[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {statsResult.categorical.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-slate-700">
                Kolumny kategoryczne
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {["Kolumna", "N", "Braki", "Unikalne", "Najczęstsze wartości"].map(
                        (label, idx) => (
                          <th
                            key={label}
                            className={`p-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap ${
                              idx > 0 && idx < 4 ? "text-right" : ""
                            }`}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {statsResult.categorical.map((row) => (
                      <tr
                        key={row.column}
                        className="hover:bg-slate-50 border-b border-slate-100 last:border-0 align-top"
                      >
                        <td className="p-2 font-medium text-slate-700 whitespace-nowrap">
                          {row.column}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums text-slate-600">
                          {formatValue(row.count)}
                        </td>
                        <td
                          className={`p-2 text-right font-mono tabular-nums ${
                            row.missing > 0 ? "text-amber-700" : "text-slate-600"
                          }`}
                        >
                          {formatValue(row.missing)}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums text-slate-600">
                          {formatValue(row.unique)}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {row.top_values.length === 0 ? (
                              <span className="text-slate-300">brak</span>
                            ) : (
                              row.top_values.map((tv) => (
                                <span
                                  key={String(tv.value)}
                                  className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded"
                                >
                                  {formatValue(tv.value)}{" "}
                                  <span className="text-slate-400">
                                    ({formatValue(tv.count)})
                                  </span>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
