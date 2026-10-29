import unittest

import polars as pl

from app.services.charts.aggregation import aggregate_data, compute_summary


class TestPolarsAggregation(unittest.TestCase):
    def setUp(self):
        # Przykładowy zbiór danych z różnymi typami, brakami i wartościami numerycznymi
        self.df = pl.DataFrame(
            {
                "region": [
                    "Północ",
                    "Południe",
                    "Północ",
                    "Wschód",
                    "Południe",
                    "Wschód",
                    "Zachód",
                    None,
                ],
                "sprzedaz": [100.0, 200.0, 150.0, 50.0, 300.0, 70.0, 400.0, 500.0],
                "ilosc_tekst": [
                    "10",
                    "20",
                    "15",
                    "5",
                    "30",
                    "7",
                    "40",
                    "50",
                ],  # string do konwersji
            }
        )
        self.lf = self.df.lazy()

    def test_aggregate_sum(self):
        result = aggregate_data(
            self.lf, x_col="region", y_col="sprzedaz", aggregation="sum", sort_order="desc"
        )
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
        result = aggregate_data(
            self.lf, x_col="region", y_col="sprzedaz", aggregation="mean", sort_order="alpha"
        )
        records = {r["region"]: r["sprzedaz"] for r in result.to_dicts()}

        self.assertAlmostEqual(records["Północ"], 125.0)  # (100 + 150) / 2
        self.assertAlmostEqual(records["Południe"], 250.0)  # (200 + 300) / 2
        self.assertAlmostEqual(records["Wschód"], 60.0)  # (50 + 70) / 2

    def test_aggregate_count(self):
        result = aggregate_data(
            self.lf, x_col="region", y_col="sprzedaz", aggregation="count", sort_order="desc"
        )
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
        result = aggregate_data(
            self.lf, x_col="region", y_col="ilosc_tekst", aggregation="sum", sort_order="desc"
        )
        records = result.to_dicts()

        # Południe: 20 + 30 = 50
        self.assertEqual(records[0]["region"], "Południe")
        self.assertEqual(records[0]["ilosc_tekst"], 50.0)

    def test_limit(self):
        result = aggregate_data(
            self.lf, x_col="region", y_col="sprzedaz", aggregation="sum", sort_order="desc", limit=2
        )
        self.assertEqual(len(result), 2)

    def test_compute_summary(self):
        result = aggregate_data(self.lf, x_col="region", y_col="sprzedaz", aggregation="sum")
        summary = compute_summary(result, "sprzedaz")

        # Suma ze wszystkich 4 regionów: 500 + 400 + 250 + 120 = 1270
        self.assertEqual(summary["categories_count"], 4)
        self.assertEqual(summary["total_sum"], 1270.0)
        self.assertEqual(summary["min"], 120.0)
        self.assertEqual(summary["max"], 500.0)

    def test_apply_filters_operators(self):
        from app.services.charts.aggregation import apply_filters

        # Test eq
        f_eq = apply_filters(
            self.lf, [{"column": "region", "operator": "eq", "value": "Północ"}]
        ).collect()
        self.assertEqual(len(f_eq), 2)

        # Test neq (wiersz z None w trójwartościowej logice Polars nie spełnia != ani ==)
        f_neq = apply_filters(
            self.lf, [{"column": "region", "operator": "neq", "value": "Północ"}]
        ).collect()
        self.assertEqual(len(f_neq), 5)

        # Test gt z automatyczną konwersją string -> float
        f_gt = apply_filters(
            self.lf, [{"column": "sprzedaz", "operator": "gt", "value": "250"}]
        ).collect()
        self.assertEqual(len(f_gt), 3)  # 300, 400, 500

        # Test gte i lte
        f_range = apply_filters(
            self.lf,
            [
                {"column": "sprzedaz", "operator": "gte", "value": 100},
                {"column": "sprzedaz", "operator": "lte", "value": 200},
            ],
        ).collect()
        self.assertEqual(len(f_range), 3)  # 100, 200, 150

        # Test contains
        f_contains = apply_filters(
            self.lf, [{"column": "region", "operator": "contains", "value": "ód"}]
        ).collect()
        # 'Wschód' x2, 'Zachód' x1 = 3 wiersze
        self.assertEqual(len(f_contains), 3)

        # Test in / not_in
        f_in = apply_filters(
            self.lf, [{"column": "region", "operator": "in", "value": ["Zachód", "Wschód"]}]
        ).collect()
        self.assertEqual(len(f_in), 3)

        f_not_in = apply_filters(
            self.lf, [{"column": "region", "operator": "not_in", "value": ["Zachód", "Wschód"]}]
        ).collect()
        self.assertEqual(len(f_not_in), 4)

        # Test is_null i not_null
        f_null = apply_filters(self.lf, [{"column": "region", "operator": "is_null"}]).collect()
        self.assertEqual(len(f_null), 1)

        f_not_null = apply_filters(
            self.lf, [{"column": "region", "operator": "not_null"}]
        ).collect()
        self.assertEqual(len(f_not_null), 7)

    def test_aggregate_with_filters(self):
        # Filtrujemy tylko sprzedaż > 100, a następnie sumujemy po regionach
        res = aggregate_data(
            self.lf,
            x_col="region",
            y_col="sprzedaz",
            aggregation="sum",
            sort_order="desc",
            filters=[{"column": "sprzedaz", "operator": "gt", "value": 100}],
        )
        records = res.to_dicts()
        # Odrzucone: Północ (100), Wschód (50, 70), wiersz z None w regionie
        # Zostają: Zachód (400), Południe (200 + 300 = 500), Północ (150)
        reg_map = {r["region"]: r["sprzedaz"] for r in records}
        self.assertEqual(reg_map["Południe"], 500.0)
        self.assertEqual(reg_map["Zachód"], 400.0)
        self.assertEqual(reg_map["Północ"], 150.0)
        self.assertNotIn("Wschód", reg_map)

    def test_aggregate_raw_points(self):
        # Test pobierania surowych punktów (np. do wykresu scatter bez agregacji)
        res = aggregate_data(
            self.lf,
            x_col="region",
            y_col="sprzedaz",
            aggregation="none",
            sort_order="desc",
            limit=3,
        )
        self.assertEqual(len(res), 3)
        self.assertEqual(res["sprzedaz"][0], 400.0)  # najwyższa wartość bez None w region


if __name__ == "__main__":
    unittest.main()
