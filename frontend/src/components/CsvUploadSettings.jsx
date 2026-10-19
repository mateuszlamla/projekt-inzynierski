import { useState } from "react";

export function CsvUploadSettings({ node, updateNodeData }) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/upload-csv", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      updateNodeData(node.id, {
        fileId: data.file_id,
        columns: data.columns,
        status: `Uploaded ${data.rows_count} rows`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setLoading(false);
  };

  return (
    <div>
      <h4>Wgraj plik csv</h4>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={loading}
      />
      {loading && <p>Uploading...</p>}
      {node.data?.columns && (
        <p style={{ color: "green", marginTop: "10px" }}>
          {node.data.status} <br /> Detected columns:{" "}
          {node.data.columns.join(", ")}
        </p>
      )}
    </div>
  );
}
