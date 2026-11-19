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


# Znaki niedozwolone w nazwach plików na Windowsie (np. dwukropek z „Raport: toyota.csv”)
RESERVED_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')
# Rozszerzenia plików danych w tytule, żeby nie powstawało „toyota.csv.pdf”
DATA_FILE_EXTENSIONS = re.compile(r"\.(csv|json|parquet)\b", re.IGNORECASE)
MAX_FILENAME_LENGTH = 150


def _filename_base(title: str) -> str:
    base = DATA_FILE_EXTENSIONS.sub("", title)
    base = RESERVED_FILENAME_CHARS.sub(" ", base)
    # Kropki i spacje na końcu nazwy Windows obcina albo odrzuca
    return " ".join(base.split())[:MAX_FILENAME_LENGTH].strip(" .")


def display_filename(title: str) -> str:
    """Nazwa pliku z polskimi znakami, np. 'Raport: toyota.csv' -> 'Raport toyota.pdf'."""
    return f"{_filename_base(title) or 'Raport'}.pdf"


def pdf_filename(title: str) -> str:
    """Nazwa pliku z samych znaków ASCII, np. 'Sprzedaż Q1' -> 'sprzedaz-q1.pdf'."""
    base = _filename_base(title)
    ascii_title = (
        unicodedata.normalize("NFKD", base.replace("ł", "l").replace("Ł", "L"))
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    return f"{slug or 'raport'}.pdf"


def attachment_header(title: str) -> str:
    """
    Content-Disposition z nazwą ASCII dla starszych klientów i pełną nazwą UTF-8 (RFC 6266).
    """
    return (
        f'attachment; filename="{pdf_filename(title)}"; '
        f"filename*=UTF-8''{quote(display_filename(title))}"
    )
