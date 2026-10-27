import os
import uuid
import polars as pl
import pandas as pd

class DatasetManager:
    def __init__(self,file_name: str, source_type:str):
        # File info
        self.file_id = file_name
        self.filename = file_name
        self.source_type = source_type      # 'csv', 'json'
        self.parquet_path = f"storage/datasets/{self.filename}.parquet"

        # Metadata
        self.rows_count: int=0
        self.columns:dict[str,str]={}   # {kol1: int, kol2: str}

        # Pipeline
        self.pipeline_steps: list[dict] = []

    # === Load file and convert to parquet
    def load_file(self, file_bytes: bytes, type_overrides: dict = None):
        """    Load file and convert to parquet    """

        os.makedirs("storage/datasets", exist_ok=True)

        if self.source_type =="csv":
            df = pl.read_csv(file_bytes)
        elif self.source_type =="json":
            df = pl.read_json(file_bytes)
        else:
            raise ValueError("Wrong source type, choose csv or json")

        if type_overrides:
            type_map = {
                'Int64':pl.Int64,
                'Float64':pl.Float64,
                'String':pl.String,
                'Boolean':pl.Boolean
            }
            cast_exprs = [
                pl.col(col).cast(type_map[dtype],strict=False)
                for col,dtype in type_overrides.items()
                if dtype in type_map and col in df.columns
            ]

            if cast_exprs:
                df = df.with_columns(cast_exprs)

        df.write_parquet(self.parquet_path)
        self._refresh_metadata()

    def get_lazy_frame(self)->pl.LazyFrame:
        """    Build lazy query with cleaning steps    """

        lf = pl.scan_parquet(self.parquet_path)

        for step in self.pipeline_steps:
            if not step.get("enabled",True):
                continue
            lf = self._apply_single_step(lf,step)

        return lf

    def _apply_single_step(self, lf:pl.LazyFrame, step:dict) -> pl.LazyFrame:
        t = step["type"]
        p = step["params"]

        if t == "drop_nulls":
            return lf.drop_nulls(subset=p.get("columns"))
        elif t=="fill_null":
            return lf.with_columns(pl.col(p['column']).fill_null(p['value']))
        elif t == 'drop_duplicates':
            return lf.unique(subset=p.get("columns"),keep="first")
        elif t=='filter':
            col,op,val = pl.col(p['column']), p['operator'],p['value']
            if op == 'eq': return lf.filter(col==val)
            if op == 'gt': return lf.filter(col>val)
            if op == 'lt': return lf.filter(col<val)
        elif t=='cast':
            type_map = {"Int64":pl.Int64,'Float64':pl.Float64,'String':pl.String,'Boolean':pl.Boolean}
            if p['target_type'] in type_map:
                return lf.with_columns(pl.col(p['column']).cast(type_map[p['target_type']], strict=False))
        return lf

    def add_step(self, step_type:str,params:dict):
        self.pipeline_steps.append({
            "step_id":str(uuid.uuid4())[:8],
            "type":step_type,
            'enabled':True,
            "params":params
        })
        self._refresh_metadata()

    def undo_last_step(self):
        if self.pipeline_steps:
            self.pipeline_steps.pop()
            self._refresh_metadata()

    def get_preview(self,offset:int=0,limit:int=50)->dict:
        lf = self.get_lazy_frame()
        df_page = lf.slice(offset, limit).collect()
        return {
            'file_id': self.filename,
            "total_rows": self.rows_count,
            'columns': self.columns,
            "column_types": self.columns,
            'steps': self.pipeline_steps,
            "data": df_page.to_dicts()
        }

    def get_profile(self)->dict:
        df = self.get_lazy_frame().collect()
        profile = {}
        for col in df.columns:
            s = df[col]
            profile[col] ={
                'dtype': str(s.dtype),
                'null_count':s.null_count(),
                'unique_count': s.n_unique(),
                'min':s.min() if s.dtype.is_numeric() else None,
                'max':s.max() if s.dtype.is_numeric() else None
            }
        return profile

    def to_pandas(self) -> pd.DataFrame:
        return self.get_lazy_frame().collect().to_pandas()

    def _refresh_metadata(self):
        lf = self.get_lazy_frame()
        schema = lf.collect_schema()
        self.columns = {col:str(dtype) for col, dtype in schema.items()}
        self.rows_count = lf.select(pl.len()).collect().item()
