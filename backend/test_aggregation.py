import unittest
import polars as pl
from services.aggregation import aggregate_data, compute_summary


class TestPolarsAggregation(unittest.TestCase):
    def setUp(self):
        # Przykładowy zbiór danych z różnymi typami, brakami i wartościami numerycznymi
        self.df = pl.DataFrame({
            "region": ["Północ", "Południe", "Północ", "Wschód", "Południe", "Wschód", "Zachód", None],
            "sprzedaz": [100.0, 200.0, 150.0, 50.0, 300.0, 70.0, 400.0, 500.0],
            "ilosc_tekst": ["10", "20", "15", "5", "30", "7", "40", "50"],  # string do konwersji
        })
        self.lf = self.df.lazy()

    def test_aggregate_sum(self):
        result = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="sum", sort_order="desc")
        records = result.to_dicts()

        # Oczekiwane sumy (wiersz z None w region został odrzucony):
        # Południe: 200 + 300 = 500
        # Zachód: 400
        # Północ: 100 + 150 = 250
        # Wschód: 50 + 70 = 120
        self.assertEqual(len(records), 4)
        self.assertEqual(records[0]["region"], "Południe")
        self.assertEqual(records[0]["sprzedaz"], 500.0)
        self.assertEqual(records[1]["region"], "Zachód")
        self.assertEqual(records[1]["sprzedaz"], 400.0)

    def test_aggregate_mean(self):
        result = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="mean", sort_order="alpha")
        records = {r["region"]: r["sprzedaz"] for r in result.to_dicts()}

        self.assertAlmostEqual(records["Północ"], 125.0)  # (100 + 150) / 2
        self.assertAlmostEqual(records["Południe"], 250.0)  # (200 + 300) / 2
        self.assertAlmostEqual(records["Wschód"], 60.0)   # (50 + 70) / 2

    def test_aggregate_count(self):
        result = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="count", sort_order="desc")
        records = {r["region"]: r["sprzedaz"] for r in result.to_dicts()}

        self.assertEqual(records["Północ"], 2)
        self.assertEqual(records["Południe"], 2)
        self.assertEqual(records["Wschód"], 2)
        self.assertEqual(records["Zachód"], 1)

    def test_aggregate_min_max_median(self):
        res_min = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="min")
        res_max = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="max")
        res_med = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="median")

        min_map = {r["region"]: r["sprzedaz"] for r in res_min.to_dicts()}
        max_map = {r["region"]: r["sprzedaz"] for r in res_max.to_dicts()}
        med_map = {r["region"]: r["sprzedaz"] for r in res_med.to_dicts()}

        self.assertEqual(min_map["Północ"], 100.0)
        self.assertEqual(max_map["Północ"], 150.0)
        self.assertEqual(med_map["Północ"], 125.0)

    def test_string_column_auto_cast(self):
        # Kolumna 'ilosc_tekst' zawiera stringi ["10", "20", ...]
        result = aggregate_data(self.lf, x_col="region", y_col="ilosc_tekst", aggregation="sum", sort_order="desc")
        records = result.to_dicts()

        # Południe: 20 + 30 = 50
        self.assertEqual(records[0]["region"], "Południe")
        self.assertEqual(records[0]["ilosc_tekst"], 50.0)

    def test_limit(self):
        result = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="sum", sort_order="desc", limit=2)
        self.assertEqual(len(result), 2)

    def test_compute_summary(self):
        result = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="sum")
        summary = compute_summary(result, "sprzedaz")

        # Suma ze wszystkich 4 regionów: 500 + 400 + 250 + 120 = 1270
        self.assertEqual(summary["categories_count"], 4)
        self.assertEqual(summary["total_sum"], 1270.0)
        self.assertEqual(summary["min"], 120.0)
        self.assertEqual(summary["max"], 500.0)

    def test_api_endpoints_integration(self):
        import pandas as pd
        import main
        from main import BarChartRequest, ChartDataRequest, get_plot_bar, get_chart_data, get_plot_line

        # Rejestrujemy plik testowy w data_store (symulacja wgranego pliku, bez pyarrow)
        test_file_id = "test_mock.csv"
        main.data_store[test_file_id] = pd.DataFrame(self.df.to_dicts())

        # 1. Test POST /plot/bar
        bar_req = BarChartRequest(
            file_id=test_file_id,
            x_col="region",
            y_col="sprzedaz",
            aggregation="sum",
            sort_order="desc"
        )
        bar_res = get_plot_bar(bar_req)
        self.assertEqual(bar_res["status"], "success")
        self.assertTrue(len(bar_res["image"]) > 100)
        self.assertIn("pl.scan_parquet", bar_res["code"])
        self.assertEqual(bar_res["summary"]["categories_count"], 4)

        # 2. Test POST /api/chart/data
        chart_data_req = ChartDataRequest(
            file_id=test_file_id,
            x_col="region",
            y_col="sprzedaz",
            aggregation="sum",
            sort_order="desc"
        )
        chart_res = get_chart_data(chart_data_req)
        self.assertEqual(chart_res["status"], "success")
        self.assertEqual(chart_res["x"], ["Południe", "Zachód", "Północ", "Wschód"])
        self.assertEqual(chart_res["y"], [500.0, 400.0, 250.0, 120.0])

        # 3. Test GET /plot/line
        line_res = get_plot_line(file_id=test_file_id, x_col="region", y_col="sprzedaz")
        self.assertIn("image", line_res)
        self.assertTrue(len(line_res["image"]) > 100)


if __name__ == "__main__":
    unittest.main()
