import { useState, useEffect } from "react";
import axios from "axios";

export function DataViewSettings({ node, connections, nodes }) {
  const inputConnection = connections.find((c) => c.target === node.id);
  const inputNode = inputConnection
    ? nodes.find((n) => n.id === inputConnection.source)
    : null;
  const fileId = inputNode?.data?.fileId;

  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!fileId) return;
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:8000/data/view", {
          params: { file_id: fileId, limit: 50 },
        });

        if (!response.data.error) {
          setColumns(response.data.columns);
          setTableData(response.data.data);
        }
      } catch (error) {
        console.error("Błąd pobierania danych", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fileId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs px-3 py-2 bg-slate-100 rounded text-slate-500 font-mono">
        Debug: Podłączony węzeł: {inputNode ? "✅" : "❌"} | ID Pliku:{" "}
        {fileId ? "✅" : "❌"}
      </div>

      {!fileId ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
          Najpierw podłącz wejście tego węzła do węzła z załadowanymi danymi.
        </div>
      ) : loading ? (
        <div className="p-4 text-center text-slate-500">
          Ładowanie danych...
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto overflow-y-auto max-h-[300px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="p-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-4 text-center text-slate-500"
                  >
                    Brak danych
                  </td>
                </tr>
              ) : (
                tableData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="p-3 text-slate-600 whitespace-nowrap"
                      >
                        {row[col] !== null ? (
                          String(row[col])
                        ) : (
                          <span className="text-slate-300">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
