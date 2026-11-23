from typing import Any

from pydantic import BaseModel


class SandboxRunRequest(BaseModel):
    code: str
    file_id: str | None = None


class SandboxRunResponse(BaseModel):
    stdout: str
    stderr: str
    chart_data: Any | None = None
    execution_time_ms: int
    exit_code: int = 0
    timed_out: bool = False
