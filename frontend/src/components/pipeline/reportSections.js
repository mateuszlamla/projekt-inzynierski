/**
 * Logika węzła raportu: które podłączone węzły trafiają do raportu, w jakiej kolejności
 * i jak z nich zbudować żądanie dla POST /api/reports/pdf.
 */

// Typ węzła potoku -> typ sekcji raportu w backendzie
export const REPORTABLE_NODE_TYPES = {
  bar_chart: "bar_chart",
  line_chart: "line_chart",
  descriptive_stats: "descriptive",
  linear_regression: "regression",
};

// Stan sekcji widoczny w ustawieniach raportu
export const SECTION_STATUS = {
  READY: "ready", // węzeł ma zapisane żądanie, sekcja trafi do raportu
  PENDING: "pending", // węzeł jeszcze nie został obliczony
  UNSUPPORTED: "unsupported", // tego typu węzła nie da się umieścić w raporcie
};

export function connectedNodes(reportNodeId, nodes, edges) {
  return edges
    .filter((e) => e.target === reportNodeId)
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter(Boolean);
}

/**
 * Lista pozycji raportu: zapisana kolejność i ustawienia użytkownika, uzupełniona
 * o nowo podłączone węzły (na końcu) i bez węzłów, które zostały odłączone.
 * Pozycja węzła: { key, kind: "node", nodeId, include }
 * Akapit tekstu: { key, kind: "text", heading, content }
 */
export function syncReportItems(savedItems, connected) {
  const connectedIds = new Set(connected.map((n) => n.id));
  const kept = (savedItems || []).filter(
    (item) => item.kind === "text" || connectedIds.has(item.nodeId),
  );
  const knownIds = new Set(kept.filter((i) => i.kind === "node").map((i) => i.nodeId));
  const added = connected
    .filter((n) => !knownIds.has(n.id))
    .map((n) => ({ key: `node-${n.id}`, kind: "node", nodeId: n.id, include: true }));
  return [...kept, ...added];
}

// Nowy akapit tekstu z kluczem o numerze większym niż wszystkie dotychczasowe
export function newTextItem(items) {
  const numbers = items
    .filter((i) => i.kind === "text")
    .map((i) => Number(i.key.replace("text-", "")) || 0);
  const next = Math.max(0, ...numbers) + 1;
  return { key: `text-${next}`, kind: "text", heading: "", content: "" };
}

export function sectionStatus(node) {
  if (!REPORTABLE_NODE_TYPES[node.type]) return SECTION_STATUS.UNSUPPORTED;
  return node.data?.request ? SECTION_STATUS.READY : SECTION_STATUS.PENDING;
}

export function moveItem(items, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Żądanie raportu z pozycji w ustalonej kolejności. Pomija wyłączone węzły, węzły
 * jeszcze nieobliczone lub nieobsługiwane oraz puste akapity.
 */
export function buildReportRequest(title, items, nodes) {
  const sections = [];
  for (const item of items) {
    if (item.kind === "text") {
      if (item.content?.trim()) {
        sections.push({
          type: "text",
          heading: item.heading?.trim() || null,
          content: item.content,
        });
      }
      continue;
    }

    const node = nodes.find((n) => n.id === item.nodeId);
    if (!item.include || !node || sectionStatus(node) !== SECTION_STATUS.READY) continue;
    sections.push({ type: REPORTABLE_NODE_TYPES[node.type], request: node.data.request });
  }

  // Nagłówek raportu opisuje zbiór danych pierwszej sekcji z wynikami
  const firstWithData = sections.find((s) => s.request?.file_id);
  return {
    title: title?.trim() || "Raport",
    file_id: firstWithData?.request.file_id ?? null,
    sections,
  };
}
