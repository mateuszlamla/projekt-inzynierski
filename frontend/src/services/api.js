import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Główna instancja klienta HTTP
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor żądań - logowanie diagnostyczne w środowisku deweloperskim
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.debug(
        `[API] ↗ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        config.params || config.data || ""
      );
    }
    return config;
  },
  (error) => {
    console.error("[API] Błąd przygotowania żądania:", error);
    return Promise.reject(error);
  }
);

// Interceptor odpowiedzi - ujednolicone przechwytywanie błędów
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.debug(
        `[API] ↘ ${response.status} ${response.config.url}`,
        response.data
      );
    }
    return response;
  },
  (error) => {
    const errorDetails = {
      message:
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        "Nieznany błąd serwera",
      status: error.response?.status,
      url: error.config?.url,
    };

    console.error(`[API Błąd] ${errorDetails.status || "NETWORK"}:`, errorDetails.message);
    return Promise.reject(errorDetails);
  }
);

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

/**
 * Moduł API: Machine Learning / Analityka
 */
export const mlApi = {
  trainLinearRegression: async (payload) => {
    const res = await apiClient.post("/ml/linear_regression", payload);
    return res.data;
  },
};

/**
 * Moduł API: Sandbox Pythona (Task 2.5)
 */
export const sandboxApi = {
  runScript: async (code, fileId) => {
    const res = await apiClient.post("/api/sandbox/run", {
      code,
      file_id: fileId,
    });
    return res.data;
  },
};

/**
 * Moduł API: Dashboardy (Task 3.3)
 */
export const dashboardApi = {
  getDashboard: async (dashboardId) => {
    const res = await apiClient.get(`/api/dashboards/${dashboardId}`);
    return res.data;
  },

  saveDashboard: async (dashboardData) => {
    const res = await apiClient.post("/api/dashboards", dashboardData);
    return res.data;
  },

  listDashboards: async () => {
    const res = await apiClient.get("/api/dashboards");
    return res.data;
  },
};

export default apiClient;
