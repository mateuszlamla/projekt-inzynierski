import { apiClient } from "./client";

/**
 * Moduł API: Zbiory danych i operacje ETL (Sekcja 1)
 */
export const datasetApi = {
  uploadCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post("/upload-csv", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  getViewData: async (fileId, limit = 50) => {
    const res = await apiClient.get("/data/view", {
      params: { file_id: fileId, limit },
    });
    return res.data;
  },
};
