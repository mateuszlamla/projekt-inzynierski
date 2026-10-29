from pydantic import BaseModel


class DescriptiveStatsRequest(BaseModel):
    file_id: str
    columns: list[str] | None = None  # None: wszystkie kolumny


class LinearRegressionRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str
