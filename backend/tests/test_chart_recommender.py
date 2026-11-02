import unittest

import polars as pl

from app.exceptions import InvalidRequestError
from app.services.charts.chart_recommender import recommend_chart_types


class TestChartRecommender(unittest.TestCase):
    # TEST 1: Kryterium DoD - 5 kategorii + kolumna liczbowa -> 1. bar, 2. pie
    def test_recommends_bar_and_pie_for_low_cardinality(self):
        lf = pl.LazyFrame(
            {
                "kategoria": ["A", "B", "C", "D", "E"],
                "sprzedaz": [100.0, 200.0, 150.0, 300.0, 250.0],
            }
        )
        recs = recommend_chart_types(lf, ["kategoria", "sprzedaz"])

        self.assertGreaterEqual(len(recs), 2)
        self.assertEqual(recs[0]["chart_type"], "bar")
        self.assertEqual(recs[1]["chart_type"], "pie")
        self.assertEqual(recs[0]["suggested_x"], "kategoria")
        self.assertEqual(recs[0]["suggested_y"], "sprzedaz")
        self.assertEqual(recs[0]["default_aggregation"], "sum")

    # TEST 2: Duża kardynalność (> 7 kategorii) -> pie nie powinien być polecany
    def test_no_pie_for_high_cardinality(self):
        lf = pl.LazyFrame(
            {
                "miasto": [f"Miasto_{i}" for i in range(15)],
                "populacja": [1000 * i for i in range(15)],
            }
        )
        recs = recommend_chart_types(lf, ["miasto", "populacja"])
        chart_types = [r["chart_type"] for r in recs]

        self.assertIn("bar", chart_types)
        self.assertNotIn("pie", chart_types)

    # TEST 3: Szereg czasowy (Data + Liczba) -> 1. line, 2. area, 3. bar
    def test_recommends_line_for_temporal_and_numeric(self):
        lf = pl.LazyFrame(
            {
                "dzien": pl.date_range(pl.date(2024, 1, 1), pl.date(2024, 1, 5), eager=True),
                "kurs": [4.2, 4.3, 4.25, 4.35, 4.4],
            }
        )
        recs = recommend_chart_types(lf, ["dzien", "kurs"])

        self.assertEqual(recs[0]["chart_type"], "line")
        self.assertEqual(recs[1]["chart_type"], "area")
        self.assertEqual(recs[0]["suggested_x"], "dzien")

    # TEST 4: Dwie liczby -> 1. scatter (korelacja), 2. line
    def test_recommends_scatter_for_two_numerics(self):
        lf = pl.LazyFrame(
            {
                "wzrost": [170, 180, 175, 190],
                "waga": [65, 80, 72, 90],
            }
        )
        recs = recommend_chart_types(lf, ["wzrost", "waga"])

        self.assertEqual(recs[0]["chart_type"], "scatter")
        self.assertEqual(recs[0]["default_aggregation"], "none")

    # TEST 5: Dwie kategorie -> 1. heatmap, 2. bar
    def test_recommends_heatmap_for_two_categoricals(self):
        lf = pl.LazyFrame(
            {
                "kraj": ["PL", "PL", "DE", "FR"],
                "status": ["Aktywny", "Nowy", "Aktywny", "Wygasly"],
            }
        )
        recs = recommend_chart_types(lf, ["kraj", "status"])

        self.assertEqual(recs[0]["chart_type"], "heatmap")

    # TEST 6: Inteligentne odwracanie osi X i Y
    def test_smart_axis_assignment_regardless_of_input_order(self):
        lf = pl.LazyFrame(
            {
                "kwota": [10, 20],
                "region": ["Północ", "Południe"],
            }
        )
        recs = recommend_chart_types(lf, ["kwota", "region"])

        self.assertEqual(recs[0]["suggested_x"], "region")
        self.assertEqual(recs[0]["suggested_y"], "kwota")

    # TEST 7: Jedna kolumna (numeryczna -> histogram, kategoryczna -> bar)
    def test_single_column_recommendation(self):
        lf = pl.LazyFrame(
            {
                "wiek": [20, 25, 30, 35],
                "plec": ["K", "M", "K", "M"],
            }
        )
        recs_num = recommend_chart_types(lf, ["wiek"])
        self.assertEqual(recs_num[0]["chart_type"], "histogram")

        recs_cat = recommend_chart_types(lf, ["plec"])
        self.assertEqual(recs_cat[0]["chart_type"], "bar")

    # TEST 8: Obsługa błędów (InvalidRequestError)
    def test_invalid_requests_raise_error(self):
        lf = pl.LazyFrame({"a": [1, 2]})

        with self.assertRaises(InvalidRequestError):
            recommend_chart_types(lf, [])

        with self.assertRaises(InvalidRequestError):
            recommend_chart_types(lf, ["nieistniejaca_kolumna"])
