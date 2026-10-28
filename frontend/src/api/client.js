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

export default apiClient;
