import asyncio
import logging
import os
import time
import uuid
from dataclasses import dataclass

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class SandboxResult:
    """Wynik wykonania kodu w kontenerze Sandboxa."""

    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool
    execution_time_ms: int


def _prepare_script(code: str, has_dataset: bool) -> str:
    """
    Wstrzykuje środowisko startowe (prelude) przed kodem użytkownika.
    Udostępnia wstępnie zaimportowane biblioteki oraz zmienną `df` (DoD Task 2.3).
    """
    if has_dataset:
        prelude = (
            "import polars as pl\n"
            "import numpy as np\n"
            "try:\n"
            '    df = pl.read_parquet("/data/dataset.parquet")\n'
            "except Exception as _e:\n"
            "    import sys\n"
            '    print(f"Błąd ładowania ramki danych: {_e}", file=sys.stderr)\n'
            "    df = pl.DataFrame()\n"
            "# --- Kod użytkownika ---\n"
        )
    else:
        prelude = "import polars as pl\nimport numpy as np\ndf = None\n# --- Kod użytkownika ---\n"
    return prelude + code


async def execute_code_in_sandbox(
    code: str,
    dataset_path: str | None = None,
    timeout: float | None = None,
    memory_limit: str | None = None,
    cpu_limit: str | None = None,
) -> SandboxResult:
    """
    Uruchamia podany kod Pythona w izolowanym kontenerze Docker z twardymi limitami.

    - Jeśli podano dataset_path, plik Parquet jest montowany w trybie tylko do odczytu (:ro).
    - Montowany jest wolumen pamięci podręcznej tmpfs (/tmp).
    - Wstrzykiwana jest zmienna wstępna `df` gotowa do użycia w skrypcie.
    """
    settings = get_settings()
    timeout = timeout if timeout is not None else settings.sandbox_timeout_seconds
    memory = memory_limit or settings.sandbox_memory_limit
    cpus = cpu_limit or settings.sandbox_cpu_limit
    image = settings.sandbox_image

    container_name = f"sandbox_run_{uuid.uuid4().hex[:12]}"

    cmd = [
        "docker",
        "run",
        "--name",
        container_name,
        "--rm",
        "-i",
        f"--memory={memory}",
        f"--cpus={cpus}",
        "--network",
        "none",
        "--tmpfs",
        "/tmp:rw,size=256m",
    ]

    has_dataset = False
    if dataset_path:
        abs_path = os.path.abspath(dataset_path).replace("\\", "/")
        if not os.path.exists(abs_path):
            return SandboxResult(
                stdout="",
                stderr=f"Błąd: Plik zbioru danych nie istnieje pod ścieżką: {dataset_path}",
                exit_code=1,
                timed_out=False,
                execution_time_ms=0,
            )
        cmd.extend(["-v", f"{abs_path}:/data/dataset.parquet:ro"])
        has_dataset = True

    cmd.extend([image, "python3", "-"])

    script_to_run = _prepare_script(code, has_dataset=has_dataset)

    start_time = time.perf_counter()
    proc = None
    timed_out = False

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            proc.communicate(input=script_to_run.encode("utf-8")),
            timeout=timeout,
        )
        exit_code = proc.returncode or 0
        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")

    except TimeoutError:
        timed_out = True
        exit_code = -1
        stdout = ""
        stderr = f"Błąd: Przekroczono limit czasu wykonania skryptu ({timeout:.1f} s)."
        logger.warning("Sandbox execution timed out for container %s", container_name)

        if proc:
            try:
                proc.kill()
            except Exception:
                pass

        try:
            kill_proc = await asyncio.create_subprocess_exec(
                "docker",
                "rm",
                "-f",
                container_name,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await kill_proc.wait()
        except Exception as e:
            logger.error("Nie udało się wymusić usunięcia kontenera %s: %s", container_name, e)

    except FileNotFoundError:
        exit_code = 127
        stdout = ""
        stderr = "Błąd: Narzędzie Docker nie jest zainstalowane lub nie znajduje się w zmiennej środowiskowej PATH."  # noqa: E501
    except Exception as e:
        exit_code = 1
        stdout = ""
        stderr = f"Nieoczekiwany błąd środowiska Sandbox: {str(e)}"
    finally:
        execution_time_ms = int((time.perf_counter() - start_time) * 1000)

    return SandboxResult(
        stdout=stdout,
        stderr=stderr,
        exit_code=exit_code,
        timed_out=timed_out,
        execution_time_ms=execution_time_ms,
    )
