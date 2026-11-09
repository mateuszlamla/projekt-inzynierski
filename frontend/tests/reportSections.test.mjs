import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SECTION_STATUS,
  buildReportRequest,
  connectedNodes,
  moveItem,
  newTextItem,
  sectionStatus,
  syncReportItems,
} from "../src/components/pipeline/reportSections.js";

const statsRequest = { file_id: "dane.csv", columns: null };
const barRequest = { file_id: "dane.csv", x_col: "region", y_col: "sprzedaz" };

const nodes = [
  { id: "csv", type: "csv", label: "Import CSV", data: { fileId: "dane.csv" } },
  { id: "stats", type: "descriptive_stats", label: "Statystyki", data: { request: statsRequest } },
  { id: "bar", type: "bar_chart", label: "Wykres", data: { request: barRequest } },
  { id: "line", type: "line_chart", label: "Linia", data: {} },
  { id: "report", type: "report", label: "Raport PDF" },
];
const edges = [
  { source: "stats", target: "report" },
  { source: "bar", target: "report" },
  { source: "line", target: "report" },
  { source: "csv", target: "stats" },
];
const nodeItem = (nodeId, include = true) => ({ key: `node-${nodeId}`, kind: "node", nodeId, include });

test("zbiera tylko węzły podłączone do raportu", () => {
  const ids = connectedNodes("report", nodes, edges).map((n) => n.id);
  assert.deepEqual(ids, ["stats", "bar", "line"]);
});

test("dopisuje nowe węzły na końcu i usuwa odłączone", () => {
  const saved = [
    nodeItem("bar"),
    { key: "text-1", kind: "text", heading: "", content: "Wstęp" },
    nodeItem("gone"),
  ];
  const connected = connectedNodes("report", nodes, edges);

  const items = syncReportItems(saved, connected);

  assert.deepEqual(
    items.map((i) => i.nodeId ?? i.key),
    ["bar", "text-1", "stats", "line"],
  );
});

test("status sekcji zależy od zapisanego żądania i typu węzła", () => {
  assert.equal(sectionStatus(nodes[1]), SECTION_STATUS.READY);
  assert.equal(sectionStatus(nodes[3]), SECTION_STATUS.PENDING);
  assert.equal(sectionStatus(nodes[0]), SECTION_STATUS.UNSUPPORTED);
});

test("żądanie raportu zachowuje kolejność i pomija niegotowe pozycje", () => {
  const items = [
    { key: "text-1", kind: "text", heading: " Wstęp ", content: "Opis danych." },
    nodeItem("bar"),
    nodeItem("stats", false),
    nodeItem("line"),
    { key: "text-2", kind: "text", heading: "Pusty", content: "   " },
  ];

  const request = buildReportRequest("  Sprzedaż  ", items, nodes);

  assert.deepEqual(request, {
    title: "Sprzedaż",
    file_id: "dane.csv",
    sections: [
      { type: "text", heading: "Wstęp", content: "Opis danych." },
      { type: "bar_chart", request: barRequest },
    ],
  });
});

test("raport bez sekcji z danymi nie ma zbioru w nagłówku", () => {
  const items = [{ key: "text-1", kind: "text", heading: "", content: "Notatka" }];

  const request = buildReportRequest("", items, nodes);

  assert.equal(request.title, "Raport");
  assert.equal(request.file_id, null);
  assert.equal(request.sections[0].heading, null);
});

test("przesuwa pozycję i nie wychodzi poza listę", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
});

test("nowy akapit dostaje kolejny numer klucza", () => {
  const items = [nodeItem("bar"), { key: "text-3", kind: "text", heading: "", content: "" }];

  assert.equal(newTextItem(items).key, "text-4");
  assert.equal(newTextItem([]).key, "text-1");
});
