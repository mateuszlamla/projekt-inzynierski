import polars as pl

from app.exceptions import InvalidRequestError
from app.schemas.charts import BarChartRequest
from app.services.charts.aggregation import AGGREGATION_LABELS, aggregate_data, compute_summary
from app.services.charts.code_generation import generate_bar_code_polars
from app.services.charts.rendering import render_bar_png


def _label(value: str | None, default: str) -> str:
    return value.strip() if value and value.strip() else default


def build_bar_chart(lf: pl.LazyFrame, req: BarChartRequest) -> dict:
    """
    Wykres słupkowy jako PNG razem z odpowiadającym mu kodem Polars + Matplotlib
    i podsumowaniem zagregowanych wartości.
    """
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
    if len(df_agg) == 0:
        raise InvalidRequestError("Brak danych po agregacji")

    cats = [str(c) for c in df_agg[req.x_col].to_list()]
    vals = [float(v) if v is not None else 0.0 for v in df_agg[req.y_col].to_list()]
    agg_name = AGGREGATION_LABELS.get(req.aggregation, "Wartość")

    title = _label(req.title, f"{agg_name} {req.y_col} wg {req.x_col}")
    x_label = _label(req.x_label, req.x_col)
    y_label = _label(req.y_label, f"{agg_name} {req.y_col}")

    return {
        "image": render_bar_png(cats, vals, req, title, x_label, y_label),
        "code": generate_bar_code_polars(
            file_id=req.file_id,
            x_col=req.x_col,
            y_col=req.y_col,
            aggregation=req.aggregation,
            sort_order=req.sort_order,
            limit=req.limit,
            orientation=req.orientation,
            color=req.color,
            rotation=req.rotation,
            show_grid=req.show_grid,
            title=title,
            x_label=req.x_label,
            y_label=req.y_label,
        ),
        "summary": compute_summary(df_agg, req.y_col),
    }
