from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, Response

from app.dependencies import get_registry
from app.schemas.reports import ReportRequest
from app.services.datasets.registry import DatasetRegistry
from app.services.reports.builder import build_report
from app.services.reports.pdf import attachment_header, html_to_pdf
from app.services.reports.renderer import render_report_html

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/preview", response_class=HTMLResponse)
def preview_report(req: ReportRequest, registry: DatasetRegistry = Depends(get_registry)):
    """Ten sam raport co PDF, jako HTML do szybkiego podglądu w przeglądarce."""
    return HTMLResponse(render_report_html(build_report(req, registry)))


@router.post("/pdf")
def generate_report_pdf(req: ReportRequest, registry: DatasetRegistry = Depends(get_registry)):
    pdf = html_to_pdf(render_report_html(build_report(req, registry)))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": attachment_header(req.title)},
    )
