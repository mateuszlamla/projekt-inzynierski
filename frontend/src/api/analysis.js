import { apiClient } from "./client";

/**
 * Moduł API: Analizy statystyczne i regresja (Sekcja 3)
 */
export const analysisApi = {
  // columns: lista kolumn albo null dla wszystkich
  getDescriptiveStats: async (payload) => {
    const res = await apiClient.post("/analysis/descriptive", payload);
    return res.data;
  },

  trainLinearRegression: async (payload) => {
    const res = await apiClient.post("/ml/linear_regression", payload);
    return res.data;
  },
};
