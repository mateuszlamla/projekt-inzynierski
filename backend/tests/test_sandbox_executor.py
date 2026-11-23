import polars as pl
import pytest

from app.services.sandbox.executor import execute_code_in_sandbox


@pytest.mark.anyio
async def test_sandbox_executes_simple_code():
    code = "import polars as pl\nprint('Hello Sandbox!')"
    result = await execute_code_in_sandbox(code, timeout=5.0)

    assert result.exit_code == 0
    assert not result.timed_out
    assert "Hello Sandbox!" in result.stdout
    assert result.stderr == ""
    assert result.execution_time_ms >= 0


@pytest.mark.anyio
async def test_sandbox_captures_exceptions():
    code = "x = 1 / 0"
    result = await execute_code_in_sandbox(code, timeout=5.0)

    assert result.exit_code != 0
    assert not result.timed_out
    assert "ZeroDivisionError" in result.stderr


@pytest.mark.anyio
async def test_sandbox_enforces_timeout():
    code = "import time\ntime.sleep(5)"
    result = await execute_code_in_sandbox(code, timeout=1.0)

    assert result.timed_out is True
    assert "Przekroczono limit czasu" in result.stderr


@pytest.mark.anyio
async def test_sandbox_injects_predefined_df(tmp_path):
    parquet_file = tmp_path / "test_data.parquet"
    df_sample = pl.DataFrame({"kategoria": ["A", "B", "C"], "wartosc": [10, 20, 30]})
    df_sample.write_parquet(parquet_file)

    # Kod użytkownika korzysta ze zmiennej `df` bez importu i wczytywania
    code = "print(df.shape)\nprint(df['wartosc'].sum())"
    result = await execute_code_in_sandbox(code, dataset_path=str(parquet_file), timeout=5.0)

    assert result.exit_code == 0
    assert not result.timed_out
    assert "(3, 2)" in result.stdout
    assert "60" in result.stdout


@pytest.mark.anyio
async def test_sandbox_read_only_protection(tmp_path):
    # Weryfikacja ochrony pliku źródłowego (:ro)
    parquet_file = tmp_path / "test_ro.parquet"
    pl.DataFrame({"x": [1]}).write_parquet(parquet_file)

    code = "with open('/data/dataset.parquet', 'w') as f: f.write('hack')"
    result = await execute_code_in_sandbox(code, dataset_path=str(parquet_file), timeout=5.0)

    assert result.exit_code != 0
    assert "Read-only file system" in result.stderr or "PermissionError" in result.stderr


@pytest.mark.anyio
async def test_sandbox_captures_plotly_chart():
    # Test automatycznego przechwycenia wykresu przez zmienną `fig`
    code = (
        "import plotly.graph_objects as go\n"
        "fig = go.Figure(data=[go.Bar(x=['A', 'B'], y=[10, 20])])\n"
        "print('Wykres utworzony!')"
    )
    result = await execute_code_in_sandbox(code, timeout=10.0)

    assert result.exit_code == 0
    assert "Wykres utworzony!" in result.stdout
    assert result.chart_data is not None
    assert "data" in result.chart_data
    assert result.chart_data["data"][0]["type"] == "bar"


@pytest.mark.anyio
async def test_sandbox_captures_explicit_chart_json():
    # Test bezpośredniego zapisu pliku chart.json przez użytkownika
    code = (
        "import json\n"
        "with open('/output/chart.json', 'w') as f:\n"
        "    json.dump({'custom_type': 'test_chart', 'value': 42}, f)\n"
    )
    result = await execute_code_in_sandbox(code, timeout=5.0)

    assert result.exit_code == 0
    assert result.chart_data == {"custom_type": "test_chart", "value": 42}


@pytest.mark.anyio
async def test_sandbox_no_chart_returns_none():
    code = "print('Zwykły tekst bez wykresu')"
    result = await execute_code_in_sandbox(code, timeout=5.0)

    assert result.exit_code == 0
    assert result.chart_data is None
