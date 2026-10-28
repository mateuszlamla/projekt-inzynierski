import math
from decimal import Decimal
from typing import Any, Dict, List, Optional

import polars as pl

TOP_VALUES_LIMIT = 5

NUMERIC_STATS = ["count", "missing", "mean", "std", "min", "q1", "median", "q3", "max"]
CATEGORICAL_STATS = ["count", "missing", "unique"]


def _json_value(value: Any) -> Any:
    """
    Zamienia wartości, których nie da się zapisać w JSON (NaN, inf, Decimal), na bezpieczne odpowiedniki.
    """
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _numeric_exprs(idx: int, col: str, dtype: pl.DataType) -> List[pl.Expr]:
    # NaN w kolumnach zmiennoprzecinkowych traktujemy jak brak danych
    base = pl.col(col).fill_nan(None) if dtype.is_float() else pl.col(col)
    exprs = {
        "count": base.count(),
        "missing": base.null_count(),
        "mean": base.mean(),
        "std": base.std(),
        "min": base.min(),
        "q1": base.quantile(0.25, interpolation="linear"),
        "median": base.median(),
        "q3": base.quantile(0.75, interpolation="linear"),
        "max": base.max(),
    }
    return [expr.alias(f"{idx}:{name}") for name, expr in exprs.items()]


def _categorical_exprs(idx: int, col: str) -> List[pl.Expr]:
    base = pl.col(col)
    exprs = {
        "count": base.count(),
        "missing": base.null_count(),
        # n_unique() liczy null jako osobną wartość, więc najpierw go odrzucamy
        "unique": base.drop_nulls().n_unique(),
    }
    return [expr.alias(f"{idx}:{name}") for name, expr in exprs.items()]


def _top_values_query(lf: pl.LazyFrame, col: str) -> pl.LazyFrame:
    return (
        lf.select(col)
        .filter(pl.col(col).is_not_null())
        .group_by(col)
        .agg(pl.len().alias("count"))
        .sort(["count", col], descending=[True, False])
        .head(TOP_VALUES_LIMIT)
    )


def describe(lf: pl.LazyFrame, columns: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Oblicza statystyki opisowe dla wybranych kolumn (domyślnie wszystkich).

    Kolumny liczbowe: liczność, braki, średnia, odchylenie standardowe, min, kwartyle, mediana, max.
    Pozostałe kolumny (tekst, wartości logiczne, daty): liczność, braki, liczba unikalnych
    wartości i najczęstsze wartości.

    Wszystkie statystyki zbiorcze liczone są w jednym zapytaniu Polars, a najczęstsze
    wartości w zapytaniach uruchamianych równolegle przez collect_all.
    """
    schema = lf.collect_schema()

    if columns is None:
        columns = list(schema.names())
    else:
        columns = list(dict.fromkeys(columns))
        unknown = [c for c in columns if c not in schema]
        if unknown:
            raise ValueError(f"Kolumny nie istnieją w zbiorze danych: {', '.join(unknown)}")

    numeric_cols = [c for c in columns if schema[c].is_numeric()]
    categorical_cols = [c for c in columns if not schema[c].is_numeric()]

    exprs: List[pl.Expr] = [pl.len().alias("rows_count")]
    for idx, col in enumerate(columns):
        if col in numeric_cols:
            exprs.extend(_numeric_exprs(idx, col, schema[col]))
        else:
            exprs.extend(_categorical_exprs(idx, col))

    queries = [lf.select(exprs)] + [_top_values_query(lf, col) for col in categorical_cols]
    stats_df, *top_dfs = pl.collect_all(queries)
    stats = stats_df.row(0, named=True)
    top_values = dict(zip(categorical_cols, top_dfs))

    numeric: List[Dict[str, Any]] = []
    categorical: List[Dict[str, Any]] = []
    for idx, col in enumerate(columns):
        entry: Dict[str, Any] = {"column": col, "dtype": str(schema[col])}
        if col in numeric_cols:
            entry.update({name: _json_value(stats[f"{idx}:{name}"]) for name in NUMERIC_STATS})
            numeric.append(entry)
        else:
            entry.update({name: stats[f"{idx}:{name}"] for name in CATEGORICAL_STATS})
            entry["top_values"] = [
                {"value": _json_value(row[col]), "count": row["count"]}
                for row in top_values[col].to_dicts()
            ]
            categorical.append(entry)

    return {
        "analysis": "descriptive",
        "rows_count": stats["rows_count"],
        "numeric": numeric,
        "categorical": categorical,
    }
