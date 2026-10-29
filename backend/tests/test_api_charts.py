import numpy as np

AGGREGATION_CSV = (
    "region,sprzedaz\n"
    "Północ,100\n"
    "Południe,200\n"
    "Północ,150\n"
    "Wschód,50\n"
    "Południe,300\n"
    "Wschód,70\n"
    "Zachód,400\n"
    ",500\n"
).encode()


def _timeseries_csv(n: int = 6000) -> bytes:
    rng = np.random.default_rng(0)
    rows = "".join(f"2024-01-01 {i:04d},{v}\n" for i, v in enumerate(rng.normal(0, 10, n)))
    return ("timestamp,wartosc\n" + rows).encode("utf-8")


def test_bar_chart_returns_image_code_and_summary(client, upload):
    upload(AGGREGATION_CSV, "agg.csv")
    res = client.post(
        "/plot/bar",
        json={
            "file_id": "agg.csv",
            "x_col": "region",
            "y_col": "sprzedaz",
            "sort_order": "desc",
            "filters": [{"column": "sprzedaz", "operator": "gt", "value": 60}],
        },
    )
    body = res.json()

    assert res.status_code == 200
    assert body["status"] == "success"
    assert len(body["image"]) > 100
    assert "pl.scan_parquet" in body["code"]
    # Wiersz bez regionu odpada przy grupowaniu, Wschód zostaje dzięki wartości 70
    assert body["summary"]["categories_count"] == 4


def test_bar_chart_legacy_get(client, upload):
    upload(AGGREGATION_CSV, "agg.csv")
    res = client.get(
        "/plot/bar", params={"file_id": "agg.csv", "x_col": "region", "y_col": "sprzedaz"}
    )

    assert res.json()["status"] == "success"


def test_line_chart_returns_image(client, upload):
    upload(AGGREGATION_CSV, "agg.csv")
    res = client.get(
        "/plot/line", params={"file_id": "agg.csv", "x_col": "region", "y_col": "sprzedaz"}
    )

    assert len(res.json()["image"]) > 100


def test_chart_data_with_filters(client, upload):
    upload(AGGREGATION_CSV, "agg.csv")
    body = client.post(
        "/api/chart/data",
        json={
            "file_id": "agg.csv",
            "x_col": "region",
            "y_col": "sprzedaz",
            "sort_order": "desc",
            "filters": [{"column": "region", "operator": "in", "value": ["Południe", "Zachód"]}],
        },
    ).json()

    assert body["status"] == "success"
    assert body["x"] == ["Południe", "Zachód"]
    assert body["y"] == [500.0, 400.0]
    meta = body["meta"]
    assert meta["file_id"] == "agg.csv"
    assert meta["chart_type"] == "bar"
    assert meta["filters_applied"] == 1
    assert meta["returned_rows"] == 2
    assert meta["execution_time_ms"] >= 0
    assert body["summary"]["total_sum"] == 900.0


def test_chart_data_auto_downsamples_only_line_series(client, upload):
    upload(_timeseries_csv(), "ts.csv")
    base = {"file_id": "ts.csv", "x_col": "timestamp", "y_col": "wartosc", "aggregation": "none"}

    line = client.post("/api/chart/data", json={**base, "chart_type": "line"}).json()
    assert len(line["x"]) == 1000
    assert line["meta"]["downsampling"]["downsampled"] is True
    assert line["meta"]["downsampling"]["original_points"] == 6000

    bar = client.post("/api/chart/data", json={**base, "chart_type": "bar"}).json()
    assert len(bar["x"]) == 6000
    assert bar["meta"]["downsampling"]["downsampled"] is False


def test_chart_data_downsampling_can_be_forced_or_disabled(client, upload):
    upload(_timeseries_csv(), "ts.csv")
    base = {
        "file_id": "ts.csv",
        "x_col": "timestamp",
        "y_col": "wartosc",
        "aggregation": "none",
        "chart_type": "line",
    }

    disabled = client.post("/api/chart/data", json={**base, "downsample": False}).json()
    assert len(disabled["x"]) == 6000

    forced = client.post(
        "/api/chart/data", json={**base, "downsample": True, "downsample_threshold": 350}
    ).json()
    assert len(forced["x"]) == 350
    assert forced["meta"]["downsampling"]["downsampled"] is True


def test_unknown_file_returns_404(client):
    responses = [
        client.post("/plot/bar", json={"file_id": "brak.csv", "x_col": "a", "y_col": "b"}),
        client.get("/plot/line", params={"file_id": "brak.csv", "x_col": "a", "y_col": "b"}),
        client.post("/api/chart/data", json={"file_id": "brak.csv", "x_col": "a", "y_col": "b"}),
    ]

    for res in responses:
        assert res.status_code == 404
        assert "brak.csv" in res.json()["detail"]


def test_unknown_column_returns_422(client, upload):
    upload(AGGREGATION_CSV, "agg.csv")
    res = client.post(
        "/api/chart/data", json={"file_id": "agg.csv", "x_col": "nie_ma", "y_col": "sprzedaz"}
    )

    assert res.status_code == 422
    assert "nie_ma" in res.json()["detail"]
