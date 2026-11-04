// Gotowe presety kolorystyczne (Task 2.2)
export const COLOR_PRESETS = [
  { name: "Fiolet", hex: "#a855f7" },
  { name: "Błękit", hex: "#3b82f6" },
  { name: "Szmaragd", hex: "#10b981" },
  { name: "Bursztyn", hex: "#f59e0b" },
  { name: "Róża", hex: "#f43f5e" },
  { name: "Indygo", hex: "#6366f1" },
];

export const MULTI_PALETTES = {
  custom: ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"],
  vibrant: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"],
  pastel: ["#93c5fd", "#86efac", "#fde047", "#fca5a5", "#d8b4fe", "#f9a8d4"],
  coolwarm: ["#2563eb", "#38bdf8", "#94a3b8", "#f87171", "#dc2626", "#ea580c"],
};

export const CHART_TYPES = [
  {
    id: "bar",
    name: "Słupkowy (Bar)",
    icon: "📊",
    desc: "Porównanie kategorii",
  },
  { id: "line", name: "Liniowy (Line)", icon: "📈", desc: "Trendy w czasie" },
  {
    id: "scatter",
    name: "Punktowy (Scatter)",
    icon: "⚬",
    desc: "Zależność dwóch zmiennych",
  },
  { id: "pie", name: "Kołowy (Pie)", icon: "🥧", desc: "Udziały w całości" },
  {
    id: "heatmap",
    name: "Mapa ciepła (Heatmap)",
    icon: "▦",
    desc: "Rozkład macierzowy",
  },
];

// Przykładowy zbiór danych używany, gdy użytkownik nie wgrał jeszcze własnego pliku CSV
export const SAMPLE_DATASET = [
  {
    region: "Północ",
    kategoria: "Elektronika",
    sprzedaz_pln: 145000,
    marza_procent: 22,
    ilosc_sztuk: 320,
    data_zamowienia: "2026-01-15",
  },
  {
    region: "Północ",
    kategoria: "Moda",
    sprzedaz_pln: 85000,
    marza_procent: 35,
    ilosc_sztuk: 540,
    data_zamowienia: "2026-02-10",
  },
  {
    region: "Północ",
    kategoria: "Dom",
    sprzedaz_pln: 110000,
    marza_procent: 18,
    ilosc_sztuk: 210,
    data_zamowienia: "2026-03-05",
  },
  {
    region: "Południe",
    kategoria: "Elektronika",
    sprzedaz_pln: 230000,
    marza_procent: 25,
    ilosc_sztuk: 480,
    data_zamowienia: "2026-01-20",
  },
  {
    region: "Południe",
    kategoria: "Moda",
    sprzedaz_pln: 160000,
    marza_procent: 40,
    ilosc_sztuk: 920,
    data_zamowienia: "2026-02-18",
  },
  {
    region: "Południe",
    kategoria: "Dom",
    sprzedaz_pln: 122000,
    marza_procent: 20,
    ilosc_sztuk: 310,
    data_zamowienia: "2026-03-22",
  },
  {
    region: "Wschód",
    kategoria: "Elektronika",
    sprzedaz_pln: 95000,
    marza_procent: 19,
    ilosc_sztuk: 190,
    data_zamowienia: "2026-01-12",
  },
  {
    region: "Wschód",
    kategoria: "Moda",
    sprzedaz_pln: 65000,
    marza_procent: 32,
    ilosc_sztuk: 410,
    data_zamowienia: "2026-02-14",
  },
  {
    region: "Wschód",
    kategoria: "Dom",
    sprzedaz_pln: 60000,
    marza_procent: 15,
    ilosc_sztuk: 150,
    data_zamowienia: "2026-03-10",
  },
  {
    region: "Zachód",
    kategoria: "Elektronika",
    sprzedaz_pln: 185000,
    marza_procent: 24,
    ilosc_sztuk: 390,
    data_zamowienia: "2026-01-28",
  },
  {
    region: "Zachód",
    kategoria: "Moda",
    sprzedaz_pln: 130000,
    marza_procent: 38,
    ilosc_sztuk: 780,
    data_zamowienia: "2026-02-25",
  },
  {
    region: "Zachód",
    kategoria: "Dom",
    sprzedaz_pln: 113000,
    marza_procent: 21,
    ilosc_sztuk: 280,
    data_zamowienia: "2026-03-18",
  },
  {
    region: "Centrum",
    kategoria: "Elektronika",
    sprzedaz_pln: 280000,
    marza_procent: 26,
    ilosc_sztuk: 610,
    data_zamowienia: "2026-01-31",
  },
  {
    region: "Centrum",
    kategoria: "Moda",
    sprzedaz_pln: 195000,
    marza_procent: 42,
    ilosc_sztuk: 1150,
    data_zamowienia: "2026-02-28",
  },
  {
    region: "Centrum",
    kategoria: "Dom",
    sprzedaz_pln: 135000,
    marza_procent: 23,
    ilosc_sztuk: 340,
    data_zamowienia: "2026-03-25",
  },
];

