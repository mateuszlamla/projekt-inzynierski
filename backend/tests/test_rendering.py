import matplotlib.pyplot as plt

from app.services.charts.rendering import _format_value_axis

NBSP = " "


def test_value_axis_uses_polish_numbers_without_scientific_offset():
    fig, ax = plt.subplots()
    try:
        ax.bar(["A", "B"], [10_000_000, 45_000_000])
        _format_value_axis(ax.yaxis)
        fig.canvas.draw()

        labels = [label.get_text() for label in ax.get_yticklabels()]
        assert f"40{NBSP}000{NBSP}000" in labels
        # Bez mnożnika „1e7” w rogu osi
        assert ax.yaxis.get_offset_text().get_text() == ""
    finally:
        plt.close(fig)
