from app.services.charts.aggregation import AGGREGATION_LABELS


def generate_bar_code_polars(
    file_id: str,
    x_col: str,
    y_col: str,
    aggregation: str,
    sort_order: str,
    limit: int | None,
    orientation: str,
    color: str,
    rotation: int,
    show_grid: bool,
    title: str,
    x_label: str | None = None,
    y_label: str | None = None,
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
