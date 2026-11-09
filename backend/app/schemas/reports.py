from typing import Annotated

from pydantic import BaseModel, StringConstraints

ReportTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class ReportPdfRequest(BaseModel):
    title: ReportTitle = "Raport"
