import sys
from datetime import datetime
from io import BytesIO

import pytest
from pypdf import PdfReader

from app.services.reports.pdf import attachment_header, pdf_filename
from app.services.reports.renderer import render_report_html


def _weasyprint_available() -> bool:
    # Bez bibliotek Pango WeasyPrint zgłasza OSError już przy imporcie
    # (np. na Windowsie poza Dockerem)
    try:
        import weasyprint  # noqa: F401
    except (ImportError, OSError):
        return False
    return True


requires_weasyprint = pytest.mark.skipif(
    not _weasyprint_available(), reason="WeasyPrint wymaga bibliotek systemowych Pango"
)


def test_html_contains_escaped_title_and_date():
    report = {"title": "Sprzedaż <Q1> & marża", "dataset": None, "sections": []}
    html = render_report_html(report, datetime(2026, 11, 9, 14, 30))

    assert "Sprzedaż &lt;Q1&gt; &amp; marża" in html
    assert "Wygenerowano: 09.11.2026 14:30" in html
    assert 'counter(page) " z " counter(pages)' in html


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Sprzedaż Q1 / 2026", "sprzedaz-q1-2026.pdf"),
        ("Łódź i okolice", "lodz-i-okolice.pdf"),
        ("???", "raport.pdf"),
    ],
)
def test_pdf_filename_is_ascii(title, expected):
    assert pdf_filename(title) == expected


def test_attachment_header_keeps_utf8_name():
    header = attachment_header("Sprzedaż Q1")

    assert header.startswith('attachment; filename="sprzedaz-q1.pdf"')
    assert "filename*=UTF-8''Sprzeda%C5%BC%20Q1.pdf" in header


@requires_weasyprint
def test_pdf_endpoint_returns_pdf(client):
    res = client.post("/api/reports/pdf", json={"title": "Raport sprzedaży — Łódź"})

    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.headers["content-disposition"].startswith(
        'attachment; filename="raport-sprzedazy-lodz.pdf"'
    )

    page = PdfReader(BytesIO(res.content)).pages[0]
    text = page.extract_text()
    assert "Raport sprzedaży — Łódź" in text
    assert "Strona 1 z 1" in text
    # Polskie znaki pochodzą z osadzonej czcionki DejaVu, a nie z zastępczej
    fonts = [font.get_object()["/BaseFont"] for font in page["/Resources"]["/Font"].values()]
    assert any("DejaVu" in name for name in fonts)


def test_pdf_endpoint_without_weasyprint_returns_503(client, monkeypatch):
    # None w sys.modules sprawia, że import zgłasza ImportError, tak jak przy braku biblioteki
    monkeypatch.setitem(sys.modules, "weasyprint", None)

    res = client.post("/api/reports/pdf", json={"title": "Raport"})

    assert res.status_code == 503
    assert "Pango" in res.json()["detail"]


def test_pdf_endpoint_rejects_blank_title(client):
    res = client.post("/api/reports/pdf", json={"title": "   "})

    assert res.status_code == 422


FULL_REPORT = {
    "title": "Sprzedaż w regionach",
    "file_id": "sprzedaz.csv",
    "sections": [
        {"type": "text", "heading": "Wstęp", "content": "Raport obejmuje sprzedaż w regionach."},
        {
            "type": "bar_chart",
            "request": {"file_id": "sprzedaz.csv", "x_col": "region", "y_col": "sprzedaz"},
        },
        {"type": "descriptive", "request": {"file_id": "sprzedaz.csv"}},
        {
            "type": "regression",
            "request": {"file_id": "sprzedaz.csv", "x_col": "ilosc", "y_col": "sprzedaz"},
        },
    ],
}


def test_preview_returns_html_with_all_sections(client, upload):
    upload()
    res = client.post("/api/reports/preview", json=FULL_REPORT)

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/html")
    html = res.text
    assert "Wstęp" in html
    assert "Wykres słupkowy: Suma sprzedaz wg region" in html
    assert "Statystyki opisowe" in html
    assert "Regresja liniowa: sprzedaz względem ilosc" in html
    # Wykres słupkowy i wykres regresji
    assert html.count("data:image/png;base64,") == 2


@requires_weasyprint
def test_pdf_contains_sections_and_cleaning_steps(client, upload):
    upload()
    client.post(
        "/data/pipeline/add",
        json={
            "file_id": "sprzedaz.csv",
            "step_type": "drop_nulls",
            "params": {"columns": ["sprzedaz"]},
        },
    )
    res = client.post("/api/reports/pdf", json=FULL_REPORT)

    assert res.status_code == 200
    reader = PdfReader(BytesIO(res.content))
    text = "\n".join(page.extract_text() for page in reader.pages)
    assert "Kroki czyszczenia danych" in text
    assert "Usunięcie wierszy z brakami w kolumnach: sprzedaz" in text
    assert "Statystyki opisowe" in text
    assert "Kolumny kategoryczne" in text
    assert "sprzedaz = 10 · ilosc + 0" in text
    assert f"Strona 1 z {len(reader.pages)}" in text


def test_report_with_unknown_dataset_returns_404(client):
    res = client.post("/api/reports/preview", json={"title": "Raport", "file_id": "brak.csv"})

    assert res.status_code == 404
    assert "brak.csv" in res.json()["detail"]


def test_report_with_unknown_section_type_returns_422(client):
    res = client.post(
        "/api/reports/preview",
        json={"title": "Raport", "sections": [{"type": "pie_chart", "request": {}}]},
    )

    assert res.status_code == 422
