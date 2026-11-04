import { MULTI_PALETTES } from "./chartConstants";

/**
 * Grupowanie, agregacja, sortowanie i limitowanie wierszy na potrzeby wykresu.
 */
export function computeAggregatedData(
  datasetToUse,
  effX,
  effY,
  aggregation,
  sortOrder,
  limit
) {
  if (!datasetToUse || datasetToUse.length === 0) {
    return { labels: [], values: [] };
  }

  const groups = {};

  datasetToUse.forEach((row) => {
    const rawX = row[effX];
    const key =
      rawX !== undefined && rawX !== null && rawX !== ""
        ? String(rawX)
        : "(brak)";
    const rawY = row[effY];
    const numY = Number(rawY);
    const val = isNaN(numY) ? 1 : numY;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(val);
  });

  const labels = Object.keys(groups);
  const values = labels.map((key) => {
    const items = groups[key];
    if (aggregation === "count") return items.length;
    if (aggregation === "mean") {
      const sum = items.reduce((acc, v) => acc + v, 0);
      return Math.round((sum / (items.length || 1)) * 100) / 100;
    }
    if (aggregation === "min") return Math.min(...items);
    if (aggregation === "max") return Math.max(...items);
    if (aggregation === "median") {
      const sorted = [...items].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
    }
    // default: sum
    return items.reduce((acc, v) => acc + v, 0);
  });

  let entries = labels.map((l, i) => ({ label: l, value: values[i] }));

  if (sortOrder === "desc") {
    entries.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  } else if (sortOrder === "asc") {
    entries.sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
  } else if (sortOrder === "alpha") {
    entries.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  if (limit && limit !== "all") {
    const n = parseInt(limit, 10);
    if (!isNaN(n) && n > 0) {
      entries = entries.slice(0, n);
    }
  }

  return {
    labels: entries.map((e) => e.label),
    values: entries.map((e) => e.value),
  };
}

/**
 * Budowa serii danych (traces) dla biblioteki Plotly.js.
 */
export function buildPlotlyData({
  aggregatedData,
  chartType,
  effX,
  effY,
  aggregation,
  datasetToUse,
  colorHex,
  palette,
  theme,
  showValues,
  orientation,
}) {
  const { labels, values } = aggregatedData;

  if (chartType === "bar") {
    const isHoriz = orientation === "horizontal";
    return [
      {
        type: "bar",
        orientation: isHoriz ? "h" : "v",
        x: isHoriz ? values : labels,
        y: isHoriz ? labels : values,
        marker: {
          color: colorHex || "#a855f7",
          line: { color: colorHex ? `${colorHex}dd` : "#7e22ce", width: 1.5 },
        },
        text: showValues
          ? values.map((v) =>
              typeof v === "number" ? v.toLocaleString() : v
            )
          : undefined,
        textposition: showValues ? "auto" : undefined,
        hovertemplate: isHoriz
          ? `<b>%{y}</b><br>${aggregation.toUpperCase()} ${effY}: %{x:,.2f}<extra></extra>`
          : `<b>%{x}</b><br>${aggregation.toUpperCase()} ${effY}: %{y:,.2f}<extra></extra>`,
      },
    ];
  } else if (chartType === "line") {
    return [
      {
        type: "scatter",
        mode: "lines+markers",
        x: labels,
        y: values,
        line: { color: colorHex || "#3b82f6", width: 3, shape: "spline" },
        marker: { color: colorHex || "#1d4ed8", size: 8 },
        text: showValues
          ? values.map((v) =>
              typeof v === "number" ? v.toLocaleString() : v
            )
          : undefined,
        textposition: showValues ? "top center" : undefined,
        hovertemplate: `<b>%{x}</b><br>${effY}: %{y:,.2f}<extra></extra>`,
      },
    ];
  } else if (chartType === "scatter") {
    const rawX = datasetToUse.map((r) => Number(r[effX]) || 0);
    const rawY = datasetToUse.map((r) => Number(r[effY]) || 0);
    return [
      {
        type: "scatter",
        mode: "markers",
        x: rawX,
        y: rawY,
        marker: {
          color: colorHex || "#10b981",
          size: 10,
          opacity: 0.85,
          line: { color: colorHex ? `${colorHex}dd` : "#047857", width: 1.5 },
        },
        text: showValues
          ? rawY.map((v) => (typeof v === "number" ? v.toLocaleString() : v))
          : undefined,
        textposition: showValues ? "top center" : undefined,
        hovertemplate: `${effX}: %{x}<br>${effY}: %{y}<extra></extra>`,
      },
    ];
  } else if (chartType === "pie") {
    return [
      {
        type: "pie",
        labels: labels.slice(0, 10),
        values: values.slice(0, 10),
        marker: {
          colors: MULTI_PALETTES[palette] || MULTI_PALETTES.custom,
        },
        textinfo: "label+percent",
        hoverinfo: "label+value+percent",
      },
    ];
  } else if (chartType === "heatmap") {
    const chunks = [];
    for (let i = 0; i < values.length; i += 4) {
      chunks.push(values.slice(i, i + 4));
    }
    return [
      {
        type: "heatmap",
        z:
          chunks.length > 0
            ? chunks
            : [
                [1, 2, 3],
                [4, 5, 6],
              ],
        colorscale:
          palette === "coolwarm"
            ? "RdBu"
            : palette === "vibrant"
              ? "Plasma"
              : [
                  [0, theme === "dark" ? "#1e293b" : "#f8fafc"],
                  [1, colorHex || "#a855f7"],
                ],
      },
    ];
  }
  return [];
}

/**
 * Budowa konfiguracji układu (layout) dla biblioteki Plotly.js.
 */
export function buildPlotlyLayout({
  effX,
  effY,
  aggregation,
  chartType,
  title,
  xLabel,
  yLabel,
  showGrid,
  showValues,
  rotation,
  colorHex,
  theme,
  palette,
  orientation,
  sortOrder,
  limit,
}) {
  const isDark = theme === "dark";
  const isMinimal = theme === "minimal";

  const paperBg = isDark ? "#0f172a" : isMinimal ? "#fafaf9" : "#ffffff";
  const plotBg = isDark ? "#1e293b" : isMinimal ? "#fafaf9" : "#ffffff";
  const textColor = isDark ? "#f8fafc" : "#1e293b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  const isHorizBar = chartType === "bar" && orientation === "horizontal";

  return {
    title: {
      text: title || `${aggregation.toUpperCase()} ${effY} wg ${effX}`,
      font: { size: 14, color: textColor, weight: "bold" },
    },
    paper_bgcolor: paperBg,
    plot_bgcolor: plotBg,
    font: { color: textColor },
    xaxis: {
      title: {
        text: isHorizBar
          ? yLabel || `${aggregation.toUpperCase()} (${effY})`
          : xLabel || effX,
        font: { color: textColor },
      },
      tickangle: isHorizBar ? 0 : -Number(rotation ?? 45),
      showgrid: showGrid !== false,
      gridcolor: gridColor,
      tickfont: { color: textColor },
    },
    yaxis: {
      title: {
        text: isHorizBar
          ? xLabel || effX
          : yLabel || `${aggregation.toUpperCase()} (${effY})`,
        font: { color: textColor },
      },
      autorange: isHorizBar ? "reversed" : true,
      showgrid: showGrid !== false,
      gridcolor: gridColor,
      tickfont: { color: textColor },
    },
    uirevision: "true",
    datarevision: `${effX}_${effY}_${aggregation}_${chartType}_${colorHex}_${theme}_${palette}_${title}_${xLabel}_${yLabel}_${showGrid}_${showValues}_${rotation}_${orientation}_${sortOrder}_${limit}`,
  };
}

