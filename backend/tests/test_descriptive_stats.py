import json
import math
import unittest

import polars as pl

from services.descriptive_stats import describe


class TestDescriptiveStats(unittest.TestCase):
    def setUp(self):
        # Zbiór z brakami (None), NaN, kolumną logiczną i kolumną bez żadnych wartości
        self.lf = pl.DataFrame({
            "wiek": [20, 30, 40, 50, None],
            "wynik": [1.5, float("nan"), 2.5, 3.5, 4.5],
            "miasto": ["Kraków", "Warszawa", "Kraków", None, "Gdańsk"],
            "aktywny": [True, False, True, True, None],
            "puste": pl.Series([None] * 5, dtype=pl.Float64),
        }).lazy()

    def _numeric(self, result, column):
        return next(e for e in result["numeric"] if e["column"] == column)

    def _categorical(self, result, column):
        return next(e for e in result["categorical"] if e["column"] == column)

    def test_column_classification(self):
        result = describe(self.lf)

        self.assertEqual(result["analysis"], "descriptive")
        self.assertEqual(result["rows_count"], 5)
        self.assertEqual([e["column"] for e in result["numeric"]], ["wiek", "wynik", "puste"])
        self.assertEqual([e["column"] for e in result["categorical"]], ["miasto", "aktywny"])

    def test_numeric_stats(self):
        stats = self._numeric(describe(self.lf), "wiek")

        # Wartości bez braku: 20, 30, 40, 50
        self.assertEqual(stats["count"], 4)
        self.assertEqual(stats["missing"], 1)
        self.assertAlmostEqual(stats["mean"], 35.0)
        self.assertAlmostEqual(stats["median"], 35.0)
        self.assertAlmostEqual(stats["std"], math.sqrt(500 / 3))  # odchylenie z próby (ddof=1)
        self.assertEqual(stats["min"], 20)
        self.assertEqual(stats["max"], 50)
        # Kwartyle z interpolacją liniową, tak samo jak w pandas i numpy
        self.assertAlmostEqual(stats["q1"], 27.5)
        self.assertAlmostEqual(stats["q3"], 42.5)

    def test_nan_counted_as_missing(self):
        stats = self._numeric(describe(self.lf), "wynik")

        self.assertEqual(stats["count"], 4)
        self.assertEqual(stats["missing"], 1)
        self.assertAlmostEqual(stats["mean"], 3.0)

    def test_categorical_stats(self):
        stats = self._categorical(describe(self.lf), "miasto")

        self.assertEqual(stats["count"], 4)
        self.assertEqual(stats["missing"], 1)
        self.assertEqual(stats["unique"], 3)  # null nie jest liczony jako wartość
        # Remisy sortowane alfabetycznie, żeby wynik był powtarzalny
        self.assertEqual(stats["top_values"], [
            {"value": "Kraków", "count": 2},
            {"value": "Gdańsk", "count": 1},
            {"value": "Warszawa", "count": 1},
        ])

    def test_boolean_column_is_categorical(self):
        stats = self._categorical(describe(self.lf), "aktywny")

        self.assertEqual(stats["unique"], 2)
        self.assertEqual(stats["top_values"][0], {"value": True, "count": 3})

    def test_all_null_column(self):
        stats = self._numeric(describe(self.lf), "puste")

        self.assertEqual(stats["count"], 0)
        self.assertEqual(stats["missing"], 5)
        for name in ["mean", "std", "min", "q1", "median", "q3", "max"]:
            self.assertIsNone(stats[name], name)

    def test_single_value_has_no_std(self):
        lf = pl.DataFrame({"x": [7.0]}).lazy()
        stats = self._numeric(describe(lf), "x")

        self.assertAlmostEqual(stats["mean"], 7.0)
        self.assertIsNone(stats["std"])

    def test_infinity_replaced_with_none(self):
        lf = pl.DataFrame({"x": [1.0, float("inf")]}).lazy()
        stats = self._numeric(describe(lf), "x")

        self.assertIsNone(stats["mean"])
        self.assertIsNone(stats["max"])
        self.assertEqual(stats["min"], 1.0)

    def test_selected_columns_keep_order_and_skip_duplicates(self):
        result = describe(self.lf, columns=["miasto", "wynik", "wiek", "wynik"])

        self.assertEqual([e["column"] for e in result["numeric"]], ["wynik", "wiek"])
        self.assertEqual([e["column"] for e in result["categorical"]], ["miasto"])

    def test_unknown_column_raises(self):
        with self.assertRaises(ValueError) as ctx:
            describe(self.lf, columns=["wiek", "nie_ma", "tez_nie"])

        self.assertIn("nie_ma", str(ctx.exception))
        self.assertIn("tez_nie", str(ctx.exception))

    def test_empty_dataset(self):
        lf = pl.DataFrame(schema={"liczba": pl.Int64, "tekst": pl.String}).lazy()
        result = describe(lf)

        self.assertEqual(result["rows_count"], 0)
        self.assertEqual(result["numeric"][0]["count"], 0)
        self.assertIsNone(result["numeric"][0]["mean"])
        self.assertEqual(result["categorical"][0]["unique"], 0)
        self.assertEqual(result["categorical"][0]["top_values"], [])

    def test_result_is_json_serializable(self):
        # allow_nan=False wyłapie każdy NaN lub inf, który przeszedłby do odpowiedzi API
        json.dumps(describe(self.lf), allow_nan=False)


if __name__ == "__main__":
    unittest.main()
