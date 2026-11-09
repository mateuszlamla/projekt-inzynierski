import re
import unicodedata
from urllib.parse import quote

from app.exceptions import ServiceUnavailableError


def html_to_pdf(html: str) -> bytes:
    # Import przy pierwszym użyciu: bez bibliotek systemowych (Pango) WeasyPrint rzuca OSError
    # już przy imporcie, a reszta API powinna działać także poza Dockerem
    try:
        from weasyprint import HTML
    except (ImportError, OSError) as exc:
        raise ServiceUnavailableError(
            "Generowanie PDF jest niedostępne: brak bibliotek systemowych WeasyPrint (Pango). "
            "Uruchom backend w Dockerze."
        ) from exc

    return HTML(string=html).write_pdf()


def pdf_filename(title: str) -> str:
    """Nazwa pliku z samych znaków ASCII, np. 'Sprzedaż Q1' -> 'sprzedaz-q1.pdf'."""
    ascii_title = (
        unicodedata.normalize("NFKD", title.replace("ł", "l").replace("Ł", "L"))
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    return f"{slug or 'raport'}.pdf"


def attachment_header(title: str) -> str:
    """
    Content-Disposition z nazwą ASCII dla starszych klientów i pełną nazwą UTF-8 (RFC 6266).
    """
    return f"attachment; filename=\"{pdf_filename(title)}\"; filename*=UTF-8''{quote(title)}.pdf"
