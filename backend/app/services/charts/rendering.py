"""
Statyczne wykresy PNG (matplotlib) zwracane jako base64.
"""

import base64
import io

import matplotlib

matplotlib.use("agg")
import matplotlib.pyplot as plt  # noqa: E402

from app.schemas.charts import BarChartRequest  # noqa: E402


def _figure_to_base64(dpi: int) -> str:
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=dpi)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _apply_theme(fig, ax, theme: str) -> tuple[str, str]:
    """Ustawia tło, osie i znaczniki; zwraca (kolor tekstu, kolor siatki)."""
    if theme == "dark":
        fig.patch.set_facecolor("#0f172a")
        ax.set_facecolor("#1e293b")
        ax.tick_params(colors="#cbd5e1", labelsize=9)
        for spine in ax.spines.values():
            spine.set_color("#475569")
        return "#f8fafc", "#334155"
    if theme == "minimal":
        fig.patch.set_facecolor("#ffffff")
        ax.set_facecolor("#ffffff")
        for spine in ["top", "right"]:
            ax.spines[spine].set_visible(False)
        for spine in ["left", "bottom"]:
            ax.spines[spine].set_color("#94a3b8")
        ax.tick_params(colors="#475569", labelsize=9)
        return "#0f172a", "#f1f5f9"
    # white / domyślny
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#f8fafc")
    for spine in ax.spines.values():
        spine.set_color("#cbd5e1")
    ax.tick_params(colors="#334155", labelsize=9)
    return "#0f172a", "#e2e8f0"


def _bar_colors(palette: str | None, color: str, count: int):
    if not palette or palette == "custom":
        return color
    try:
        cmap = plt.get_cmap(palette)
        num_items = max(1, count)
        return [
            cmap(i / max(1, num_items - 1)) if num_items > 1 else cmap(0.5)
            for i in range(num_items)
        ]
    except Exception:
        return color


def render_bar_png(
    cats: list[str],
    vals: list[float],
    req: BarChartRequest,
    title: str,
    x_label: str,
    y_label: str,
) -> str:
    fig, ax = plt.subplots(figsize=(8, 5), dpi=120)
    try:
        text_color, grid_color = _apply_theme(fig, ax, req.theme)
        bar_colors = _bar_colors(req.palette, req.color, len(cats))
        value_fmt = "%.1f" if req.aggregation == "mean" else "%g"

        if req.orientation == "horizontal":
            if isinstance(bar_colors, list):
                bar_colors = bar_colors[::-1]
            bars = ax.barh(
                cats[::-1], vals[::-1], color=bar_colors, edgecolor="none", alpha=0.9, height=0.6
            )
            if req.show_grid:
                ax.grid(True, axis="x", linestyle="--", alpha=0.6, color=grid_color)
            ax.set_xlabel(y_label, color=text_color, fontsize=10, fontweight="600")
            ax.set_ylabel(x_label, color=text_color, fontsize=10, fontweight="600")
            if req.show_values:
                ax.bar_label(bars, fmt=value_fmt, padding=4, color=text_color, fontsize=8)
        else:
            bars = ax.bar(cats, vals, color=bar_colors, edgecolor="none", alpha=0.9, width=0.6)
            if req.show_grid:
                ax.grid(True, axis="y", linestyle="--", alpha=0.6, color=grid_color)
            ax.set_xlabel(x_label, color=text_color, fontsize=10, fontweight="600")
            ax.set_ylabel(y_label, color=text_color, fontsize=10, fontweight="600")
            ax.tick_params(axis="x", rotation=req.rotation)
            if req.show_values:
                ax.bar_label(bars, fmt=value_fmt, padding=3, color=text_color, fontsize=8)

        ax.set_title(title, color=text_color, fontsize=12, fontweight="bold", pad=14)
        plt.tight_layout()
        return _figure_to_base64(dpi=120)
    finally:
        plt.close(fig)


def render_line_png(cats: list, vals: list[float], x_col: str, y_col: str) -> str:
    fig = plt.figure(figsize=(6, 4))
    try:
        few_points = len(cats) <= 50
        plt.plot(
            cats,
            vals,
            marker="o" if few_points else "",
            color="#2563eb",
            linewidth=2,
            markersize=5 if few_points else 0,
        )
        plt.xlabel(x_col)
        plt.ylabel(y_col)
        plt.title(f"{y_col} wg {x_col}")
        plt.xticks(rotation=45, ha="right")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        return _figure_to_base64(dpi=100)
    finally:
        plt.close(fig)


def render_regression_png(x, y, y_pred, x_col: str, y_col: str, r2: float) -> str:
    fig = plt.figure(figsize=(6, 4))
    try:
        plt.scatter(x, y, color="#64748b", alpha=0.6, label="Dane")
        plt.plot(x, y_pred, color="#eab308", linewidth=2.5, label="Linia trendu")
        plt.xlabel(x_col)
        plt.ylabel(y_col)
        plt.title(f"Regresja liniowa: {y_col} vs {x_col} (R^2 = {r2:.2f})")
        plt.grid(True, linestyle="--", alpha=0.4)
        plt.legend()
        plt.tight_layout()
        return _figure_to_base64(dpi=100)
    finally:
        plt.close(fig)
