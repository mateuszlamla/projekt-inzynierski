"""
Kroki czyszczenia potoku danych. Każdy krok to słownik {"type": ..., "params": {...}}
zamieniany na operację na pl.LazyFrame.
"""

import polars as pl

TYPE_MAP = {
    "Int64": pl.Int64,
    "Float64": pl.Float64,
    "String": pl.String,
    "Boolean": pl.Boolean,
}


def apply_step(lf: pl.LazyFrame, step: dict) -> pl.LazyFrame:
    t = step["type"]
    p = step["params"]

    if t == "drop_nulls":
        return lf.drop_nulls(subset=p.get("columns"))
    if t == "fill_null":
        return lf.with_columns(pl.col(p["column"]).fill_null(p["value"]))
    if t == "drop_duplicates":
        return lf.unique(subset=p.get("columns"), keep="first")
    if t == "filter":
        return _apply_filter(lf, p)
    if t == "cast" and p["target_type"] in TYPE_MAP:
        return lf.with_columns(pl.col(p["column"]).cast(TYPE_MAP[p["target_type"]], strict=False))
    return lf


def _apply_filter(lf: pl.LazyFrame, p: dict) -> pl.LazyFrame:
    col, op, val = pl.col(p["column"]), p["operator"], p["value"]
    if op == "eq":
        return lf.filter(col == val)
    if op == "gt":
        return lf.filter(col > val)
    if op == "lt":
        return lf.filter(col < val)
    return lf
