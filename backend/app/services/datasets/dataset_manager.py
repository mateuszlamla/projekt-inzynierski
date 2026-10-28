import io
import os
import uuid

import polars as pl

from app.exceptions import InvalidRequestError
from app.services.datasets.steps import TYPE_MAP, apply_step

SUPPORTED_SOURCE_TYPES = ("csv", "json")


class DatasetManager:
    """
    Jeden wgrany zbiór danych: plik Parquet na dysku i lista kroków czyszczenia,
    które są nakładane leniwie przy każdym odczycie.
    """

    def __init__(self, file_name: str, source_type: str, storage_dir: str):
        self.file_id = file_name
        self.filename = file_name
        self.source_type = source_type
        self.storage_dir = storage_dir
        self.parquet_path = os.path.join(storage_dir, f"{self.filename}.parquet")

        self.rows_count: int = 0
        self.columns: dict[str, str] = {}
        self.pipeline_steps: list[dict] = []

    def load_file(self, file_bytes: bytes, type_overrides: dict | None = None):
        if self.source_type not in SUPPORTED_SOURCE_TYPES:
            raise InvalidRequestError(
                f"Nieobsługiwany format pliku '.{self.source_type}'. Wybierz plik CSV lub JSON."
            )

        os.makedirs(self.storage_dir, exist_ok=True)
        buffer = io.BytesIO(file_bytes)

        if self.source_type == "csv":
            df = pl.read_csv(buffer, ignore_errors=True, infer_schema_length=10000)
        else:
            df = pl.read_json(buffer)

        if type_overrides:
            cast_exprs = [
                pl.col(col).cast(TYPE_MAP[dtype], strict=False)
                for col, dtype in type_overrides.items()
                if dtype in TYPE_MAP and col in df.columns
            ]
            if cast_exprs:
                df = df.with_columns(cast_exprs)

        df.write_parquet(self.parquet_path)
        self._refresh_metadata()

    def get_lazy_frame(self) -> pl.LazyFrame:
        lf = pl.scan_parquet(self.parquet_path)
        for step in self.pipeline_steps:
            if step.get("enabled", True):
                lf = apply_step(lf, step)
        return lf

    def add_step(self, step_type: str, params: dict):
        self.pipeline_steps.append(
            {
                "step_id": str(uuid.uuid4())[:8],
                "type": step_type,
                "enabled": True,
                "params": params,
            }
        )
        self._refresh_metadata()

    def undo_last_step(self):
        if self.pipeline_steps:
            self.pipeline_steps.pop()
            self._refresh_metadata()

    def get_preview(self, offset: int = 0, limit: int = 50) -> dict:
        lf = self.get_lazy_frame()
        df_page = lf.slice(offset, limit).collect()
        return {
            "file_id": self.filename,
            "total_rows": self.rows_count,
            "columns": list(self.columns.keys()),
            "column_types": self.columns,
            "steps": self.pipeline_steps,
            "data": df_page.to_dicts(),
        }

    def get_profile(self) -> dict:
        df = self.get_lazy_frame().collect()
        profile = {}
        for col in df.columns:
            s = df[col]
            profile[col] = {
                "dtype": str(s.dtype),
                "null_count": s.null_count(),
                "unique_count": s.n_unique(),
                "min": s.min() if s.dtype.is_numeric() else None,
                "max": s.max() if s.dtype.is_numeric() else None,
            }
        return profile

    def _refresh_metadata(self):
        lf = self.get_lazy_frame()
        schema = lf.collect_schema()
        self.columns = {col: str(dtype) for col, dtype in schema.items()}
        self.rows_count = lf.select(pl.len()).collect().item()
