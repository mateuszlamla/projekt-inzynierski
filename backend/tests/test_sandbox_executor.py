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
    # Ustawiamy krótki timeout 1s, by sprawdzić ubicie kontenera
    result = await execute_code_in_sandbox(code, timeout=1.0)

    assert result.timed_out is True
    assert "Przekroczono limit czasu" in result.stderr