from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import get_settings
from app.services.reports.formatting import format_number

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)
_env.filters["number"] = format_number


def render_report_html(report: dict, generated_at: datetime | None = None) -> str:
    """
    Raport jako dokument HTML z CSS do druku, gotowy do podglądu lub zamiany na PDF.
    `report` to wynik build_report: tytuł, podsumowanie zbioru i sekcje.
    """
    generated_at = generated_at or datetime.now(ZoneInfo(get_settings().report_timezone))
    return _env.get_template("report.html").render(
        **report,
        generated_at=generated_at.strftime("%d.%m.%Y %H:%M"),
    )
