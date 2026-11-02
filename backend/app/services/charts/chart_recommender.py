from typing import Any

import polars as pl

from app.exceptions import InvalidRequestError


def _classify_type(dtype: pl.DataType) -> str:
    if dtype.is_temporal():
        return "temporal"
    elif dtype.is_numeric():
        return "numeric"
    elif dtype == pl.Boolean:
        return "boolean"
    else:
        return "categorical"


def _get_unique_count(lf: pl.LazyFrame, col: str) -> int:
    count = lf.select(pl.col(col).drop_nulls().n_unique()).collect().item()
    return count


def recommend_chart_types(lf: pl.LazyFrame, columns: list[str]) -> list[dict[str, Any]]:
    if columns is None or len(columns) == 0:
        raise InvalidRequestError("Należy wybrać co najmniej jedną kolumnę do rekomendacji.")

    schema = lf.collect_schema()

    missing_cols = [c for c in columns if c not in schema]
    if missing_cols:
        raise InvalidRequestError(f"Kolumna '{missing_cols[0]}' nie istnieje w zbiorze")

    unique_cols = list(dict.fromkeys(columns))

    recommendations = []

    def _add_rec(
        chart_type: str, score: float, default_agg: str, x: str, y: str | None, reason: str
    ):
        confidence = "high" if score >= 0.8 else ("medium" if score >= 0.6 else "low")
        recommendations.append(
            {
                "chart_type": chart_type,
                "score": score,
                "confidence": confidence,
                "default_aggregation": default_agg,
                "suggested_x": x,
                "suggested_y": y,
                "reason": reason,
            }
        )

    if len(unique_cols) == 1:
        col = unique_cols[0]
        col_type = _classify_type(schema[col])

        if col_type == "numeric":
            _add_rec(
                chart_type="histogram",
                score=0.95,
                default_agg="count",
                x=col,
                y=None,
                reason="Rozkład wartości pojedynczej zmiennej liczbowej",
            )
            _add_rec(
                chart_type="box",
                score=0.85,
                default_agg="none",
                x=col,
                y=None,
                reason="Wykres pudełkowy pokazujący medianę, kwartyle i wartości odstające.",
            )

        elif col_type in ["categorical", "boolean"]:
            k = _get_unique_count(lf, col)
            bar_score = max(0.70, round(0.98 - (k / 100.0) * 0.25, 2))
            _add_rec(
                chart_type="bar",
                score=bar_score,
                default_agg="count",
                x=col,
                y=None,
                reason=f"Rozkład liczności kategorii (liczba kategorii: {k})",
            )
            if k <= 7:
                pie_score = max(0.10, round(0.92 - 0.05 * max(0, k - 2), 2))
                _add_rec(
                    chart_type="pie",
                    score=pie_score,
                    default_agg="count",
                    x=col,
                    y=None,
                    reason=f"Udział kategorii w całości (liczba kategorii: {k})",
                )

    elif len(unique_cols) == 2:
        col_a, col_b = unique_cols[0], unique_cols[1]
        type_a, type_b = _classify_type(schema[col_a]), _classify_type(schema[col_b])

        if (type_a == "temporal" and type_b == "numeric") or (
            type_a == "numeric" and type_b == "temporal"
        ):
            x = col_a if type_a == "temporal" else col_b
            y = col_b if type_a == "temporal" else col_a
            _add_rec("line", 0.98, "sum", x, y, "Szereg czasowy przedstawiający trend w czasie")
            _add_rec("area", 0.85, "sum", x, y, "Wykres warstwowy skumulowanego trendu w czasie")
            _add_rec("bar", 0.70, "sum", x, y, "Wykres słupkowy w podziale na okresy")

        elif (type_a in ["categorical", "boolean"] and type_b == "numeric") or (
            type_a == "numeric" and type_b in ["categorical", "boolean"]
        ):
            x = col_a if type_a in ["categorical", "boolean"] else col_b
            y = col_b if type_a in ["categorical", "boolean"] else col_a
            k = _get_unique_count(lf, x)
            bar_score = max(0.70, round(0.98 - (k / 100.0) * 0.25, 2))
            _add_rec(
                "bar", bar_score, "sum", x, y, f"Porównanie wartości w kategoriach (kategorii: {k})"
            )
            if k <= 7:
                pie_score = max(0.10, round(0.92 - 0.05 * max(0, k - 2), 2))
                _add_rec(
                    "pie", pie_score, "sum", x, y, f"Udział kategorii w sumie (kategorii: {k})"
                )

        elif type_a == "numeric" and type_b == "numeric":
            _add_rec(
                "scatter",
                0.95,
                "none",
                col_a,
                col_b,
                "Wykres punktowy badający korelację między zmiennymi",
            )
            _add_rec(
                "line", 0.70, "none", col_a, col_b, "Wykres liniowy zależności dwóch zmiennych"
            )

        elif type_a in ["categorical", "boolean"] and type_b in ["categorical", "boolean"]:
            _add_rec(
                "heatmap",
                0.90,
                "count",
                col_a,
                col_b,
                "Mapa ciepła (tabela krzyżowa) częstości występowania par",
            )
            _add_rec("bar", 0.80, "count", col_a, col_b, "Wykres słupkowy liczności par kategorii")

    recommendations.sort(key=lambda r: r["score"], reverse=True)
    return recommendations
