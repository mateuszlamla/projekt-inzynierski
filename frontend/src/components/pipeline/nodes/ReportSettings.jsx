import { useState } from "react";
import { reportsApi } from "../../../api/reports";
import {
  SECTION_STATUS,
  buildReportRequest,
  connectedNodes,
  moveItem,
  newTextItem,
  sectionStatus,
  syncReportItems,
} from "../reportSections";

const STATUS_BADGES = {
  [SECTION_STATUS.READY]: {
    label: "Gotowe",
    className: "bg-emerald-100 text-emerald-800",
  },
  [SECTION_STATUS.PENDING]: {
    label: "Najpierw oblicz wynik w tym węźle",
    className: "bg-amber-100 text-amber-800",
  },
  [SECTION_STATUS.UNSUPPORTED]: {
    label: "Ten węzeł nie trafia do raportu",
    className: "bg-slate-100 text-slate-500",
  },
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Adres zwalniamy chwilę później, żeby przeglądarka zdążyła rozpocząć pobieranie
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MoveButtons({ index, count, onMove }) {
  return (
    <div className="flex flex-col">
      <button
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        className="px-1.5 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        title="Przesuń wyżej"
      >
        ▲
      </button>
      <button
        onClick={() => onMove(index, 1)}
        disabled={index === count - 1}
        className="px-1.5 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        title="Przesuń niżej"
      >
        ▼
      </button>
    </div>
  );
}

export function ReportSettings({ node, connections, nodes, updateNodeData }) {
  const [title, setTitle] = useState(node.data?.title || "Raport z analizy danych");
  const [savedItems, setSavedItems] = useState(node.data?.reportItems || []);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [loading, setLoading] = useState(null); // "preview" | "pdf" | null
  const [errorMsg, setErrorMsg] = useState(null);

  const connected = connectedNodes(node.id, nodes, connections);
  const items = syncReportItems(savedItems, connected);
  const request = buildReportRequest(title, items, nodes);

  const saveItems = (nextItems) => {
    setSavedItems(nextItems);
    setPreviewHtml(null);
    updateNodeData?.(node.id, { reportItems: nextItems });
  };

  const updateItem = (key, changes) =>
    saveItems(items.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  const addText = () => saveItems([...items, newTextItem(items)]);

  const changeTitle = (value) => {
    setTitle(value);
    setPreviewHtml(null);
    updateNodeData?.(node.id, { title: value });
  };

  const runAction = async (action) => {
    setLoading(action);
    setErrorMsg(null);
    try {
      if (action === "preview") {
        setPreviewHtml(await reportsApi.getPreview(request));
      } else {
        const { blob, filename } = await reportsApi.getPdf(request);
        downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error("Błąd generowania raportu:", error);
      setErrorMsg(error.message || "Nie udało się wygenerować raportu.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <label htmlFor={`report-title-${node.id}`} className="text-sm font-semibold text-slate-700">
          Tytuł raportu
        </label>
        <input
          id={`report-title-${node.id}`}
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => changeTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Sekcje raportu</span>
          <button
            onClick={addText}
            className="text-xs text-rose-700 hover:underline cursor-pointer"
          >
            + Dodaj akapit tekstu
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-4 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 text-sm">
            Podłącz do wejścia tego węzła wykresy lub analizy (np. <strong>Statystyki
            opisowe</strong>), a pojawią się tu jako sekcje raportu.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => {
              if (item.kind === "text") {
                return (
                  <li
                    key={item.key}
                    className="flex gap-2 p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <MoveButtons index={index} count={items.length} onMove={(i, o) => saveItems(moveItem(items, i, o))} />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.heading}
                        placeholder="Nagłówek akapitu (opcjonalny)"
                        onChange={(e) => updateItem(item.key, { heading: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <textarea
                        value={item.content}
                        rows={3}
                        placeholder="Treść. Pusta linia rozpoczyna nowy akapit."
                        onChange={(e) => updateItem(item.key, { content: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <button
                      onClick={() => saveItems(items.filter((i) => i.key !== item.key))}
                      className="self-start text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      Usuń
                    </button>
                  </li>
                );
              }

              const sourceNode = nodes.find((n) => n.id === item.nodeId);
              const status = sectionStatus(sourceNode);
              const badge = STATUS_BADGES[status];
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <MoveButtons index={index} count={items.length} onMove={(i, o) => saveItems(moveItem(items, i, o))} />
                  <label className="flex flex-1 items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.include && status !== SECTION_STATUS.UNSUPPORTED}
                      disabled={status === SECTION_STATUS.UNSUPPORTED}
                      onChange={(e) => updateItem(item.key, { include: e.target.checked })}
                      className="accent-rose-600"
                    />
                    {sourceNode.label}
                  </label>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => runAction("preview")}
          disabled={loading !== null || request.sections.length === 0}
          className="flex-1 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 disabled:opacity-50 font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading === "preview" ? "Przygotowywanie..." : "Podgląd"}
        </button>
        <button
          onClick={() => runAction("pdf")}
          disabled={loading !== null || request.sections.length === 0}
          className="flex-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm"
        >
          {loading === "pdf" ? "Generowanie PDF..." : "Pobierz PDF"}
        </button>
      </div>
      {request.sections.length === 0 && items.length > 0 && (
        <p className="text-xs text-slate-500 -mt-2">
          Raport potrzebuje co najmniej jednej gotowej sekcji albo akapitu z treścią.
        </p>
      )}

      {previewHtml && (
        <iframe
          title="Podgląd raportu"
          srcDoc={previewHtml}
          sandbox=""
          className="w-full h-[520px] border border-slate-200 rounded-lg bg-slate-200"
        />
      )}
    </div>
  );
}
