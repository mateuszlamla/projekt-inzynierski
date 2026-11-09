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
    html = render_report_html("Sprzedaż <Q1> & marża", datetime(2026, 11, 9, 14, 30))

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
