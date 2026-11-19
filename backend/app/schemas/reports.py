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


class ResultSection(BaseModel):
    heading: SectionHeading | None = None
    # Krótki opis wyników wygenerowany przez model językowy (konfiguracja LLM_*)
    ai_description: bool = False


class BarChartSection(ResultSection):
    type: Literal["bar_chart"]
    request: BarChartRequest


class LineChartSection(ResultSection):
    type: Literal["line_chart"]
    request: LineChartRequest


class DescriptiveSection(ResultSection):
    type: Literal["descriptive"]
    request: DescriptiveStatsRequest


class RegressionSection(ResultSection):
    type: Literal["regression"]
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
