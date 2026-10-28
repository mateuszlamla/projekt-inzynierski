import { BarChartSettings } from "./nodes/BarChartSettings";
import { CsvUploadSettings } from "./nodes/CsvUploadSettings";
import { DataViewSettings } from "./nodes/DataViewSettings";
import { DescriptiveStatsSettings } from "./nodes/DescriptiveStatsSettings";
import { FilterSettings } from "./nodes/FilterSettings";
import { LineChartSettings } from "./nodes/LineChartSettings";
import { LinearRegressionSettings } from "./nodes/LinearRegressionSettings";

/**
 * Rejestr węzłów potoku. Dodanie nowego węzła: wpis w NODE_CATEGORIES (paleta)
 * i, jeśli węzeł ma okno konfiguracji, wpis w NODE_SETTINGS.
 */

export const NODE_WIDTH = 220;

// Paleta węzłów: kategorie z kolorami i typy węzłów z liczbą portów
export const NODE_CATEGORIES = [
  {
    category: "Źródła danych",
    color: "bg-emerald-500 border-emerald-600",
    headerColor: "bg-emerald-100 text-emerald-800",
    items: [
      {
        type: "csv",
        label: "Import CSV",
        icon: "FileText",
        inputs: 0,
        outputs: 1,
      },
      {
        type: "database",
        label: "Baza danych",
        icon: "Database",
        inputs: 0,
        outputs: 1,
      },
    ],
  },
  {
    category: "Transformacja",
    color: "bg-blue-500 border-blue-600",
    headerColor: "bg-blue-100 text-blue-800",
    items: [
      {
        type: "filter",
        label: "Filtruj",
        icon: "Filter",
        inputs: 1,
        outputs: 1,
      },
      {
        type: "combine",
        label: "Łącz",
        icon: "Combine",
        inputs: 2,
        outputs: 1,
      },
    ],
  },
  {
    category: "Wizualizacja",
    color: "bg-purple-500 border-purple-600",
    headerColor: "bg-purple-100 text-purple-800",
    items: [
      {
        type: "bar_chart",
        label: "Wykres słupkowy",
        icon: "BarChart",
        inputs: 1,
        outputs: 0,
      },
      {
        type: "table_view",
        label: "Podgląd danych",
        icon: "FileText",
        inputs: 1,
        outputs: 0,
      },
      {
        type: "line_chart",
        label: "Wykres liniowy",
        icon: "LineChart",
        inputs: 1,
        outputs: 0,
      },
    ],
  },
  {
    category: "Analiza",
    color: "bg-teal-500 border-teal-600",
    headerColor: "bg-teal-100 text-teal-800",
    items: [
      {
        type: "descriptive_stats",
        label: "Statystyki opisowe",
        icon: "Sigma",
        inputs: 1,
        outputs: 1,
      },
    ],
  },
  {
    category: "Machine Learning",
    color: "bg-yellow-500 border-yellow-600",
    headerColor: "bg-yellow-100 text-yellow-800",
    items: [
      {
        type: "linear_regression",
        label: "Regresja liniowa",
        icon: "LineChart",
        inputs: 1,
        outputs: 1,
      },
    ],
  },
];

// Okno konfiguracji węzła: komponent ustawień i szerokość okna (wide dla wykresów i analiz)
export const NODE_SETTINGS = {
  csv: { component: CsvUploadSettings },
  filter: { component: FilterSettings },
  bar_chart: { component: BarChartSettings, wide: true },
  line_chart: { component: LineChartSettings, wide: true },
  table_view: { component: DataViewSettings, wide: true },
  descriptive_stats: { component: DescriptiveStatsSettings, wide: true },
  linear_regression: { component: LinearRegressionSettings, wide: true },
};
