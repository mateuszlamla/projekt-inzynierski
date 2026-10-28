from typing import Any

import polars as pl

from app.exceptions import InvalidRequestError

AGGREGATION_LABELS = {
    "sum": "Suma",
    "mean": "Średnia",
    "count": "Liczność",
    "min": "Minimum",
    "max": "Maksimum",
    "median": "Mediana",
}


def apply_filters(
    lf: pl.LazyFrame,
    filters: list[dict[str, Any]] | None = None,
) -> pl.LazyFrame:
    """
    Aplikuje listę filtrów na pl.LazyFrame.
    Obsługiwane operatory:
      - 'eq', '==': równe
      - 'neq', '!=': różne
      - 'gt', '>': większe niż
      - 'gte', '>=': większe bądź równe
      - 'lt', '<': mniejsze niż
      - 'lte', '<=': mniejsze bądź równe
      - 'contains', 'like': zawiera podciąg (tekst)
      - 'in': znajduje się na liście wartości
      - 'not_in': nie znajduje się na liście wartości
      - 'is_null', 'null': wartość pusta
      - 'not_null': wartość niepusta
    """
    if not filters:
        return lf

    schema = lf.collect_schema()

    for f in filters:
        if hasattr(f, "model_dump"):
            f_data = f.model_dump()
        elif hasattr(f, "dict"):
            f_data = f.dict()
        elif isinstance(f, dict):
            f_data = f
        else:
            continue

        col_name = f_data.get("column")
        op = str(f_data.get("operator", "eq")).lower()
        val = f_data.get("value")

        if not col_name or col_name not in schema:
            continue

        dtype = schema[col_name]
        col_expr = pl.col(col_name)

        # Bezpieczna konwersja typów dla porównań numerycznych
        if (
            dtype.is_numeric()
            and val is not None
            and op not in ["in", "not_in", "is_null", "not_null", "contains", "like"]
        ):
            try:
                val = float(val) if "." in str(val) else int(val)
            except (ValueError, TypeError):
                pass

        if op in ["eq", "=="]:
            lf = lf.filter(col_expr == val)
        elif op in ["neq", "!="]:
            lf = lf.filter(col_expr != val)
        elif op in ["gt", ">"]:
            lf = lf.filter(col_expr > val)
        elif op in ["gte", ">="]:
            lf = lf.filter(col_expr >= val)
        elif op in ["lt", "<"]:
            lf = lf.filter(col_expr < val)
        elif op in ["lte", "<="]:
            lf = lf.filter(col_expr <= val)
        elif op in ["contains", "like"]:
            lf = lf.filter(col_expr.cast(pl.String).str.contains(str(val)))
        elif op == "in":
            val_list = val if isinstance(val, (list, tuple, set)) else [val]
            if dtype.is_numeric():
                clean_vals = []
                for v in val_list:
                    try:
                        clean_vals.append(float(v) if "." in str(v) else int(v))
                    except (ValueError, TypeError):
                        clean_vals.append(v)
                val_list = clean_vals
            lf = lf.filter(col_expr.is_in(val_list))
        elif op == "not_in":
            val_list = val if isinstance(val, (list, tuple, set)) else [val]
            if dtype.is_numeric():
                clean_vals = []
                for v in val_list:
                    try:
                        clean_vals.append(float(v) if "." in str(v) else int(v))
                    except (ValueError, TypeError):
                        clean_vals.append(v)
                val_list = clean_vals
            lf = lf.filter(~col_expr.is_in(val_list))
        elif op in ["is_null", "null"]:
            lf = lf.filter(col_expr.is_null())
        elif op == "not_null":
            lf = lf.filter(col_expr.is_not_null())

    return lf


def aggregate_data(
    lf: pl.LazyFrame,
    x_col: str,
    y_col: str,
    aggregation: str = "sum",
    sort_order: str = "none",
    limit: int | None = None,
    filters: list[dict[str, Any]] | None = None,
) -> pl.DataFrame:
    """
    Wykonuje filtrowanie, grupowanie i agregację danych w silniku Polars przy użyciu LazyFrame.

    :param lf: pl.LazyFrame wejściowy
    :param x_col: Kolumna kategoryczna / grupująca (Oś X)
    :param y_col: Kolumna wartościowana (Oś Y)
    :param aggregation: Typ agregacji
        ('sum', 'mean', 'count', 'min', 'max', 'median', 'none', 'raw')
    :param sort_order: Kolejność sortowania ('none', 'desc', 'asc', 'alpha')
    :param limit: Opcjonalne ograniczenie liczby zwracanych kategorii (np. top 10)
    :param filters: Opcjonalna lista filtrów do nałożenia przed agregacją
    :return: pl.DataFrame z wynikami agregacji lub surowymi punktami
    """
    schema = lf.collect_schema()
    if x_col not in schema:
        raise InvalidRequestError(f"Kolumna grupująca '{x_col}' nie istnieje w zbiorze.")
    if y_col not in schema:
        raise InvalidRequestError(f"Kolumna wartości '{y_col}' nie istnieje w zbiorze.")

    # 1. Zastosowanie filtrów przed przetwarzaniem
    if filters:
        lf = apply_filters(lf, filters)

    agg_norm = (aggregation or "sum").lower()

    # 2. Obsługa wykresów surowych (brak agregacji, np. scatter plot lub surowy szereg)
    if agg_norm in ["none", "raw"]:
        dtype = schema[y_col]
        if not dtype.is_numeric():
            lf = lf.with_columns(pl.col(y_col).cast(pl.Float64, strict=False))
        lf = lf.drop_nulls(subset=[x_col, y_col])

        if sort_order == "desc":
            lf = lf.sort(by=y_col, descending=True)
        elif sort_order == "asc":
            lf = lf.sort(by=y_col, descending=False)
        elif sort_order == "alpha":
            lf = lf.sort(by=x_col, descending=False)

        if limit and limit > 0:
            lf = lf.limit(limit)

        return lf.select([x_col, y_col]).collect()

    # 3. Przygotowanie kolumn i czyszczenie braków (nulls) pod agregację
    if agg_norm != "count":
        dtype = schema[y_col]
        if not dtype.is_numeric():
            lf = lf.with_columns(pl.col(y_col).cast(pl.Float64, strict=False))
        lf = lf.drop_nulls(subset=[x_col, y_col])
    else:
        lf = lf.drop_nulls(subset=[x_col])

    # 4. Definicja wyrażenia agregującego w Polars
    agg_expressions = {
        "sum": pl.col(y_col).sum().alias(y_col),
        "mean": pl.col(y_col).mean().alias(y_col),
        "count": pl.col(y_col).count().alias(y_col),
        "min": pl.col(y_col).min().alias(y_col),
        "max": pl.col(y_col).max().alias(y_col),
        "median": pl.col(y_col).median().alias(y_col),
    }

    agg_expr = agg_expressions.get(agg_norm, pl.col(y_col).sum().alias(y_col))

    # 5. Wykonanie operacji grupowania
    grouped_lf = lf.group_by(x_col).agg(agg_expr)

    # 6. Sortowanie
    if sort_order == "desc":
        grouped_lf = grouped_lf.sort(by=y_col, descending=True)
    elif sort_order == "asc":
        grouped_lf = grouped_lf.sort(by=y_col, descending=False)
    elif sort_order == "alpha":
        grouped_lf = grouped_lf.sort(by=x_col, descending=False)

    # 7. Ograniczenie liczby wierszy (limit)
    if limit and limit > 0:
        grouped_lf = grouped_lf.limit(limit)

    # 8. Zebranie wyników (wielowątkowe wykonanie przez silnik Polars)
    return grouped_lf.collect()


def compute_summary(df: pl.DataFrame, y_col: str) -> dict[str, Any]:
    """
    Oblicza podsumowanie statystyczne bezpośrednio w Polars bez narzutu Pandas.
    """
    if len(df) == 0:
        return {
            "categories_count": 0,
            "total_sum": 0.0,
            "mean": 0.0,
            "min": 0.0,
            "max": 0.0,
        }

    s = df[y_col]
    total_sum = s.sum()
    mean_val = s.mean()
    min_val = s.min()
    max_val = s.max()

    return {
        "categories_count": len(df),
        "total_sum": float(total_sum) if total_sum is not None else 0.0,
        "mean": float(mean_val) if mean_val is not None else 0.0,
        "min": float(min_val) if min_val is not None else 0.0,
        "max": float(max_val) if max_val is not None else 0.0,
    }
