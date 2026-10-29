import { apiClient } from "./client";

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
