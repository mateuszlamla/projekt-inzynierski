import { apiClient } from "./client";

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
