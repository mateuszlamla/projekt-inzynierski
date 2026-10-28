import { create } from "zustand";
import { chartApi } from "../api/charts";

const initialConfig = {
  chartType: "bar", // bar, line, scatter, pie, heatmap
  xAxis: "",
  yAxis: "",
  color: "",
  size: "",
  aggregation: "sum", // sum, mean, count, min, max, median
  sortOrder: "none", // none, desc, asc, alpha
  limit: "all",
  orientation: "vertical", // vertical, horizontal
  palette: "custom",
  theme: "white",
  colorHex: "#a855f7",
  title: "",
  xLabel: "",
  yLabel: "",
  rotation: 45,
  showGrid: true,
  showValues: false,
  filters: [], // [{ column, operator, value }]
  downsample: null, // null (auto), true, false
  downsampleThreshold: 1000,
};

/**
 * Globalny magazyn stanu konfiguracji i podglądu wykresów (Sekcja 2)
 */
export const useChartStore = create((set, get) => ({
  ...initialConfig,

  // Wyniki z serwera
  chartImage: null,
  pythonCode: null,
  summary: null,
  rawData: null, // Surowe dane JSON z Task 1.2 ({ status, x, y, meta, summary })
  isLoading: false,
  error: null,

  // Akcje modyfikacji konfiguracji
  setChartType: (chartType) => set({ chartType }),

  setAxis: (axisKey, colName) => set({ [axisKey]: colName }),

  setFilters: (filters) => set({ filters }),

  addFilter: (filter) => set((state) => ({ filters: [...state.filters, filter] })),

  removeFilter: (index) =>
    set((state) => ({ filters: state.filters.filter((_, i) => i !== index) })),

  updateConfig: (partial) => set((state) => ({ ...state, ...partial })),

  resetConfig: () =>
    set({
      ...initialConfig,
      chartImage: null,
      pythonCode: null,
      summary: null,
      rawData: null,
      error: null,
    }),

  // Asynchroniczne pobieranie surowych danych wykresu (Task 1.2 - JSON zamiast PNG)
  fetchChartData: async (fileId) => {
    const state = get();
    if (!fileId || !state.xAxis || !state.yAxis) {
      set({ error: "Wybierz plik oraz kolumny osi X i Y" });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const payload = {
        file_id: fileId,
        x_col: state.xAxis,
        y_col: state.yAxis,
        aggregation: state.aggregation,
        sort_order: state.sortOrder,
        limit: state.limit === "all" ? null : parseInt(state.limit, 10),
        chart_type: state.chartType,
        filters: state.filters && state.filters.length > 0 ? state.filters : null,
        downsample: state.downsample,
        downsample_threshold: state.downsampleThreshold,
      };

      const res = await chartApi.getChartData(payload);
      if (res.status === "error" || res.error) {
        set({ error: res.error || "Błąd pobierania danych wykresu", isLoading: false });
        return;
      }

      set({
        rawData: res,
        summary: res.summary || res.meta?.summary,
        isLoading: false,
      });
      return res;
    } catch (err) {
      set({
        error: err.message || "Błąd pobierania danych wykresu",
        isLoading: false,
      });
    }
  },

  // Asynchroniczne generowanie wykresu
  generateChart: async (fileId) => {
    const state = get();
    if (!fileId || !state.xAxis || !state.yAxis) {
      set({ error: "Wybierz plik oraz kolumny osi X i Y" });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      if (state.chartType === "bar") {
        const payload = {
          file_id: fileId,
          x_col: state.xAxis,
          y_col: state.yAxis,
          aggregation: state.aggregation,
          sort_order: state.sortOrder,
          limit: state.limit === "all" ? null : parseInt(state.limit, 10),
          orientation: state.orientation,
          color: state.colorHex,
          palette: state.palette,
          theme: state.theme,
          title: state.title || null,
          x_label: state.xLabel || null,
          y_label: state.yLabel || null,
          rotation: parseInt(state.rotation, 10),
          show_grid: state.showGrid,
          show_values: state.showValues,
          filters: state.filters && state.filters.length > 0 ? state.filters : null,
        };

        const res = await chartApi.getBarChart(payload);
        if (res.error) {
          set({ error: res.error, isLoading: false });
          return;
        }

        set({
          chartImage: res.image,
          pythonCode: res.code,
          summary: res.summary,
          isLoading: false,
        });
        return res;
      } else if (state.chartType === "line") {
        const res = await chartApi.getLineChart(fileId, state.xAxis, state.yAxis);
        if (res.error) {
          set({ error: res.error, isLoading: false });
          return;
        }

        set({
          chartImage: res.image,
          isLoading: false,
        });
        return res;
      }
    } catch (err) {
      set({
        error: err.message || "Błąd generowania wykresu",
        isLoading: false,
      });
    }
  },
}));
