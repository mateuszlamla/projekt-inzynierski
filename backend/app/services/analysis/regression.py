import numpy as np
import polars as pl

from app.exceptions import InvalidRequestError
from app.services.charts.rendering import render_regression_png


def linear_regression(lf: pl.LazyFrame, x_col: str, y_col: str) -> dict:
    """
    Regresja liniowa y = a * x + b metodą najmniejszych kwadratów.
    Wartości nieliczbowe i braki są pomijane.
    """
    schema = lf.collect_schema()
    missing = [c for c in (x_col, y_col) if c not in schema]
    if missing:
        raise InvalidRequestError(f"Kolumny nie istnieją w zbiorze danych: {', '.join(missing)}")

    subset = (
        lf.select([pl.col(c).cast(pl.Float64, strict=False).fill_nan(None) for c in (x_col, y_col)])
        .drop_nulls()
        .collect()
    )
    if len(subset) < 2:
        raise InvalidRequestError("Za mało danych do regresji")

    x = subset[x_col].to_numpy()
    y = subset[y_col].to_numpy()

    # Dopasowanie w NumPy (bez scikit-learn i SciPy, które blokuje AppLocker/WDAC na części maszyn)
    slope, intercept = (float(p) for p in np.polyfit(x, y, 1))
    y_pred = slope * x + intercept

    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = float(1 - (ss_res / ss_tot)) if ss_tot != 0 else 0.0

    return {
        "image": render_regression_png(x, y, y_pred, x_col, y_col, r2),
        "slope": slope,
        "intercept": intercept,
        "r2_score": r2,
        "formula": f"{y_col} = {slope:.2f} * {x_col} + {intercept:.2f}",
        "samples_count": len(subset),
    }
