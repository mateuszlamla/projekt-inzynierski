import assert from "node:assert/strict";
import { test } from "node:test";

import { findSourceNode } from "../src/hooks/useUpstreamDataset.js";

const csv = { id: "csv", data: { fileId: "dane.csv", columns: ["a"] } };
const filter = { id: "filter" };
const chart = { id: "chart" };
const nodes = [csv, filter, chart];

test("zwraca bezpośrednio podłączony import danych", () => {
  const connections = [{ source: "csv", target: "chart" }];
  assert.equal(findSourceNode("chart", nodes, connections), csv);
});

test("przechodzi przez transformacje do węzła z danymi", () => {
  const connections = [
    { source: "csv", target: "filter" },
    { source: "filter", target: "chart" },
  ];
  assert.equal(findSourceNode("chart", nodes, connections), csv);
});

test("bez danych w górze potoku zwraca bezpośredniego poprzednika", () => {
  const connections = [{ source: "filter", target: "chart" }];
  assert.equal(findSourceNode("chart", nodes, connections), filter);
});

test("bez połączenia wejściowego zwraca null", () => {
  assert.equal(findSourceNode("chart", nodes, []), null);
});

test("nie zapętla się na cyklu", () => {
  const connections = [
    { source: "chart", target: "filter" },
    { source: "filter", target: "chart" },
  ];
  assert.equal(findSourceNode("chart", nodes, connections), filter);
});
