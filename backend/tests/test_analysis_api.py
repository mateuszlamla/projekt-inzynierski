import os
import shutil
import tempfile
import unittest

from fastapi.testclient import TestClient

import main

CSV = (
    "miasto,sprzedaz\n"
    "Kraków,100\n"
    "Warszawa,\n"
    "Kraków,300\n"
    "Gdańsk,200\n"
).encode("utf-8")


class TestDescriptiveStatsEndpoint(unittest.TestCase):
    def setUp(self):
        # DatasetManager zapisuje Parquet w ścieżce względnej storage/datasets,
        # więc każdy test pracuje w osobnym katalogu tymczasowym
        self._cwd = os.getcwd()
        self._tmp = tempfile.mkdtemp()
        os.chdir(self._tmp)
        main.dataset_managers.clear()
        main.data_store.clear()

        self.client = TestClient(main.app)
        res = self.client.post("/upload-csv", files={"file": ("sprzedaz.csv", CSV, "text/csv")})
        self.assertEqual(res.json()["status"], "success")

    def tearDown(self):
        os.chdir(self._cwd)
        shutil.rmtree(self._tmp, ignore_errors=True)

    def test_returns_stats_for_all_columns(self):
        res = self.client.post("/analysis/descriptive", json={"file_id": "sprzedaz.csv"})
        body = res.json()

        self.assertEqual(res.status_code, 200)
        self.assertEqual(body["status"], "success")
        self.assertEqual(body["file_id"], "sprzedaz.csv")
        self.assertEqual(body["rows_count"], 4)
        sprzedaz = body["numeric"][0]
        self.assertEqual(sprzedaz["column"], "sprzedaz")
        self.assertEqual(sprzedaz["missing"], 1)
        self.assertAlmostEqual(sprzedaz["mean"], 200.0)
        self.assertEqual(body["categorical"][0]["top_values"][0], {"value": "Kraków", "count": 2})

    def test_uses_data_after_cleaning_steps(self):
        self.client.post("/data/pipeline/add", json={
            "file_id": "sprzedaz.csv",
            "step_type": "drop_nulls",
            "params": {"columns": ["sprzedaz"]},
        })
        res = self.client.post("/analysis/descriptive", json={"file_id": "sprzedaz.csv"})
        body = res.json()

        self.assertEqual(body["rows_count"], 3)
        self.assertEqual(body["numeric"][0]["missing"], 0)

    def test_selected_columns(self):
        res = self.client.post("/analysis/descriptive", json={"file_id": "sprzedaz.csv", "columns": ["miasto"]})
        body = res.json()

        self.assertEqual(body["numeric"], [])
        self.assertEqual([e["column"] for e in body["categorical"]], ["miasto"])

    def test_unknown_file_returns_404(self):
        res = self.client.post("/analysis/descriptive", json={"file_id": "brak.csv"})

        self.assertEqual(res.status_code, 404)
        self.assertIn("brak.csv", res.json()["detail"])

    def test_unknown_column_returns_422(self):
        res = self.client.post("/analysis/descriptive", json={"file_id": "sprzedaz.csv", "columns": ["nie_ma"]})

        self.assertEqual(res.status_code, 422)
        self.assertIn("nie_ma", res.json()["detail"])


if __name__ == "__main__":
    unittest.main()
