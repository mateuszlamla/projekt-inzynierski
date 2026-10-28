from fastapi import APIRouter, Depends, File, UploadFile

from app.dependencies import get_registry
from app.services.datasets.registry import DatasetRegistry

router = APIRouter(tags=["datasets"])


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    registry: DatasetRegistry = Depends(get_registry),
):
    manager = registry.load(file.filename, await file.read())
    return {
        "status": "success",
        "file_id": manager.file_id,
        "columns": list(manager.columns.keys()),
        "column_types": manager.columns,
        "rows_count": manager.rows_count,
    }


@router.get("/data/view")
def view_data(
    file_id: str,
    offset: int = 0,
    limit: int = 50,
    registry: DatasetRegistry = Depends(get_registry),
):
    return registry.get(file_id).get_preview(offset=offset, limit=limit)


@router.get("/data/profile")
def profile_data(file_id: str, registry: DatasetRegistry = Depends(get_registry)):
    return registry.get(file_id).get_profile()
