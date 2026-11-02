import { create } from "zustand";
import { persist } from "zustand/middleware";
export const usePipelineStore = create(
  persist(
    (set) => ({
      nodes: [],
      edges: [],

      setNodes: (updater) =>
        set((state) => ({
          nodes: typeof updater === "function" ? updater(state.nodes) : updater,
        })),

      setEdges: (updater) =>
        set((state) => ({
          edges: typeof updater === "function" ? updater(state.edges) : updater,
        })),

      clearPipeline: () => set({ nodes: [], edges: [] }),
    }),

    {
      name: "dataflow-pipeline-storage",
    },
  ),
);
