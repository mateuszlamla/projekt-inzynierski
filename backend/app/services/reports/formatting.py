import math

# Twarda spacja: separator tysięcy nie rozdziela liczby przy łamaniu linii
THOUSANDS_SEPARATOR = " "
MISSING = "—"


def format_number(value, decimals: int = 3) -> str:
    """
    Liczba w polskim zapisie: 1234.5 -> '1 234,5', brak wartości -> '—'.
    Końcowe zera po przecinku są pomijane.
    """
    if value is None:
        return MISSING
    if isinstance(value, bool):
        return "tak" if value else "nie"
    if isinstance(value, int):
        return f"{value:,}".replace(",", THOUSANDS_SEPARATOR)
    if isinstance(value, float):
        if not math.isfinite(value):
            return MISSING
        text = f"{value:,.{decimals}f}"
        if "." in text:
            text = text.rstrip("0").rstrip(".")
        if text == "-0":
            text = "0"
        return text.replace(",", THOUSANDS_SEPARATOR).replace(".", ",")
    return str(value)
