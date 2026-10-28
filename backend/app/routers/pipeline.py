from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.dependencies import get_registry
from app.schemas.datasets import AddStepRequest
from app.services.datasets.registry import DatasetRegistry

router = APIRouter(prefix="/data/pipeline", tags=["pipeline"])


@router.post("/add")
def add_pipeline_step(
    req: AddStepRequest,
    registry: DatasetRegistry = Depends(get_registry),
    settings: Settings = Depends(get_settings),
):
    manager = registry.get(req.file_id)
    manager.add_step(step_type=req.step_type, params=req.params)
    return manager.get_preview(offset=0, limit=settings.preview_limit)


@router.post("/undo")
def undo_pipeline_step(
    file_id: str,
    registry: DatasetRegistry = Depends(get_registry),
    settings: Settings = Depends(get_settings),
):
    manager = registry.get(file_id)
    manager.undo_last_step()
    return manager.get_preview(offset=0, limit=settings.preview_limit)
