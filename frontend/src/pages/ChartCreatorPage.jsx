import { useState, useMemo } from "react";
import { useDatasetStore } from "../store/useDatasetStore";
import { useChartStore } from "../store/useChartStore";
import { SAMPLE_DATASET } from "../components/charts/chartConstants";
import {
  computeAggregatedData,
  buildPlotlyData,
  buildPlotlyLayout,
} from "../components/charts/chartBuilders";
import { ChartSidebar } from "../components/charts/ChartSidebar";
import { ChartToolbar } from "../components/charts/ChartToolbar";
import { ChartDropZones } from "../components/charts/ChartDropZones";
import { ChartRecommendations } from "../components/charts/ChartRecommendations";
import { ChartPreview } from "../components/charts/ChartPreview";
import { ChartStylePanel } from "../components/charts/ChartStylePanel";

export default function ChartCreatorPage() {
  const { fileId, columns, previewData, uploadFile } = useDatasetStore();

  const {
    chartType,
    xAxis,
    yAxis,
    aggregation,
    colorHex,
    theme,
    palette,
    title,
    xLabel,
    yLabel,
    showGrid,
    showValues,
    rotation,
    orientation,
    sortOrder,
    limit,
    isLoading,
    isSuggesting,
    fetchSuggestions,
    generateChart,
  } = useChartStore();

  const [activeTab, setActiveTab] = useState("visual"); // visual | code
  const [renderEngine, setRenderEngine] = useState("plotly"); // plotly | static
  const [uploadLoading, setUploadLoading] = useState(false);
  const [interactionEvent, setInteractionEvent] = useState(null);
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(true);

  // Użyj kolumn z wgranego pliku lub domyślnych z szablonu demo
  const activeColumns = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.map((c) => ({ name: c, type: "data", icon: "•" }));
    }
    return [
      { name: "region", type: "category", icon: "Abc" },
      { name: "sprzedaz_pln", type: "number", icon: "#" },
      { name: "kategoria", type: "category", icon: "Abc" },
      { name: "data_zamowienia", type: "date", icon: "📅" },
      { name: "marza_procent", type: "number", icon: "%" },
      { name: "ilosc_sztuk", type: "number", icon: "#" },
    ];
  }, [columns]);

  // Efektywne kolumny X i Y — jeśli użytkownik jeszcze nie kliknął, przyjmujemy pierwsze 2 kolumny
  const effX = xAxis || activeColumns[0]?.name || "region";
  const effY =
    yAxis ||
    (activeColumns[1]?.name !== effX
      ? activeColumns[1]?.name
      : activeColumns[0]?.name) ||
    "sprzedaz_pln";

  // Aktywne źródło danych: wgrane wiersze lub szablon demo
  const datasetToUse = useMemo(() => {
    if (previewData && previewData.length > 0) {
      return previewData;
    }
    return SAMPLE_DATASET;
  }, [previewData]);

  // Dynamiczne grupowanie, agregacja, sortowanie i limitowanie w locie
  const aggregatedData = useMemo(() => {
    return computeAggregatedData(
      datasetToUse,
      effX,
      effY,
      aggregation,
      sortOrder,
      limit
    );
  }, [datasetToUse, effX, effY, aggregation, sortOrder, limit]);

  // Obliczenie serii danych Plotly na podstawie zagregowanych wartości
  const plotlyPlotData = useMemo(() => {
    return buildPlotlyData({
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
    });
  }, [
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
  ]);

  // Obliczenie konfiguracji wyglądu (layout) Plotly
  const plotlyLayout = useMemo(() => {
    return buildPlotlyLayout({
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
    });
  }, [
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
  ]);

  const handleQuickUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      await uploadFile(file);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!fileId) {
      alert("Najpierw wgraj plik CSV!");
      return;
    }
    generateChart(fileId);
  };

  const handleGetSuggestions = () => {
    if (!fileId) {
      alert(
        "Najpierw wgraj plik CSV, aby silnik mógł przeanalizować typy i unikalność danych!"
      );
      return;
    }
    const colsToAnalyze = [effX, effY].filter(Boolean);
    fetchSuggestions(fileId, colsToAnalyze);
  };

  const handlePlotlyClick = (eData) => {
    const pt = eData.points?.[0];
    if (pt) {
      setInteractionEvent(
        `Kliknięto element: ${pt.x || pt.label || "Punkt"} = ${pt.y ?? pt.value} (index: ${pt.pointIndex})`
      );
    }
  };

  const handlePlotlySelected = (eData) => {
    const pts = eData?.points || [];
    if (pts.length > 0) {
      setInteractionEvent(
        `Zaznaczono lasso/boxem: ${pts.length} punktów (Cross-filtering aktywny)`
      );
    } else {
      setInteractionEvent(null);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans overflow-hidden">
      {/* 1. LEWY PANEL: Kolumny i szybki import */}
      <ChartSidebar
        activeColumns={activeColumns}
        effX={effX}
        effY={effY}
        uploadLoading={uploadLoading}
        onQuickUpload={handleQuickUpload}
      />

      {/* 2. ŚRODKOWY OBSZAR ROBOCZY */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <ChartToolbar
          renderEngine={renderEngine}
          setRenderEngine={setRenderEngine}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStylePanelOpen={isStylePanelOpen}
          setIsStylePanelOpen={setIsStylePanelOpen}
        />

        <ChartDropZones
          effX={effX}
          effY={effY}
          fileId={fileId}
          isLoading={isLoading}
          isSuggesting={isSuggesting}
          onGenerate={handleGenerate}
          onGetSuggestions={handleGetSuggestions}
        />

        <ChartRecommendations effX={effX} effY={effY} />

        <ChartPreview
          activeTab={activeTab}
          renderEngine={renderEngine}
          effX={effX}
          effY={effY}
          fileId={fileId}
          plotlyPlotData={plotlyPlotData}
          plotlyLayout={plotlyLayout}
          interactionEvent={interactionEvent}
          onClearInteraction={() => setInteractionEvent(null)}
          onPlotlyClick={handlePlotlyClick}
          onPlotlySelected={handlePlotlySelected}
        />
      </div>

      {/* 3. PRAWY PANEL: Formatowanie i styl */}
      {isStylePanelOpen && (
        <ChartStylePanel onClose={() => setIsStylePanelOpen(false)} />
      )}
    </div>
  );
}
