import polars as pl

from app.exceptions import InvalidRequestError
from app.services.charts.aggregation import aggregate_data
from app.services.charts.downsampling import downsample_lttb
from app.services.charts.rendering import render_line_png

# Powyżej tej liczby punktów wykres liniowy jest automatycznie redukowany algorytmem LTTB
AUTO_DOWNSAMPLE_POINTS = 5000


def build_line_chart(
    lf: pl.LazyFrame, x_col: str, y_col: str, downsample_threshold: int = 1000
) -> dict:
    df_agg = aggregate_data(lf, x_col=x_col, y_col=y_col, aggregation="sum", sort_order="alpha")
    if len(df_agg) == 0:
        raise InvalidRequestError("Brak danych po agregacji")

    cats = [str(c) for c in df_agg[x_col].to_list()]
    vals = [float(v) if v is not None else 0.0 for v in df_agg[y_col].to_list()]

    if len(cats) > AUTO_DOWNSAMPLE_POINTS:
        cats, vals, _ = downsample_lttb(cats, vals, threshold=downsample_threshold)

    return {"image": render_line_png(cats, vals, x_col, y_col)}
