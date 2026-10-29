from fastapi import APIRouter, Depends

from app.dependencies import get_registry
from app.schemas.charts import BarChartRequest, ChartDataRequest
from app.services.charts.bar_chart import build_bar_chart
from app.services.charts.chart_data import build_chart_data
from app.services.charts.line_chart import build_line_chart
from app.services.datasets.registry import DatasetRegistry

router = APIRouter(tags=["charts"])


@router.post("/plot/bar")
def get_plot_bar(req: BarChartRequest, registry: DatasetRegistry = Depends(get_registry)):
    lf = registry.get_lazy_frame(req.file_id)
    return {"status": "success", **build_bar_chart(lf, req)}


@router.get("/plot/bar")
def get_plot_bar_legacy(
    file_id: str, x_col: str, y_col: str, registry: DatasetRegistry = Depends(get_registry)
):
    return get_plot_bar(BarChartRequest(file_id=file_id, x_col=x_col, y_col=y_col), registry)


@router.get("/plot/line")
def get_plot_line(
    file_id: str,
    x_col: str,
    y_col: str,
    downsample_threshold: int = 1000,
    registry: DatasetRegistry = Depends(get_registry),
):
    lf = registry.get_lazy_frame(file_id)
    return build_line_chart(lf, x_col, y_col, downsample_threshold)


@router.post("/api/chart/data")
def get_chart_data(req: ChartDataRequest, registry: DatasetRegistry = Depends(get_registry)):
    lf = registry.get_lazy_frame(req.file_id)
    return {"status": "success", **build_chart_data(lf, req)}
