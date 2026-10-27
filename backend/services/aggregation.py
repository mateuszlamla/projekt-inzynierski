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


def aggregate_data(
    lf: pl.LazyFrame,
    x_col: str,
    y_col: str,
    aggregation: str = "sum",
    sort_order: str = "none",
    limit: Optional[int] = None,
) -> pl.DataFrame:
    """
    Wykonuje grupowanie i agregację danych w silniku Polars przy użyciu LazyFrame.

    :param lf: pl.LazyFrame wejściowy
    :param x_col: Kolumna kategoryczna / grupująca (Oś X)
    :param y_col: Kolumna wartościowana (Oś Y)
    :param aggregation: Typ agregacji ('sum', 'mean', 'count', 'min', 'max', 'median')
    :param sort_order: Kolejność sortowania ('none', 'desc', 'asc', 'alpha')
    :param limit: Opcjonalne ograniczenie liczby zwracanych kategorii (np. top 10)
    :return: pl.DataFrame z wynikami agregacji
    """
    schema = lf.collect_schema()
    if x_col not in schema:
        raise ValueError(f"Kolumna grupująca '{x_col}' nie istnieje w zbiorze.")
    if y_col not in schema:
        raise ValueError(f"Kolumna wartości '{y_col}' nie istnieje w zbiorze.")

    agg_norm = (aggregation or "sum").lower()

    # 1. Przygotowanie kolumn i czyszczenie braków (nulls)
    if agg_norm != "count":
        dtype = schema[y_col]
        # Jeśli kolumna wartości nie jest numeryczna, konwertujemy bezpiecznie na Float64
        if not dtype.is_numeric():
            lf = lf.with_columns(pl.col(y_col).cast(pl.Float64, strict=False))
        # Odrzucamy wiersze z brakami w kluczowych kolumnach
        lf = lf.drop_nulls(subset=[x_col, y_col])
    else:
        lf = lf.drop_nulls(subset=[x_col])

    # 2. Definicja wyrażenia agregującego w Polars
    agg_expressions = {
        "sum": pl.col(y_col).sum().alias(y_col),
        "mean": pl.col(y_col).mean().alias(y_col),
        "count": pl.col(y_col).count().alias(y_col),
        "min": pl.col(y_col).min().alias(y_col),
        "max": pl.col(y_col).max().alias(y_col),
        "median": pl.col(y_col).median().alias(y_col),
    }

    agg_expr = agg_expressions.get(agg_norm, pl.col(y_col).sum().alias(y_col))

    # 3. Wykonanie operacji grupowania
    grouped_lf = lf.group_by(x_col).agg(agg_expr)

    # 4. Sortowanie
    if sort_order == "desc":
        grouped_lf = grouped_lf.sort(by=y_col, descending=True)
    elif sort_order == "asc":
        grouped_lf = grouped_lf.sort(by=y_col, descending=False)
    elif sort_order == "alpha":
        grouped_lf = grouped_lf.sort(by=x_col, descending=False)

    # 5. Ograniczenie liczby wierszy (limit)
    if limit and limit > 0:
        grouped_lf = grouped_lf.limit(limit)

    # 6. Zebranie wyników (wielowątkowe wykonanie przez silnik Polars)
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
