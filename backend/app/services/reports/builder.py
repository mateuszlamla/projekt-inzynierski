"""
Składanie raportu: każda sekcja jest przeliczana istniejącymi serwisami na aktualnych
danych (po krokach czyszczenia), a wynik trafia do szablonu jako prosty słownik.
"""

from collections.abc import Callable

import polars as pl

from app.exceptions import AppError, DatasetNotFoundError
from app.schemas.reports import (
    BarChartSection,
    DescriptiveSection,
    LineChartSection,
    RegressionSection,
    ReportRequest,
    TextSection,
)
from app.services.ai.base import ResultDescriber
from app.services.analysis.descriptive_stats import describe
from app.services.analysis.regression import linear_regression
from app.services.charts.aggregation import AGGREGATION_LABELS
from app.services.charts.bar_chart import build_bar_chart
from app.services.charts.line_chart import build_line_chart
from app.services.datasets.registry import DatasetRegistry
from app.services.formatting import format_number
from app.services.reports.facts import chart_facts, descriptive_facts, regression_facts

FILTER_OPERATORS = {"eq": "=", "gt": ">", "lt": "<"}

# Nagłówki sekcji, których nie udało się przeliczyć i nie mają nagłówka od użytkownika
FALLBACK_HEADINGS = {
    "text": "Tekst",
    "bar_chart": "Wykres słupkowy",
    "line_chart": "Wykres liniowy",
    "descriptive": "Statystyki opisowe",
    "regression": "Regresja liniowa",
}


def describe_step(step: dict) -> str:
    """Krok czyszczenia opisany dla czytelnika raportu."""
    t = step.get("type")
    p = step.get("params") or {}
    columns = ", ".join(p.get("columns") or [])

    if t == "drop_nulls":
        if columns:
            return f"Usunięcie wierszy z brakami w kolumnach: {columns}"
        return "Usunięcie wierszy z brakami w dowolnej kolumnie"
    if t == "fill_null":
        return f"Uzupełnienie braków w kolumnie {p.get('column')} wartością {p.get('value')}"
    if t == "drop_duplicates":
        if columns:
            return f"Usunięcie duplikatów według kolumn: {columns}"
        return "Usunięcie zduplikowanych wierszy"
    if t == "filter":
        operator = FILTER_OPERATORS.get(p.get("operator"), p.get("operator"))
        return f"Filtr: {p.get('column')} {operator} {p.get('value')}"
    if t == "cast":
        return f"Zmiana typu kolumny {p.get('column')} na {p.get('target_type')}"
    return f"Krok: {t}"


def _dataset_summary(registry: DatasetRegistry, file_id: str) -> dict:
    try:
        manager = registry.get(file_id)
    except DatasetNotFoundError:
        # Po restarcie serwera zostaje tylko plik Parquet, bez historii kroków potoku
        lf = registry.get_lazy_frame(file_id)
        return {
            "file_id": file_id,
            "rows": lf.select(pl.len()).collect().item(),
            "columns": len(lf.collect_schema()),
            "steps": [],
        }

    return {
        "file_id": file_id,
        "rows": manager.rows_count,
        "columns": len(manager.columns),
        "steps": [describe_step(s) for s in manager.pipeline_steps if s.get("enabled", True)],
    }


def _text(section: TextSection, registry: DatasetRegistry) -> dict:
    paragraphs = [p.strip() for p in section.content.split("\n\n") if p.strip()]
    return {"kind": "text", "heading": section.heading, "paragraphs": paragraphs}


def _bar_chart(section: BarChartSection, registry: DatasetRegistry) -> dict:
    req = section.request
    agg_name = AGGREGATION_LABELS.get(req.aggregation, "Wartość")
    result = build_bar_chart(registry.get_lazy_frame(req.file_id), req)
    return {
        "kind": "chart",
        "heading": section.heading or f"Wykres słupkowy: {agg_name} {req.y_col} wg {req.x_col}",
        "image": result["image"],
        "facts": chart_facts(
            "słupkowy", req.x_col, req.y_col, **result["data"], aggregation=agg_name
        ),
    }


def _line_chart(section: LineChartSection, registry: DatasetRegistry) -> dict:
    req = section.request
    lf = registry.get_lazy_frame(req.file_id)
    result = build_line_chart(lf, req.x_col, req.y_col, req.downsample_threshold)
    return {
        "kind": "chart",
        "heading": section.heading or f"Wykres liniowy: {req.y_col} wg {req.x_col}",
        "image": result["image"],
        "facts": chart_facts(
            "liniowy",
            req.x_col,
            req.y_col,
            **result["data"],
            aggregation="Suma",
            evenly_sampled=True,
        ),
    }


def _descriptive(section: DescriptiveSection, registry: DatasetRegistry) -> dict:
    req = section.request
    result = describe(registry.get_lazy_frame(req.file_id), req.columns)
    return {
        "kind": "descriptive",
        "heading": section.heading or "Statystyki opisowe",
        "rows_count": result["rows_count"],
        "numeric": result["numeric"],
        "categorical": result["categorical"],
        "facts": descriptive_facts(result),
    }


def _regression(section: RegressionSection, registry: DatasetRegistry) -> dict:
    req = section.request
    result = linear_regression(registry.get_lazy_frame(req.file_id), req.x_col, req.y_col)
    slope, intercept = result["slope"], result["intercept"]
    # Wyraz wolny bliski zera po zaokrągleniu zapisujemy jako "+ 0", a nie "− 0"
    intercept_text = format_number(abs(intercept))
    sign = "−" if intercept < 0 and intercept_text != "0" else "+"
    return {
        "kind": "regression",
        "heading": section.heading or f"Regresja liniowa: {req.y_col} względem {req.x_col}",
        "formula": (f"{req.y_col} = {format_number(slope)} · {req.x_col} {sign} {intercept_text}"),
        "r2": result["r2_score"],
        "slope": slope,
        "intercept": intercept,
        "samples": result["samples_count"],
        "image": result["image"],
        "facts": regression_facts(req.x_col, req.y_col, result),
    }


SECTION_BUILDERS: dict[str, Callable[..., dict]] = {
    "text": _text,
    "bar_chart": _bar_chart,
    "line_chart": _line_chart,
    "descriptive": _descriptive,
    "regression": _regression,
}


def _ai_description(describer: ResultDescriber | None, heading: str, facts: dict) -> dict:
    if describer is None:
        return {"model": None, "error": "Opisy AI nie są skonfigurowane."}
    try:
        text = describer.describe(heading, facts)
    except AppError as exc:
        # Błąd modelu nie usuwa sekcji: wykres lub tabela zostają, a w ramce opisu jest komunikat
        return {"model": describer.model_name, "error": exc.message}
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return {"model": describer.model_name, "paragraphs": paragraphs}


def _build_section(section, registry: DatasetRegistry, describer: ResultDescriber | None) -> dict:
    try:
        result = SECTION_BUILDERS[section.type](section, registry)
    except (AppError, pl.exceptions.PolarsError) as exc:
        # Jedna wadliwa sekcja nie blokuje reszty raportu
        message = exc.message if isinstance(exc, AppError) else str(exc)
        heading = section.heading or FALLBACK_HEADINGS[section.type]
        return {"kind": "error", "heading": heading, "message": message}

    # Zestawienie dla modelu jest potrzebne tylko do opisu AI, szablon go nie używa
    facts = result.pop("facts", None)
    if getattr(section, "ai_description", False) and facts is not None:
        result["ai"] = _ai_description(describer, result["heading"], facts)
    return result


def build_report(
    req: ReportRequest,
    registry: DatasetRegistry,
    describer: ResultDescriber | None = None,
) -> dict:
    """
    Dane do szablonu raportu. Nieznany zbiór w nagłówku zgłasza DatasetNotFoundError (404),
    błąd pojedynczej sekcji trafia do raportu jako komunikat w miejscu tej sekcji.
    Sekcje z ai_description dostają opis od `describer` (wywołania kolejno, sekcja po sekcji).
    """
    return {
        "title": req.title,
        "dataset": _dataset_summary(registry, req.file_id) if req.file_id else None,
        "sections": [_build_section(section, registry, describer) for section in req.sections],
    }
