import unittest
import numpy as np
import pandas as pd
from services.downsampling import lttb_indices, downsample_lttb
import main
from main import ChartDataRequest, get_chart_data


class TestLTTBDownsampling(unittest.TestCase):
    def test_lttb_preserves_endpoints(self):
        x = np.linspace(0, 100, 2000)
        y = np.sin(x)
        x_down, y_down, meta = downsample_lttb(x.tolist(), y.tolist(), threshold=500)

        self.assertTrue(meta["downsampled"])
        self.assertEqual(len(x_down), 500)
        self.assertEqual(len(y_down), 500)
        # Pierwszy i ostatni punkt muszą być identyczne
        self.assertEqual(x_down[0], x[0])
        self.assertEqual(y_down[0], y[0])
        self.assertEqual(x_down[-1], x[-1])
        self.assertEqual(y_down[-1], y[-1])

    def test_lttb_noop_when_smaller_than_threshold(self):
        x = [1, 2, 3, 4, 5]
        y = [10.0, 20.0, 15.0, 30.0, 25.0]
        x_down, y_down, meta = downsample_lttb(x, y, threshold=100)

        self.assertFalse(meta["downsampled"])
        self.assertEqual(x_down, x)
        self.assertEqual(y_down, y)
        self.assertEqual(meta["points_count"], 5)

    def test_lttb_preserves_critical_peaks_and_valleys(self):
        # Sygnał z 8000 punktów z wyraźnymi ekstremami (szpilkami)
        n = 8000
        x = np.linspace(0, 100, n)
        y = np.sin(x * 0.1)  # łagodna fala [-1, 1]

        # Wprowadzamy ekstremalne szpilki
        spike_max_idx = 2500
        spike_min_idx = 5500
        y[spike_max_idx] = 999.0
        y[spike_min_idx] = -888.0

        x_down, y_down, meta = downsample_lttb(x.tolist(), y.tolist(), threshold=1000)

        self.assertTrue(meta["downsampled"])
        self.assertEqual(len(y_down), 1000)
        # LTTB musi zachować wartości ekstremalne
        self.assertIn(999.0, y_down)
        self.assertIn(-888.0, y_down)

    def test_lttb_non_numeric_and_date_x_axis(self):
        # Test z etykietami tekstowymi na osi X
        x_str = [f"T_{i}" for i in range(3000)]
        y_val = [float(i % 100) for i in range(3000)]
        y_val[1500] = 500.0

        x_down, y_down, meta = downsample_lttb(x_str, y_val, threshold=300)
        self.assertEqual(len(x_down), 300)
        self.assertEqual(len(y_down), 300)
        self.assertEqual(x_down[0], "T_0")
        self.assertEqual(x_down[-1], "T_2999")
        self.assertIn(500.0, y_down)

    def test_lttb_performance_100k(self):
        # Benchmark wydajnościowy dla 100 000 punktów
        x = np.linspace(0, 1000, 100000).tolist()
        y = np.sin(np.linspace(0, 50, 100000)).tolist()

        x_down, y_down, meta = downsample_lttb(x, y, threshold=1000)
        self.assertEqual(len(x_down), 1000)
        self.assertTrue(meta["downsampled"])
        # Wymóg wydajnościowy: czas poniżej 150 ms
        self.assertLess(meta["execution_time_ms"], 150.0)

    def test_chart_data_endpoint_auto_downsample(self):
        # Zbiór danych z 6000 wierszy (> 5000 punktów)
        n = 6000
        df_large = pd.DataFrame({
            "timestamp": [f"2024-01-01 {i:04d}" for i in range(n)],
            "wartosc": np.random.randn(n) * 10
        })
        test_file_id = "test_large_timeseries.csv"
        main.data_store[test_file_id] = df_large

        # 1. Wykres liniowy: powinien nastąpić automatyczny downsampling do 1000 punktów
        req_line = ChartDataRequest(
            file_id=test_file_id,
            x_col="timestamp",
            y_col="wartosc",
            aggregation="none",
            chart_type="line",
            downsample=None  # auto
        )
        res_line = get_chart_data(req_line)

        self.assertEqual(res_line["status"], "success")
        self.assertEqual(len(res_line["x"]), 1000)
        self.assertEqual(len(res_line["y"]), 1000)
        self.assertTrue(res_line["meta"]["downsampling"]["downsampled"])
        self.assertEqual(res_line["meta"]["downsampling"]["original_points"], 6000)
        self.assertEqual(res_line["meta"]["downsampling"]["points_count"], 1000)

        # 2. Wykres słupkowy z tą samą liczbą punktów: domyślnie NIE powinien być downsamplowany
        req_bar = ChartDataRequest(
            file_id=test_file_id,
            x_col="timestamp",
            y_col="wartosc",
            aggregation="none",
            chart_type="bar",
            downsample=None  # auto
        )
        res_bar = get_chart_data(req_bar)
        self.assertEqual(res_bar["status"], "success")
        self.assertEqual(len(res_bar["x"]), 6000)
        self.assertFalse(res_bar["meta"]["downsampling"]["downsampled"])

        # 3. Wymuszony brak downsamplingu dla liniowego (downsample=False)
        req_no_down = ChartDataRequest(
            file_id=test_file_id,
            x_col="timestamp",
            y_col="wartosc",
            aggregation="none",
            chart_type="line",
            downsample=False
        )
        res_no_down = get_chart_data(req_no_down)
        self.assertEqual(len(res_no_down["x"]), 6000)
        self.assertFalse(res_no_down["meta"]["downsampling"]["downsampled"])

        # 4. Wymuszony downsampling z niestandardowym progiem (downsample_threshold=350)
        req_custom = ChartDataRequest(
            file_id=test_file_id,
            x_col="timestamp",
            y_col="wartosc",
            aggregation="none",
            chart_type="line",
            downsample=True,
            downsample_threshold=350
        )
        res_custom = get_chart_data(req_custom)
        self.assertEqual(len(res_custom["x"]), 350)
        self.assertTrue(res_custom["meta"]["downsampling"]["downsampled"])


if __name__ == "__main__":
    unittest.main()
