import { apiClient } from "./client";

/**
 * Moduł API: Wykresy (Sekcja 2)
 */
export const chartApi = {
  // Wykres słupkowy (obecny endpoint backendu)
  getBarChart: async (payload) => {
    const res = await apiClient.post("/plot/bar", payload);
    return res.data;
  },

  // Wykres liniowy (obecny endpoint backendu)
  getLineChart: async (fileId, xCol, yCol) => {
    const res = await apiClient.get("/plot/line", {
      params: {
        file_id: fileId,
        x_col: xCol,
        y_col: yCol,
      },
    });
    return res.data;
  },

  // Nowy endpoint do zwracania czystych danych JSON pod interaktywne Plotly/Vega (Task 1.2)
  getChartData: async (payload) => {
    const res = await apiClient.post("/api/chart/data", payload);
    return res.data;
  },

  // Rekomendacja wykresu na podstawie typów kolumn (Task 1.6)
  getChartSuggestion: async (fileId, columns) => {
    const res = await apiClient.post("/api/chart/suggest", {
      file_id: fileId,
      columns,
    });
    return res.data;
  },

  // CRUD Wykresów (Task 3.2)
  saveChart: async (chartData) => {
    const res = await apiClient.post("/api/charts", chartData);
    return res.data;
  },

  getSavedCharts: async () => {
    const res = await apiClient.get("/api/charts");
    return res.data;
  },

  deleteChart: async (chartId) => {
    const res = await apiClient.delete(`/api/charts/${chartId}`);
    return res.data;
  },
};
