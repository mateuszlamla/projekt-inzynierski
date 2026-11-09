from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import get_settings

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def render_report_html(title: str, generated_at: datetime | None = None) -> str:
    """
    Raport jako dokument HTML z CSS do druku, gotowy do podglądu lub zamiany na PDF.
    """
    generated_at = generated_at or datetime.now(ZoneInfo(get_settings().report_timezone))
    return _env.get_template("report.html").render(
        title=title,
        generated_at=generated_at.strftime("%d.%m.%Y %H:%M"),
    )
