import pytest

from app.dependencies import get_describer
from app.exceptions import ServiceUnavailableError
from app.main import app
from app.schemas.reports import ReportRequest
from app.services.ai.base import ResultDescriber
from app.services.reports.builder import build_report
from app.services.reports.facts import MAX_CHART_POINTS, chart_facts
from tests.conftest import SALES_CSV


class FakeDescriber(ResultDescriber):
    model_name = "fake-model"

    def __init__(self, text="Pierwszy akapit.\n\nDrugi akapit.", error=None):
        self.text = text
        self.error = error
        self.calls = []

    def describe(self, heading, facts):
        self.calls.append((heading, facts))
        if self.error:
            raise self.error
        return self.text


@pytest.fixture
def loaded(registry):
    registry.load("sprzedaz.csv", SALES_CSV)
    return registry


def _report(*sections) -> ReportRequest:
    return ReportRequest.model_validate(
        {"title": "Raport", "file_id": "sprzedaz.csv", "sections": list(sections)}
    )


def _descriptive(ai=True):
    return {"type": "descriptive", "ai_description": ai, "request": {"file_id": "sprzedaz.csv"}}


def test_section_gets_ai_description(loaded):
    describer = FakeDescriber()

    section = build_report(_report(_descriptive()), loaded, describer)["sections"][0]

    assert section["kind"] == "descriptive"
    assert section["ai"] == {
        "model": "fake-model",
        "paragraphs": ["Pierwszy akapit.", "Drugi akapit."],
    }
    # Zestawienie dla modelu nie trafia do szablonu
    assert "facts" not in section


def test_model_gets_only_aggregates(loaded):
    describer = FakeDescriber()

    build_report(_report(_descriptive()), loaded, describer)

    heading, facts = describer.calls[0]
    assert heading == "Statystyki opisowe"
    assert facts["liczba_wierszy"] == 4
    assert [c["column"] for c in facts["kolumny_liczbowe"]] == ["sprzedaz", "ilosc"]
    # Wartości tekstowe pojawiają się tylko jako zliczenia najczęstszych wartości
    region = next(c for c in facts["kolumny_kategoryczne"] if c["column"] == "region")
    assert region["top_values"][0] == {"value": "Kraków", "count": 2}


def test_section_without_flag_does_not_call_model(loaded):
    describer = FakeDescriber()

    section = build_report(_report(_descriptive(ai=False)), loaded, describer)["sections"][0]

    assert describer.calls == []
    assert "ai" not in section


def test_model_error_keeps_section_and_shows_message(loaded):
    describer = FakeDescriber(error=ServiceUnavailableError("Brak połączenia z modelem."))

    section = build_report(_report(_descriptive()), loaded, describer)["sections"][0]

    assert section["kind"] == "descriptive"
    assert section["numeric"]
    assert section["ai"] == {"model": "fake-model", "error": "Brak połączenia z modelem."}


def test_failed_section_is_not_described(loaded):
    describer = FakeDescriber()
    broken = {
        "type": "descriptive",
        "ai_description": True,
        "request": {"file_id": "sprzedaz.csv", "columns": ["nie_ma"]},
    }

    section = build_report(_report(broken), loaded, describer)["sections"][0]

    assert section["kind"] == "error"
    assert describer.calls == []


def test_chart_and_regression_facts(loaded):
    describer = FakeDescriber()
    bar = {
        "type": "bar_chart",
        "ai_description": True,
        "request": {"file_id": "sprzedaz.csv", "x_col": "region", "y_col": "sprzedaz"},
    }
    regression = {
        "type": "regression",
        "ai_description": True,
        "request": {"file_id": "sprzedaz.csv", "x_col": "ilosc", "y_col": "sprzedaz"},
    }

    build_report(_report(bar, regression), loaded, describer)

    (_, bar_facts), (_, regression_facts) = describer.calls
    assert bar_facts["typ_wykresu"] == "słupkowy"
    assert bar_facts["agregacja"] == "Suma"
    assert {p["x"]: p["y"] for p in bar_facts["punkty"]} == {
        "Kraków": 400.0,
        "Gdańsk": 200.0,
    }
    assert regression_facts["wspolczynnik_kierunkowy"] == pytest.approx(10.0)
    assert regression_facts["r2"] == pytest.approx(1.0)
    assert regression_facts["liczba_obserwacji"] == 3


def test_long_line_series_is_sampled_evenly():
    x = list(range(100))
    y = [float(v) for v in x]

    facts = chart_facts("liniowy", "dzien", "sprzedaz", x, y, evenly_sampled=True)

    points = facts["punkty_wybrane_rownomiernie"]
    assert len(points) == MAX_CHART_POINTS
    assert points[0] == {"x": 0, "y": 0.0}
    assert points[-1] == {"x": 99, "y": 99.0}
    assert facts["maksimum"] == {"x": 99, "y": 99.0}
    assert facts["liczba_punktow"] == 100


def test_preview_shows_ai_description(client, upload):
    upload()
    app.dependency_overrides[get_describer] = lambda: FakeDescriber("Opis z modelu.")

    res = client.post(
        "/api/reports/preview",
        json={"title": "Raport", "file_id": "sprzedaz.csv", "sections": [_descriptive()]},
    )

    assert res.status_code == 200
    assert "Opis wygenerowany przez model językowy fake-model" in res.text
    assert "Opis z modelu." in res.text
