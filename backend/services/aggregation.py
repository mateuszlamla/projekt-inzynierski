import os
from typing import Optional, Dict, Any, List
import polars as pl

AGGREGATION_LABELS = {
    "sum": "Suma",
    "mean": "Średnia",
    "count": "Liczność",
    "min": "Minimum",
    "max": "Maksimum",
    "median": "Mediana",
}


def get_lazy_frame_for_file(
    file_id: str,
    dataset_managers: dict,
    data_store: dict
) -> pl.LazyFrame:
    """
    Pobiera pl.LazyFrame dla danego identyfikatora pliku.
    Priorytet:
    1. DatasetManager (jeśli istnieje w pamięci podręcznej)
    2. Plik Parquet w katalogu storage/datasets/
    3. Fallback do data_store (Pandas -> Polars LazyFrame)
    """
    if file_id in dataset_managers:
        return dataset_managers[file_id].get_lazy_frame()

    parquet_candidate = f"storage/datasets/{file_id}.parquet"
    if os.path.exists(parquet_candidate):
        return pl.scan_parquet(parquet_candidate)

    if file_id in data_store:
        df_pandas = data_store[file_id]
        # Bezpieczna konwersja ze słownika w pamięci (omija brak biblioteki pyarrow)
        # Zamiana NaN na None zapobiega konfliktom typów przy tworzeniu kolumn Polars
        raw_dict = df_pandas.to_dict(orient="list")
        clean_dict = {
            col: [None if (isinstance(v, float) and v != v) else v for v in vals]
            for col, vals in raw_dict.items()
        }
        return pl.DataFrame(clean_dict, strict=False).lazy()

    raise FileNotFoundError(f"Plik '{file_id}' nie został znaleziony w pamięci ani w magazynie storage.")


def apply_filters(
    lf: pl.LazyFrame,
    filters: Optional[List[Dict[str, Any]]] = None,
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
        if dtype.is_numeric() and val is not None and op not in ["in", "not_in", "is_null", "not_null", "contains", "like"]:
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
    limit: Optional[int] = None,
    filters: Optional[List[Dict[str, Any]]] = None,
) -> pl.DataFrame:
    """
    Wykonuje filtrowanie, grupowanie i agregację danych w silniku Polars przy użyciu LazyFrame.

    :param lf: pl.LazyFrame wejściowy
    :param x_col: Kolumna kategoryczna / grupująca (Oś X)
    :param y_col: Kolumna wartościowana (Oś Y)
    :param aggregation: Typ agregacji ('sum', 'mean', 'count', 'min', 'max', 'median', 'none', 'raw')
    :param sort_order: Kolejność sortowania ('none', 'desc', 'asc', 'alpha')
    :param limit: Opcjonalne ograniczenie liczby zwracanych kategorii (np. top 10)
    :param filters: Opcjonalna lista filtrów do nałożenia przed agregacją
    :return: pl.DataFrame z wynikami agregacji lub surowymi punktami
    """
    schema = lf.collect_schema()
    if x_col not in schema:
        raise ValueError(f"Kolumna grupująca '{x_col}' nie istnieje w zbiorze.")
    if y_col not in schema:
        raise ValueError(f"Kolumna wartości '{y_col}' nie istnieje w zbiorze.")

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


def compute_summary(df: pl.DataFrame, y_col: str) -> Dict[str, Any]:
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


def generate_bar_code_polars(
    file_id: str,
    x_col: str,
    y_col: str,
    aggregation: str,
    sort_order: str,
    limit: Optional[int],
    orientation: str,
    color: str,
    rotation: int,
    show_grid: bool,
    title: str,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
) -> str:
    """
    Generuje kod w Pythonie wykorzystujący bibliotekę Polars i Matplotlib.
    """
    agg_name = AGGREGATION_LABELS.get(aggregation, "Wartość")
    lines = [
        "# Wygenerowane automatycznie przez platformę DataFlow Builder (Silnik Polars)",
        "import polars as pl",
        "import matplotlib.pyplot as plt",
        "",
        "# 1. Skanowanie danych zoptymalizowanych w Parquet (LazyFrame)",
        f"lf = pl.scan_parquet('storage/datasets/{file_id}.parquet')",
        "",
        "# 2. Selekcja kolumn i czyszczenie braków",
    ]

    if aggregation != "count":
        lines.append(f"lf = lf.with_columns(pl.col('{y_col}').cast(pl.Float64, strict=False))")
        lines.append(f"lf = lf.drop_nulls(subset=['{x_col}', '{y_col}'])")
    else:
        lines.append(f"lf = lf.drop_nulls(subset=['{x_col}'])")

    lines.append("")
    lines.append(f"# 3. Wielowątkowa agregacja w Polars: {agg_name}")
    lines.append(f"agg_expr = pl.col('{y_col}').{aggregation}().alias('{y_col}')")
    lines.append(f"grouped = lf.group_by('{x_col}').agg(agg_expr)")

    if sort_order == "desc":
        lines.append(f"grouped = grouped.sort(by='{y_col}', descending=True)")
    elif sort_order == "asc":
        lines.append(f"grouped = grouped.sort(by='{y_col}', descending=False)")
    elif sort_order == "alpha":
        lines.append(f"grouped = grouped.sort(by='{x_col}', descending=False)")

    if limit and limit > 0:
        lines.append(f"grouped = grouped.limit({limit})")

    lines.append("")
    lines.append("# 4. Zebranie wyników i rysowanie wykresu")
    lines.append("agg = grouped.collect()")
    lines.append("x_vals = [str(c) for c in agg['" + x_col + "'].to_list()]")
    lines.append("y_vals = agg['" + y_col + "'].to_list()")
    lines.append("")
    lines.append("plt.figure(figsize=(8, 5), dpi=100)")

    if orientation == "horizontal":
        lines.append(f"plt.barh(x_vals[::-1], y_vals[::-1], color='{color}')")
        lines.append(f"plt.xlabel('{y_label or (agg_name + ' ' + y_col)}')")
        lines.append(f"plt.ylabel('{x_label or x_col}')")
    else:
        lines.append(f"plt.bar(x_vals, y_vals, color='{color}')")
        lines.append(f"plt.xlabel('{x_label or x_col}')")
        lines.append(f"plt.ylabel('{y_label or (agg_name + ' ' + y_col)}')")
        lines.append(f"plt.xticks(rotation={rotation}, ha='right')")

    lines.append(f"plt.title('{title}')")
    if show_grid:
        lines.append("plt.grid(True, linestyle='--', alpha=0.5)")
    lines.append("plt.tight_layout()")
    lines.append("plt.show()")

    return "\n".join(lines)
