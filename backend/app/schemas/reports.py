from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.analysis import DescriptiveStatsRequest, LinearRegressionRequest
from app.schemas.charts import BarChartRequest, LineChartRequest

ReportTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
SectionHeading = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class TextSection(BaseModel):
    type: Literal["text"]
    heading: SectionHeading | None = None
    content: str = Field(max_length=20_000)


# Sekcje z wynikami mają w polu request te same parametry co odpowiadające im endpointy,
# więc frontend przekazuje żądanie zapisane w węźle potoku bez przekształceń


class BarChartSection(BaseModel):
    type: Literal["bar_chart"]
    heading: SectionHeading | None = None
    request: BarChartRequest


class LineChartSection(BaseModel):
    type: Literal["line_chart"]
    heading: SectionHeading | None = None
    request: LineChartRequest


class DescriptiveSection(BaseModel):
    type: Literal["descriptive"]
    heading: SectionHeading | None = None
    request: DescriptiveStatsRequest


class RegressionSection(BaseModel):
    type: Literal["regression"]
    heading: SectionHeading | None = None
    request: LinearRegressionRequest


ReportSection = Annotated[
    TextSection | BarChartSection | LineChartSection | DescriptiveSection | RegressionSection,
    Field(discriminator="type"),
]


class ReportRequest(BaseModel):
    title: ReportTitle = "Raport"
    # Zbiór opisany w nagłówku raportu; bez niego raport nie ma podsumowania danych
    file_id: str | None = None
    sections: list[ReportSection] = Field(default_factory=list, max_length=50)
