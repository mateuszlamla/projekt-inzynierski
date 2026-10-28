import { create } from "zustand";
import { datasetApi } from "../api/datasets";

/**
 * Globalny magazyn stanu aktywnego zbioru danych (Sekcja 1 + fundament)
 */
export const useDatasetStore = create((set, get) => ({
  fileId: null,
  fileName: null,
  columns: [],
  rowsCount: 0,
  previewData: [],
  isLoading: false,
  error: null,

  // Podstawowe akcje aktualizacji stanu
  setDataset: ({ fileId, columns, rowsCount, fileName }) => {
    set({
      fileId,
      fileName: fileName || fileId,
      columns: columns || [],
      rowsCount: rowsCount || 0,
      error: null,
    });
    if (fileId) {
      get().fetchPreview(100);
    }
  },

  setPreviewData: (previewData) => set({ previewData }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearDataset: () =>
    set({
      fileId: null,
      fileName: null,
      columns: [],
      rowsCount: 0,
      previewData: [],
      error: null,
    }),

  // Asynchroniczne akcje integracyjne z API
  uploadFile: async (file) => {
    if (!file) return;
    set({ isLoading: true, error: null });
    try {
      const data = await datasetApi.uploadCsv(file);
      set({
        fileId: data.file_id,
        fileName: file.name,
        columns: data.columns || [],
        rowsCount: data.rows_count || 0,
        isLoading: false,
      });

      // Automatycznie pobierz pierwsze wiersze do podglądu
      try {
        const previewRes = await datasetApi.getViewData(data.file_id, 50);
        if (previewRes && !previewRes.error) {
          set({ previewData: previewRes.data || [] });
        }
      } catch (e) {
        console.warn("Nie udało się automatycznie pobrać podglądu tabeli", e);
      }

      return data;
    } catch (err) {
      set({
        error: err.message || "Błąd podczas wgrywania pliku CSV",
        isLoading: false,
      });
      throw err;
    }
  },

  fetchPreview: async (limit = 50) => {
    const { fileId } = get();
    if (!fileId) return;
    set({ isLoading: true });
    try {
      const data = await datasetApi.getViewData(fileId, limit);
      if (!data.error) {
        set({ previewData: data.data || [], columns: data.columns || [] });
      }
    } catch (err) {
      set({ error: err.message || "Błąd pobierania podglądu danych" });
    } finally {
      set({ isLoading: false });
    }
  },
}));
