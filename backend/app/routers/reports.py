from fastapi import APIRouter
from fastapi.responses import Response

from app.schemas.reports import ReportPdfRequest
from app.services.reports.pdf import attachment_header, html_to_pdf
from app.services.reports.renderer import render_report_html

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/pdf")
def generate_report_pdf(req: ReportPdfRequest):
    pdf = html_to_pdf(render_report_html(req.title))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": attachment_header(req.title)},
    )
