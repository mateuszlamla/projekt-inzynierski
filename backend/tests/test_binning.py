from app.schemas.charts import ChartDataRequest
import unittest

import polars as pl
import numpy as np

from app.services.charts.chart_data import build_chart_data
from app.services.charts.binning import bin_2d

class TestBinning(unittest.TestCase):
    def test_bin_2d_reduces_points(self):
        x = np.random.randn(100_000)
        y = np.random.randn(100_000)
        sampled_x, sampled_y, counts, meta_info = bin_2d(x, y, n_bins=50)

        self.assertTrue(meta_info["binned"])
        self.assertLessEqual(len(sampled_x), 2500)
        self.assertEqual(sum(counts), 100000)

    def test_bin_2d_execution_time(self):
        x = np.random.randn(100_000)
        y = np.random.randn(100_000)
        sampled_x, sampled_y, counts, meta_info = bin_2d(x, y, n_bins=50)

        self.assertLess(meta_info["execution_time_ms"], 100)

    def test_bin_scatter_interation_in_chart_data(self):
        n = 15000
        df = pl.DataFrame({
            "waga": np.random.uniform(50, 100, n),
            "wzrost": np.random.uniform(150, 200, n),
        })
        lf = df.lazy()

        req_auto = ChartDataRequest(
            file_id="test.csv",
            x_col="waga",
            y_col="wzrost",
            aggregation="none",
            chart_type="scatter",
            bin_scatter=None,
            n_bins=40,
        )
        res_auto = build_chart_data(lf, req_auto)

        self.assertTrue(res_auto["meta"]["binning"]["binned"])
        self.assertLessEqual(len(res_auto["x"]), 40 * 40)
        self.assertIsNotNone(res_auto["counts"])
        self.assertEqual(res_auto["meta"]["binning"]["original_points"], 15000)

        req_disabled = ChartDataRequest(
            file_id="test.csv",
            x_col="waga",
            y_col="wzrost",
            aggregation="none",
            chart_type="scatter",
            bin_scatter=False,
        )
        res_disabled = build_chart_data(lf, req_disabled)

        self.assertFalse(res_disabled["meta"]["binning"]["binned"])
        self.assertEqual(len(res_disabled["x"]), 15000)
        self.assertIsNone(res_disabled["counts"])

    def test_bin_scatter_forced_on_small_dataset(self):
        n = 500
        df = pl.DataFrame({
            "x": np.random.uniform(0, 50, n),
            "y": np.random.uniform(0, 50, n),
        })
        lf = df.lazy()

        req_forced = ChartDataRequest(
            file_id="small.csv",
            x_col="x",
            y_col="y",
            aggregation="none",
            chart_type="scatter",
            bin_scatter=True,
            n_bins=10,
        )
        res = build_chart_data(lf, req_forced)

        self.assertTrue(res["meta"]["binning"]["binned"])
        self.assertLessEqual(len(res["x"]), 10 * 10)
        self.assertEqual(res["meta"]["binning"]["original_points"], 500)
        self.assertIsNotNone(res["counts"])
