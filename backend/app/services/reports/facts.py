"""
Zwięzłe zestawienia wyników sekcji dla modelu językowego. Zawierają wyłącznie agregaty
(statystyki, wartości wykresu, wynik regresji), nigdy surowe wiersze danych.
"""

# Tyle punktów wykresu trafia do modelu; dłuższe serie są skracane, żeby prompt był krótki
MAX_CHART_POINTS = 30


def _round(value):
    return round(value, 3) if isinstance(value, float) else value


def _rounded(row: dict) -> dict:
    return {key: _round(value) for key, value in row.items()}


def chart_facts(
    chart_type: str,
    x_col: str,
    y_col: str,
    x: list,
    y: list,
    aggregation: str | None = None,
    evenly_sampled: bool = False,
) -> dict:
    """
    Wartości wykresu. Gdy punktów jest więcej niż MAX_CHART_POINTS, wykres słupkowy podaje
    pierwsze kategorie w kolejności z wykresu, a liniowy punkty wybrane równomiernie
    (żeby zachować przebieg). Minimum i maksimum są podawane zawsze.
    """
    points = [{"x": xv, "y": _round(yv)} for xv, yv in zip(x, y, strict=True)]
    facts = {"typ_wykresu": chart_type, "os_x": x_col, "os_y": y_col, "liczba_punktow": len(points)}
    if aggregation:
        facts["agregacja"] = aggregation
    if not points:
        return facts

    facts["minimum"] = min(points, key=lambda p: p["y"])
    facts["maksimum"] = max(points, key=lambda p: p["y"])
    if len(points) <= MAX_CHART_POINTS:
        facts["punkty"] = points
    elif evenly_sampled:
        step = (len(points) - 1) / (MAX_CHART_POINTS - 1)
        facts["punkty_wybrane_rownomiernie"] = [
            points[round(i * step)] for i in range(MAX_CHART_POINTS)
        ]
    else:
        facts[f"pierwsze_{MAX_CHART_POINTS}_punktow"] = points[:MAX_CHART_POINTS]
    return facts


def descriptive_facts(result: dict) -> dict:
    return {
        "liczba_wierszy": result["rows_count"],
        "kolumny_liczbowe": [_rounded(row) for row in result["numeric"]],
        "kolumny_kategoryczne": result["categorical"],
    }


def regression_facts(x_col: str, y_col: str, result: dict) -> dict:
    return {
        "zmienna_objasniajaca": x_col,
        "zmienna_objasniana": y_col,
        "wspolczynnik_kierunkowy": _round(result["slope"]),
        "wyraz_wolny": _round(result["intercept"]),
        "r2": _round(result["r2_score"]),
        "liczba_obserwacji": result["samples_count"],
    }
