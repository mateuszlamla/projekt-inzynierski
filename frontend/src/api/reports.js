import { apiClient } from "./client";

// Nazwa pliku z nagłówka Content-Disposition: najpierw pełna nazwa UTF-8, potem wersja ASCII
export function filenameFromDisposition(disposition, fallback = "raport.pdf") {
  if (!disposition) return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encoded) return decodeURIComponent(encoded[1]);
  const plain = /filename="([^"]+)"/i.exec(disposition);
  return plain ? plain[1] : fallback;
}

/**
 * Moduł API: Raporty PDF (Sekcja 3)
 * report: { title, file_id, sections: [{ type, heading?, request | content }] }
 */
export const reportsApi = {
  // Ten sam raport co PDF, jako HTML do podglądu w iframe
  getPreview: async (report) => {
    const res = await apiClient.post("/api/reports/preview", report, {
      responseType: "text",
    });
    return res.data;
  },

  getPdf: async (report) => {
    const res = await apiClient.post("/api/reports/pdf", report, {
      responseType: "blob",
    });
    return {
      blob: res.data,
      filename: filenameFromDisposition(res.headers["content-disposition"]),
    };
  },
};
