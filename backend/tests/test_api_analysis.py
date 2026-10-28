import pytest


def test_descriptive_returns_stats_for_all_columns(client, upload):
    upload()
    res = client.post("/analysis/descriptive", json={"file_id": "sprzedaz.csv"})
    body = res.json()

    assert res.status_code == 200
    assert body["status"] == "success"
    assert body["file_id"] == "sprzedaz.csv"
    assert body["rows_count"] == 4
    sprzedaz = next(e for e in body["numeric"] if e["column"] == "sprzedaz")
    assert sprzedaz["missing"] == 1
    assert sprzedaz["mean"] == pytest.approx(200.0)
    region = next(e for e in body["categorical"] if e["column"] == "region")
    assert region["top_values"][0] == {"value": "Kraków", "count": 2}


def test_descriptive_uses_data_after_cleaning_steps(client, upload):
    upload()
    client.post(
        "/data/pipeline/add",
        json={
            "file_id": "sprzedaz.csv",
            "step_type": "drop_nulls",
            "params": {"columns": ["sprzedaz"]},
        },
    )
    body = client.post("/analysis/descriptive", json={"file_id": "sprzedaz.csv"}).json()

    assert body["rows_count"] == 3
    assert next(e for e in body["numeric"] if e["column"] == "sprzedaz")["missing"] == 0


def test_descriptive_selected_columns(client, upload):
    upload()
    body = client.post(
        "/analysis/descriptive", json={"file_id": "sprzedaz.csv", "columns": ["region"]}
    ).json()

    assert body["numeric"] == []
    assert [e["column"] for e in body["categorical"]] == ["region"]


def test_linear_regression(client, upload):
    upload()
    body = client.post(
        "/ml/linear_regression",
        json={"file_id": "sprzedaz.csv", "x_col": "ilosc", "y_col": "sprzedaz"},
    ).json()

    # Wiersz z brakiem sprzedaży jest pomijany, pozostałe leżą na prostej sprzedaz = 10 * ilosc
    assert body["status"] == "success"
    assert body["slope"] == pytest.approx(10.0)
    assert body["intercept"] == pytest.approx(0.0, abs=1e-9)
    assert body["r2_score"] == pytest.approx(1.0)
    assert body["samples_count"] == 3
    assert len(body["image"]) > 100


def test_linear_regression_needs_numeric_data(client, upload):
    upload()
    res = client.post(
        "/ml/linear_regression",
        json={"file_id": "sprzedaz.csv", "x_col": "region", "y_col": "sprzedaz"},
    )

    assert res.status_code == 422
    assert res.json()["detail"] == "Za mało danych do regresji"


@pytest.mark.parametrize(
    ("url", "payload"),
    [
        ("/analysis/descriptive", {"file_id": "brak.csv"}),
        ("/ml/linear_regression", {"file_id": "brak.csv", "x_col": "a", "y_col": "b"}),
    ],
)
def test_unknown_file_returns_404(client, url, payload):
    res = client.post(url, json=payload)

    assert res.status_code == 404
    assert "brak.csv" in res.json()["detail"]


@pytest.mark.parametrize(
    ("url", "payload"),
    [
        ("/analysis/descriptive", {"file_id": "sprzedaz.csv", "columns": ["nie_ma"]}),
        (
            "/ml/linear_regression",
            {"file_id": "sprzedaz.csv", "x_col": "nie_ma", "y_col": "sprzedaz"},
        ),
    ],
)
def test_unknown_column_returns_422(client, upload, url, payload):
    upload()
    res = client.post(url, json=payload)

    assert res.status_code == 422
    assert "nie_ma" in res.json()["detail"]
