import { useMemo } from "react";

/**
 * Szuka w górę potoku najbliższego węzła z wgranymi danymi (data.fileId), dzięki czemu
 * węzeł wykresu lub analizy może stać za transformacjami, a nie tylko tuż za importem.
 * Gdy takiego węzła nie ma, zwraca bezpośredniego poprzednika (albo null).
 */
export function findSourceNode(nodeId, nodes, connections) {
  const upstreamOf = (id) => {
    const connection = connections.find((c) => c.target === id);
    return connection ? nodes.find((n) => n.id === connection.source) ?? null : null;
  };

  const directInput = upstreamOf(nodeId);
  const visited = new Set([nodeId]);
  let current = directInput;

  // visited chroni przed nieskończoną pętlą, gdy połączenia tworzą cykl
  while (current && !visited.has(current.id)) {
    if (current.data?.fileId) return current;
    visited.add(current.id);
    current = upstreamOf(current.id);
  }
  return directInput;
}

export function useUpstreamDataset(node, nodes, connections) {
  return useMemo(() => {
    const sourceNode = findSourceNode(node.id, nodes, connections);
    return {
      sourceNode,
      fileId: sourceNode?.data?.fileId,
      columns: sourceNode?.data?.columns || [],
    };
  }, [node.id, nodes, connections]);
}
