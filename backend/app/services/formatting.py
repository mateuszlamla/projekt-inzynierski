"""
Formatowanie liczb po polsku, wspólne dla raportów (tabele) i wykresów (osie).
"""

import math

# Twarda spacja: separator tysięcy nie rozdziela liczby przy łamaniu linii
THOUSANDS_SEPARATOR = " "
# Liczby czterocyfrowe zapisujemy bez separatora (1998, a nie 1 998), jak w polskiej typografii
GROUPING_FROM = 10_000
MISSING = "—"


def _apply_grouping(text: str, magnitude: float) -> str:
    # text pochodzi z formatu "{:,}", więc przecinki oznaczają separatory tysięcy
    separator = THOUSANDS_SEPARATOR if magnitude >= GROUPING_FROM else ""
    return text.replace(",", separator)


def format_number(value, decimals: int = 3) -> str:
    """
    Liczba w polskim zapisie: 12345.5 -> '12 345,5', 2016.75 -> '2016,75', brak -> '—'.
    Końcowe zera po przecinku są pomijane.
    """
    if value is None:
        return MISSING
    if isinstance(value, bool):
        return "tak" if value else "nie"
    if isinstance(value, int):
        return _apply_grouping(f"{value:,}", abs(value))
    if isinstance(value, float):
        if not math.isfinite(value):
            return MISSING
        rounded = round(value, decimals)
        text = f"{rounded:,.{decimals}f}"
        if "." in text:
            text = text.rstrip("0").rstrip(".")
        if text == "-0":
            text = "0"
        return _apply_grouping(text, abs(rounded)).replace(".", ",")
    return str(value)
