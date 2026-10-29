import time

import polars as pl

from app.schemas.charts import ChartDataRequest
from app.services.charts.aggregation import aggregate_data, compute_summary
from app.services.charts.downsampling import downsample_lttb
from app.services.charts.line_chart import AUTO_DOWNSAMPLE_POINTS

LINE_SERIES_TYPES = ("line", "area")


def _serialize_x(value):
    # Daty jako ISO 8601, wartości logiczne jako tekst, reszta bez zmian
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, bool):
        return str(value)
    return value


def _should_downsample(req: ChartDataRequest, points: int) -> bool:
    if req.downsample is not None:
        return req.downsample
    chart_type = (req.chart_type or "bar").lower()
    return chart_type in LINE_SERIES_TYPES and points > AUTO_DOWNSAMPLE_POINTS


def build_chart_data(lf: pl.LazyFrame, req: ChartDataRequest) -> dict:
    """
    Zagregowane lub surowe dane wykresu w JSON dla interaktywnego frontendu (Plotly.js).
    Wykresy liniowe z liczbą punktów > 5000 są automatycznie redukowane algorytmem LTTB.
    Format: { "x": [...], "y": [...], "meta": {...}, "summary": {...}, "rows_count": n }
    """
    start_time = time.perf_counter()
    filters = [f.model_dump() for f in req.filters] if req.filters else None

    df_agg = aggregate_data(
        lf=lf,
        x_col=req.x_col,
        y_col=req.y_col,
        aggregation=req.aggregation,
        sort_order=req.sort_order,
        limit=req.limit,
        filters=filters,
    )

    cats = [_serialize_x(v) for v in df_agg[req.x_col].to_list()]
    vals = [float(v) if v is not None else 0.0 for v in df_agg[req.y_col].to_list()]
    summary = compute_summary(df_agg, req.y_col)

    threshold = req.downsample_threshold or 1000
    downsampling_meta = {
        "downsampled": False,
        "algorithm": "none",
        "original_points": len(cats),
        "points_count": len(cats),
        "threshold": threshold,
    }
    if _should_downsample(req, len(cats)) and len(cats) > threshold:
        cats, vals, downsampling_meta = downsample_lttb(cats, vals, threshold=threshold)

    meta = {
        "file_id": req.file_id,
        "x_col": req.x_col,
        "y_col": req.y_col,
        "aggregation": req.aggregation,
        "chart_type": req.chart_type or "bar",
        "sort_order": req.sort_order,
        "limit": req.limit,
        "filters_applied": len(req.filters) if req.filters else 0,
        "returned_rows": len(cats),
        "summary": summary,
        "downsampling": downsampling_meta,
        "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 2),
    }

    return {"x": cats, "y": vals, "meta": meta, "summary": summary, "rows_count": len(cats)}
