import pytest
from pydantic import TypeAdapter, ValidationError

from app.exceptions import DatasetNotFoundError
from app.schemas.reports import ReportRequest, ReportSection
from app.services.datasets.registry import DatasetRegistry
from app.services.reports.builder import build_report, describe_step
from app.services.reports.formatting import format_number
from tests.conftest import SALES_CSV

NBSP = " "


def _report(**kwargs) -> ReportRequest:
    return ReportRequest.model_validate({"title": "Raport", "file_id": "sprzedaz.csv", **kwargs})


@pytest.fixture
def loaded(registry):
    registry.load("sprzedaz.csv", SALES_CSV)
    return registry


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (1234567, f"1{NBSP}234{NBSP}567"),
        (1234.5, f"1{NBSP}234,5"),
        (0.123456, "0,123"),
        (2.0, "2"),
        (-5.5e-14, "0"),
        (None, "—"),
        (float("nan"), "—"),
        (True, "tak"),
        ("Kraków", "Kraków"),
    ],
)
def test_format_number(value, expected):
    assert format_number(value) == expected


def test_dataset_summary_lists_cleaning_steps(loaded):
    loaded.get("sprzedaz.csv").add_step("drop_nulls", {"columns": ["sprzedaz"]})

    dataset = build_report(_report(), loaded)["dataset"]

    assert dataset == {
        "file_id": "sprzedaz.csv",
        "rows": 3,
        "columns": 4,
        "steps": ["Usunięcie wierszy z brakami w kolumnach: sprzedaz"],
    }


def test_dataset_summary_after_restart_has_no_steps(loaded):
    restarted = DatasetRegistry(loaded.storage_dir)

    dataset = build_report(_report(), restarted)["dataset"]

    assert dataset["rows"] == 4
    assert dataset["steps"] == []


def test_unknown_dataset_raises(registry):
    with pytest.raises(DatasetNotFoundError):
        build_report(_report(file_id="brak.csv"), registry)


def test_report_without_dataset(registry):
    report = build_report(ReportRequest(title="Notatka"), registry)

    assert report == {"title": "Notatka", "dataset": None, "sections": []}


def test_text_section_splits_paragraphs(loaded):
    sections = [{"type": "text", "heading": "Wnioski", "content": "Pierwszy.\n\n\nDrugi\nciąg."}]

    section = build_report(_report(sections=sections), loaded)["sections"][0]

    assert section == {
        "kind": "text",
        "heading": "Wnioski",
        "paragraphs": ["Pierwszy.", "Drugi\nciąg."],
    }


def test_chart_sections_render_images(loaded):
    sections = [
        {
            "type": "bar_chart",
            "request": {"file_id": "sprzedaz.csv", "x_col": "region", "y_col": "sprzedaz"},
        },
        {
            "type": "line_chart",
            "heading": "Trend",
            "request": {"file_id": "sprzedaz.csv", "x_col": "ilosc", "y_col": "sprzedaz"},
        },
    ]

    bar, line = build_report(_report(sections=sections), loaded)["sections"]

    assert bar["kind"] == line["kind"] == "chart"
    assert bar["heading"] == "Wykres słupkowy: Suma sprzedaz wg region"
    assert line["heading"] == "Trend"
    assert len(bar["image"]) > 100 and len(line["image"]) > 100


def test_descriptive_section(loaded):
    sections = [{"type": "descriptive", "request": {"file_id": "sprzedaz.csv"}}]

    section = build_report(_report(sections=sections), loaded)["sections"][0]

    assert section["kind"] == "descriptive"
    assert section["heading"] == "Statystyki opisowe"
    assert section["rows_count"] == 4
    assert [row["column"] for row in section["numeric"]] == ["sprzedaz", "ilosc"]
    assert [row["column"] for row in section["categorical"]] == ["region", "produkt"]


def test_regression_section(loaded):
    request = {"file_id": "sprzedaz.csv", "x_col": "ilosc", "y_col": "sprzedaz"}
    sections = [{"type": "regression", "request": request}]

    section = build_report(_report(sections=sections), loaded)["sections"][0]

    assert section["heading"] == "Regresja liniowa: sprzedaz względem ilosc"
    assert section["formula"] == "sprzedaz = 10 · ilosc + 0"
    assert section["r2"] == pytest.approx(1.0)
    assert section["samples"] == 3


def test_failed_section_becomes_error_box(loaded):
    sections = [
        {"type": "descriptive", "request": {"file_id": "sprzedaz.csv", "columns": ["nie_ma"]}},
        {"type": "text", "content": "Dalsza część raportu."},
    ]

    error, text = build_report(_report(sections=sections), loaded)["sections"]

    assert error == {
        "kind": "error",
        "heading": "Statystyki opisowe",
        "message": "Kolumny nie istnieją w zbiorze danych: nie_ma",
    }
    assert text["kind"] == "text"


def test_unknown_section_type_is_rejected():
    with pytest.raises(ValidationError):
        TypeAdapter(ReportSection).validate_python({"type": "pie_chart", "request": {}})


@pytest.mark.parametrize(
    ("step", "expected"),
    [
        ({"type": "drop_nulls", "params": {}}, "Usunięcie wierszy z brakami w dowolnej kolumnie"),
        (
            {"type": "fill_null", "params": {"column": "ilosc", "value": 0}},
            "Uzupełnienie braków w kolumnie ilosc wartością 0",
        ),
        ({"type": "drop_duplicates", "params": {}}, "Usunięcie zduplikowanych wierszy"),
        (
            {"type": "filter", "params": {"column": "ilosc", "operator": "gt", "value": 5}},
            "Filtr: ilosc > 5",
        ),
        (
            {"type": "cast", "params": {"column": "ilosc", "target_type": "Float64"}},
            "Zmiana typu kolumny ilosc na Float64",
        ),
    ],
)
def test_describe_step(step, expected):
    assert describe_step(step) == expected
