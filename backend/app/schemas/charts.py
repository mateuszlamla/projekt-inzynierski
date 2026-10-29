from typing import Any

from pydantic import BaseModel


class ChartFilter(BaseModel):
    column: str
    operator: str = "eq"  # eq, neq, gt, gte, lt, lte, contains, in, not_in, is_null, not_null
    value: Any | None = None


class BarChartRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str
    aggregation: str = "sum"  # sum, mean, count, min, max, median
    sort_order: str = "none"  # none, desc, asc, alpha
    limit: int | None = None  # np. 5, 10, 20, None
    orientation: str = "vertical"  # vertical, horizontal
    color: str = "#a855f7"  # hex
    palette: str = "custom"  # custom, viridis, plasma, magma, coolwarm, tab10, Pastel1
    title: str | None = None
    x_label: str | None = None
    y_label: str | None = None
    show_grid: bool = True
    show_values: bool = False
    rotation: int = 45  # 0, 45, 90
    theme: str = "white"  # white, dark, minimal
    filters: list[ChartFilter] | None = None


class ChartDataRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str
    aggregation: str = "sum"  # sum, mean, count, min, max, median, none, raw
    sort_order: str = "none"  # none, desc, asc, alpha
    limit: int | None = None
    chart_type: str | None = "bar"  # bar, line, scatter, pie, area, etc.
    filters: list[ChartFilter] | None = None
    # None: auto (gdy > 5000 dla line/area), True: wymuszone, False: wyłączone
    downsample: bool | None = None
    downsample_threshold: int | None = 1000  # Próg docelowej liczby punktów LTTB
    bin_scatter: bool | None = None
    n_bins: int | None = 50 # Liczba podziałów siatki na osi X i Y
