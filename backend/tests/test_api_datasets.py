def test_upload_returns_columns_and_types(upload):
    body = upload()

    assert body["status"] == "success"
    assert body["file_id"] == "sprzedaz.csv"
    assert body["columns"] == ["region", "produkt", "sprzedaz", "ilosc"]
    assert body["column_types"]["sprzedaz"] == "Int64"
    assert body["rows_count"] == 4


def test_upload_rejects_unsupported_format(client):
    res = client.post("/upload-csv", files={"file": ("dane.txt", b"a,b\n1,2\n", "text/plain")})

    assert res.status_code == 422
    assert ".txt" in res.json()["detail"]


def test_view_returns_requested_page(client, upload):
    upload()
    body = client.get(
        "/data/view", params={"file_id": "sprzedaz.csv", "offset": 1, "limit": 2}
    ).json()

    assert body["total_rows"] == 4
    assert [row["region"] for row in body["data"]] == ["Warszawa", "Kraków"]


def test_profile_counts_nulls(client, upload):
    upload()
    body = client.get("/data/profile", params={"file_id": "sprzedaz.csv"}).json()

    assert body["sprzedaz"]["null_count"] == 1
    assert body["region"]["unique_count"] == 3


def test_pipeline_step_add_and_undo(client, upload):
    upload()
    added = client.post(
        "/data/pipeline/add",
        json={
            "file_id": "sprzedaz.csv",
            "step_type": "drop_nulls",
            "params": {"columns": ["sprzedaz"]},
        },
    ).json()

    assert added["total_rows"] == 3
    assert [s["type"] for s in added["steps"]] == ["drop_nulls"]

    undone = client.post("/data/pipeline/undo", params={"file_id": "sprzedaz.csv"}).json()

    assert undone["total_rows"] == 4
    assert undone["steps"] == []


def test_unknown_file_returns_404(client):
    responses = [
        client.get("/data/view", params={"file_id": "brak.csv"}),
        client.get("/data/profile", params={"file_id": "brak.csv"}),
        client.post(
            "/data/pipeline/add",
            json={"file_id": "brak.csv", "step_type": "drop_nulls", "params": {}},
        ),
        client.post("/data/pipeline/undo", params={"file_id": "brak.csv"}),
    ]

    for res in responses:
        assert res.status_code == 404
        assert "brak.csv" in res.json()["detail"]


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
