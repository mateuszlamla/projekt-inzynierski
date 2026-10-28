from fastapi import APIRouter, Depends

from app.dependencies import get_registry
from app.schemas.analysis import DescriptiveStatsRequest, LinearRegressionRequest
from app.services.analysis.descriptive_stats import describe
from app.services.analysis.regression import linear_regression
from app.services.datasets.registry import DatasetRegistry

router = APIRouter(tags=["analysis"])


@router.post("/analysis/descriptive")
def descriptive_statistics(
    req: DescriptiveStatsRequest, registry: DatasetRegistry = Depends(get_registry)
):
    """
    Statystyki opisowe wybranych kolumn, liczone na danych po krokach czyszczenia z potoku.
    """
    lf = registry.get_lazy_frame(req.file_id)
    return {"status": "success", "file_id": req.file_id, **describe(lf, req.columns)}


@router.post("/ml/linear_regression")
def train_linear_regression(
    req: LinearRegressionRequest, registry: DatasetRegistry = Depends(get_registry)
):
    lf = registry.get_lazy_frame(req.file_id)
    return {"status": "success", **linear_regression(lf, req.x_col, req.y_col)}
