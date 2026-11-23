import os

from fastapi import APIRouter, Depends

from app.dependencies import get_registry
from app.exceptions import DatasetNotFoundError
from app.schemas.sandbox import SandboxRunRequest, SandboxRunResponse
from app.services.datasets.registry import DatasetRegistry
from app.services.sandbox.executor import execute_code_in_sandbox

router = APIRouter(tags=["sandbox"])


@router.post("/api/sandbox/run", response_model=SandboxRunResponse)
async def run_sandobx_script(
    req: SandboxRunRequest,
    registry: DatasetRegistry = Depends(get_registry),
) -> SandboxRunResponse:
    dataset_path: str | None = None

    if req.file_id and req.file_id.strip():
        try:
            manager = registry.get(req.file_id)
            dataset_path = manager.parquet_path
        except DatasetNotFoundError:
            fallback = os.path.join(registry.storage_dir, f"{req.file_id}.parquet")
            if os.path.exists(fallback):
                dataset_path = fallback
            else:
                raise

    res = await execute_code_in_sandbox(
        code=req.code,
        dataset_path=dataset_path,
    )

    return SandboxRunResponse(
        stdout=res.stdout,
        stderr=res.stderr,
        chart_data=res.chart_data,
        execution_time_ms=res.execution_time_ms,
        exit_code=res.exit_code,
        timed_out=res.timed_out,
    )
