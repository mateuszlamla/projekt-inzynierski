def test_sandbox_run_endpoint_simple_script(client):
    res = client.post(
        "/api/sandbox/run",
        json={"code": "print('Test z endpointu API!')"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "Test z endpointu API!" in body["stdout"]
    assert body["stderr"] == ""
    assert body["exit_code"] == 0
    assert body["execution_time_ms"] >= 0


def test_sandbox_run_endpoint_with_uploaded_dataset(client, upload):
    csv_data = b"kol1,kol2\n10,20\n30,40\n"
    upload(csv_data, "test_api_data.csv")

    res = client.post(
        "/api/sandbox/run",
        json={
            "code": "print(df.shape)\nprint(df['kol1'].sum())",
            "file_id": "test_api_data.csv",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "(2, 2)" in body["stdout"]
    assert "40" in body["stdout"]
    assert body["exit_code"] == 0


def test_sandbox_run_endpoint_returns_chart_data(client):
    code = (
        "import plotly.graph_objects as go\n"
        "fig = go.Figure(data=[go.Bar(x=['X', 'Y'], y=[100, 200])])\n"
        "print('Wykres gotowy')"
    )
    res = client.post(
        "/api/sandbox/run",
        json={"code": code},
    )
    assert res.status_code == 200
    body = res.json()
    assert "Wykres gotowy" in body["stdout"]
    assert body["chart_data"] is not None
    assert body["chart_data"]["data"][0]["type"] == "bar"


def test_sandbox_run_endpoint_not_found_file(client):
    res = client.post(
        "/api/sandbox/run",
        json={"code": "print(1)", "file_id": "nie_istnieje.csv"},
    )
    assert res.status_code == 404
