import { useState } from "react";
import { datasetApi } from "../../../api/datasets";
import { useDatasetStore } from "../../../store/useDatasetStore";

export function CsvUploadSettings({ node, updateNodeData }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const setGlobalDataset = useDatasetStore((s) => s.setDataset);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await datasetApi.uploadCsv(file);

      // Aktualizacja stanu lokalnego węzła w pipelinie
      updateNodeData(node.id, {
        fileId: data.file_id,
        columns: data.columns,
        status: `Załadowano ${data.rows_count} wierszy`,
      });

      // Aktualizacja globalnego store'a dostępnego w całej aplikacji
      setGlobalDataset({
        fileId: data.file_id,
        fileName: file.name,
        columns: data.columns,
        rowsCount: data.rows_count,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      setErrorMsg(error.message || "Błąd wgrywania pliku");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-700">Wgraj plik CSV</h4>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={loading}
        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
      />
      {loading && <p className="text-xs text-blue-600 animate-pulse">Wgrywanie i przetwarzanie pliku...</p>}
      {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
      {node.data?.columns && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <p className="font-semibold">{node.data.status}</p>
          <p className="text-slate-600 mt-1">
            Wykryte kolumny: <strong>{node.data.columns.join(", ")}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
