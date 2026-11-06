import asyncio
import logging
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


async def execute_code_in_sandbox(
    code: str,
    timeout: float | None = None,
    memory_limit: str | None = None,
    cpu_limit: str | None = None,
) -> SandboxResult:
    """
    Uruchamia podany kod Pythona w izolowanym kontenerze Docker z twardymi limitami.

    - Strumień wejściowy stdin przekazuje kod bezpośrednio do interpretera python3.
    - Wymusza brak dostępu do sieci (--network none).
    - Wymusza usunięcie kontenera po zakończeniu (--rm).
    - W razie przekroczenia czasu (timeout) natychmiast ubija kontener i proces potomny.
    """
    settings = get_settings()
    timeout = timeout if timeout is not None else settings.sandbox_timeout_seconds
    memory = memory_limit or settings.sandbox_memory_limit
    cpus = cpu_limit or settings.sandbox_cpu_limit
    image = settings.sandbox_image

    # Unikalna nazwa kontenera umożliwia precyzyjne zabicie go w razie timeoutu
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
        image,
        "python3",
        "-",
    ]

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
            proc.communicate(input=code.encode("utf-8")),
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

        # Ubicie procesu potomnego w systemie
        if proc:
            try:
                proc.kill()
            except Exception:
                pass

        # Gwarancja ubicia kontenera w silniku Dockera
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
