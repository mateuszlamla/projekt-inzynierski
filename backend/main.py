import base64

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
from file_manager import DatasetManager
from services.aggregation import (
    aggregate_data,
    compute_summary,
    generate_bar_code_polars,
    get_lazy_frame_for_file,
    AGGREGATION_LABELS,
)
from services.downsampling import downsample_lttb
from services.descriptive_stats import describe

matplotlib.use("agg")
import io
import numpy as np
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

data_store = {}
dataset_managers = {}

class LinearRegressionRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str


@app.post('/upload-csv')
async def upload_csv(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        ext = file.filename.split(".")[-1].lower()
        file_id = file.filename

        manager = DatasetManager(file_name=file_id, source_type=ext)
        manager.load_file(contents)
        dataset_managers[file_id] = manager

        data_store[file_id] = manager.to_pandas()

        return {
            'status': 'success',
            'file_id': file_id,
            'columns': list(manager.columns.keys()),
            'column_types': manager.columns,
            'rows_count': manager.rows_count
        }
    except Exception as e:
        import traceback
        traceback.print_exc()  # Wypisze dokładny błąd w terminalu Pythona
        return {"status": "error", "error": str(e), "columns": [], "rows_count": 0}

from typing import Optional, List, Any
import time


class ChartFilter(BaseModel):
    column: str
    operator: str = "eq"  # eq, neq, gt, gte, lt, lte, contains, in, not_in, is_null, not_null
    value: Optional[Any] = None


class BarChartRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str
    aggregation: str = "sum"  # sum, mean, count, min, max, median
    sort_order: str = "none"  # none, desc, asc, alpha
    limit: Optional[int] = None  # np. 5, 10, 20, None
    orientation: str = "vertical"  # vertical, horizontal
    color: str = "#a855f7"  # hex
    palette: str = "custom"  # custom, viridis, plasma, magma, coolwarm, tab10, Pastel1
    title: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    show_grid: bool = True
    show_values: bool = False
    rotation: int = 45  # 0, 45, 90
    theme: str = "white"  # white, dark, minimal
    filters: Optional[List[ChartFilter]] = None


def generate_bar_code(req: BarChartRequest, agg_name: str, title: str) -> str:
    return generate_bar_code_polars(
        file_id=req.file_id,
        x_col=req.x_col,
        y_col=req.y_col,
        aggregation=req.aggregation,
        sort_order=req.sort_order,
        limit=req.limit,
        orientation=req.orientation,
        color=req.color,
        rotation=req.rotation,
        show_grid=req.show_grid,
        title=title,
        x_label=req.x_label,
        y_label=req.y_label,
    )


@app.post("/plot/bar")
def get_plot_bar(req: BarChartRequest):
    try:
        lf = get_lazy_frame_for_file(req.file_id, dataset_managers, data_store)
    except Exception as e:
        return {"error": f"Plik nie został znaleziony: {str(e)}"}

    try:
        filters_list = [f.model_dump() for f in req.filters] if req.filters else None
        df_agg = aggregate_data(
            lf=lf,
            x_col=req.x_col,
            y_col=req.y_col,
            aggregation=req.aggregation,
            sort_order=req.sort_order,
            limit=req.limit,
            filters=filters_list,
        )

        if len(df_agg) == 0:
            return {"error": "Brak danych po agregacji"}

        cats = [str(c) for c in df_agg[req.x_col].to_list()]
        vals = [float(v) if v is not None else 0.0 for v in df_agg[req.y_col].to_list()]
        agg_name = AGGREGATION_LABELS.get(req.aggregation, "Wartość")

        fig, ax = plt.subplots(figsize=(8, 5), dpi=120)

        # Motywy
        if req.theme == "dark":
            fig.patch.set_facecolor("#0f172a")
            ax.set_facecolor("#1e293b")
            ax.tick_params(colors="#cbd5e1", labelsize=9)
            for spine in ax.spines.values():
                spine.set_color("#475569")
            text_color = "#f8fafc"
            grid_color = "#334155"
        elif req.theme == "minimal":
            fig.patch.set_facecolor("#ffffff")
            ax.set_facecolor("#ffffff")
            for spine in ["top", "right"]:
                ax.spines[spine].set_visible(False)
            for spine in ["left", "bottom"]:
                ax.spines[spine].set_color("#94a3b8")
            ax.tick_params(colors="#475569", labelsize=9)
            text_color = "#0f172a"
            grid_color = "#f1f5f9"
        else:  # white / default
            fig.patch.set_facecolor("#ffffff")
            ax.set_facecolor("#f8fafc")
            for spine in ax.spines.values():
                spine.set_color("#cbd5e1")
            ax.tick_params(colors="#334155", labelsize=9)
            text_color = "#0f172a"
            grid_color = "#e2e8f0"

        # Paleta barw
        if req.palette and req.palette != "custom":
            try:
                cmap = plt.get_cmap(req.palette)
                num_items = max(1, len(cats))
                bar_colors = [cmap(i / max(1, num_items - 1)) if num_items > 1 else cmap(0.5) for i in range(num_items)]
            except Exception:
                bar_colors = req.color
        else:
            bar_colors = req.color

        title_text = req.title.strip() if req.title and req.title.strip() else f"{agg_name} {req.y_col} wg {req.x_col}"
        x_lbl = req.x_label.strip() if req.x_label and req.x_label.strip() else req.x_col
        y_lbl = req.y_label.strip() if req.y_label and req.y_label.strip() else f"{agg_name} {req.y_col}"

        if req.orientation == "horizontal":
            cats_plot = cats[::-1]
            vals_plot = vals[::-1]
            if isinstance(bar_colors, list):
                bar_colors = bar_colors[::-1]

            bars = ax.barh(cats_plot, vals_plot, color=bar_colors, edgecolor="none", alpha=0.9, height=0.6)
            if req.show_grid:
                ax.grid(True, axis="x", linestyle="--", alpha=0.6, color=grid_color)
            ax.set_xlabel(y_lbl, color=text_color, fontsize=10, fontweight="600")
            ax.set_ylabel(x_lbl, color=text_color, fontsize=10, fontweight="600")
            if req.show_values:
                fmt = "%.1f" if req.aggregation == "mean" else "%g"
                ax.bar_label(bars, fmt=fmt, padding=4, color=text_color, fontsize=8)
        else:
            bars = ax.bar(cats, vals, color=bar_colors, edgecolor="none", alpha=0.9, width=0.6)
            if req.show_grid:
                ax.grid(True, axis="y", linestyle="--", alpha=0.6, color=grid_color)
            ax.set_xlabel(x_lbl, color=text_color, fontsize=10, fontweight="600")
            ax.set_ylabel(y_lbl, color=text_color, fontsize=10, fontweight="600")
            ax.tick_params(axis="x", rotation=req.rotation)
            if req.show_values:
                fmt = "%.1f" if req.aggregation == "mean" else "%g"
                ax.bar_label(bars, fmt=fmt, padding=3, color=text_color, fontsize=8)

        ax.set_title(title_text, color=text_color, fontsize=12, fontweight="bold", pad=14)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=120)
        plt.close(fig)

        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode("utf-8")

        generated_code = generate_bar_code(req, agg_name, title_text)
        summary = compute_summary(df_agg, req.y_col)

        return {
            "status": "success",
            "image": image_base64,
            "code": generated_code,
            "summary": summary
        }
    except Exception as e:
        plt.close()
        return {"error": f"Błąd generowania wykresu: {str(e)}"}


@app.get("/plot/bar")
def get_plot_bar_legacy(file_id: str, x_col: str, y_col: str):
    return get_plot_bar(BarChartRequest(file_id=file_id, x_col=x_col, y_col=y_col))


@app.get("/plot/line")
def get_plot_line(file_id: str, x_col: str, y_col: str, downsample_threshold: int = 1000):
    try:
        lf = get_lazy_frame_for_file(file_id, dataset_managers, data_store)
        df_agg = aggregate_data(lf, x_col=x_col, y_col=y_col, aggregation="sum", sort_order="alpha")
        if len(df_agg) == 0:
            return {"error": "Brak danych po agregacji"}

        cats = [str(c) for c in df_agg[x_col].to_list()]
        vals = [float(v) if v is not None else 0.0 for v in df_agg[y_col].to_list()]

        # Automatyczny downsampling LTTB dla wykresów z > 5000 punktów (Task 1.3)
        if len(cats) > 5000:
            cats, vals, _ = downsample_lttb(cats, vals, threshold=downsample_threshold)

        plt.figure(figsize=(6, 4))
        plt.plot(cats, vals, marker="o" if len(cats) <= 50 else "", color="#2563eb", linewidth=2, markersize=5 if len(cats) <= 50 else 0)
        plt.xlabel(x_col)
        plt.ylabel(y_col)
        plt.title(f"{y_col} wg {x_col}")
        plt.xticks(rotation=45, ha="right")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=100)
        plt.close()

        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode("utf-8")

        return {"image": image_base64}
    except Exception as e:
        plt.close()
        return {"error": f"Błąd generowania wykresu: {str(e)}"}


class ChartDataRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str
    aggregation: str = "sum"  # sum, mean, count, min, max, median, none, raw
    sort_order: str = "none"  # none, desc, asc, alpha
    limit: Optional[int] = None
    chart_type: Optional[str] = "bar"  # bar, line, scatter, pie, area, etc.
    filters: Optional[List[ChartFilter]] = None
    downsample: Optional[bool] = None  # None: auto (gdy > 5000 dla line/raw), True: wymuszone, False: wyłączone
    downsample_threshold: Optional[int] = 1000  # Próg docelowej liczby punktów LTTB


@app.post("/api/chart/data")
def get_chart_data(req: ChartDataRequest):
    """
    Zwraca zagregowane lub przefiltrowane surowe dane wykresu w formacie JSON
    wyliczone w Polars (Task 1.2 & 1.3).
    Dla wykresów liniowych o liczbie punktów > 5000 automatycznie wykonuje downsampling LTTB.
    Zapewnia błyskawiczną odpowiedź dla interaktywnego frontendu (Plotly.js / Vega-Lite).
    Format odpowiedzi: { "status": "success", "x": [...], "y": [...], "meta": { ... } }
    """
    start_time = time.perf_counter()
    try:
        lf = get_lazy_frame_for_file(req.file_id, dataset_managers, data_store)
        filters_list = [f.model_dump() for f in req.filters] if req.filters else None

        df_agg = aggregate_data(
            lf=lf,
            x_col=req.x_col,
            y_col=req.y_col,
            aggregation=req.aggregation,
            sort_order=req.sort_order,
            limit=req.limit,
            filters=filters_list,
        )

        # Bezpieczna serializacja x (daty/datetimes do isoformat, int/float/string zachowane)
        x_raw = df_agg[req.x_col].to_list()
        cats = [
            v.isoformat() if hasattr(v, "isoformat") else (str(v) if v is not None else "")
            if isinstance(v, (str, bool)) or hasattr(v, "isoformat")
            else v
            for v in x_raw
        ]
        vals = [float(v) if v is not None else 0.0 for v in df_agg[req.y_col].to_list()]
        summary = compute_summary(df_agg, req.y_col)

        # Algorytm downsamplingu LTTB dla wykresów liniowych (Task 1.3)
        threshold = req.downsample_threshold or 1000
        should_downsample = False
        chart_type_norm = (req.chart_type or "bar").lower()

        if req.downsample is True:
            should_downsample = True
        elif req.downsample is None:
            # Automatyczny downsampling dla wykresu liniowego/szeregu czasowego przy > 5000 punktów (Task 1.3)
            is_line_series = chart_type_norm in ["line", "area"]
            should_downsample = is_line_series and len(cats) > 5000

        downsampling_meta = {
            "downsampled": False,
            "algorithm": "none",
            "original_points": len(cats),
            "points_count": len(cats),
            "threshold": threshold,
        }

        if should_downsample and len(cats) > threshold:
            cats, vals, downsampling_meta = downsample_lttb(cats, vals, threshold=threshold)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        meta = {
            "file_id": req.file_id,
            "x_col": req.x_col,
            "y_col": req.y_col,
            "aggregation": req.aggregation,
            "chart_type": req.chart_type or "bar",
            "sort_order": req.sort_order,
            "limit": req.limit,
            "filters_applied": len(req.filters) if req.filters else 0,
            "returned_rows": len(cats),
            "summary": summary,
            "downsampling": downsampling_meta,
            "execution_time_ms": duration_ms,
        }

        return {
            "status": "success",
            "x": cats,
            "y": vals,
            "meta": meta,
            "summary": summary,
            "rows_count": len(cats),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "x": [],
            "y": [],
            "meta": {},
            "summary": {},
            "rows_count": 0,
        }



class AddStepRequest(BaseModel):
    file_id:str
    step_type:str
    params:dict

@app.get("/data/view")
def view_data(file_id: str, offset:int=0,limit: int = 50):
    if file_id not in dataset_managers:
        return {"error": "File not found"}

    return dataset_managers[file_id].get_preview(offset=offset, limit=limit)

@app.get("/data/profile")
def profile_data(file_id: str):
    if file_id not in dataset_managers:
        return {"error": "File not found"}
    return dataset_managers[file_id].get_profile()

@app.post("/data/pipeline/add")
def add_pipeline_step(req:AddStepRequest):
    if req.file_id not in dataset_managers:
        return {"error": "File not found"}

    manager = dataset_managers[req.file_id]
    manager.add_step(step_type=req.step_type, params=req.params)

    data_store[req.file_id] = manager.to_pandas()

    return manager.get_preview(offset=0,limit=50)

@app.post("/data/pipeline/undo")
def undo_pipeline_step(file_id:str):
    if file_id not in dataset_managers:
        return {"error": "File not found"}
    manager = dataset_managers[file_id]
    manager.undo_last_step()

    data_store[file_id] = manager.to_pandas()
    return manager.get_preview(offset=0,limit=50)


class DescriptiveStatsRequest(BaseModel):
    file_id: str
    columns: Optional[List[str]] = None  # None: wszystkie kolumny


@app.post("/analysis/descriptive")
def descriptive_statistics(req: DescriptiveStatsRequest):
    """
    Statystyki opisowe wybranych kolumn, liczone na danych po krokach czyszczenia z potoku.
    """
    try:
        lf = get_lazy_frame_for_file(req.file_id, dataset_managers, data_store)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        result = describe(lf, req.columns)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {"status": "success", "file_id": req.file_id, **result}


@app.post("/ml/linear_regression")
def train_linear_regression(req: LinearRegressionRequest):
    if req.file_id not in data_store:
        return {"error": "File not found"}
    df = data_store[req.file_id]
    if req.x_col not in df.columns or req.y_col not in df.columns:
        return {"error": "Column not found"}
    try:
        subset = df[[req.x_col, req.y_col]].copy()
        subset[req.x_col] = pd.to_numeric(subset[req.x_col], errors='coerce')
        subset[req.y_col] = pd.to_numeric(subset[req.y_col], errors='coerce')
        subset.dropna(inplace=True)

        if len(subset) < 2:
            return {"error": "Za mało danych do regresji"}

        X = subset[req.x_col].values
        y = subset[req.y_col].values

        # Obliczenie regresji liniowej za pomocą NumPy (omija blokady DLL AppLocker/WDAC)
        p = np.polyfit(X, y, 1)
        slope = float(p[0])
        intercept = float(p[1])
        y_pred = slope * X + intercept

        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r2 = float(1 - (ss_res / ss_tot)) if ss_tot != 0 else 0.0

        plt.figure(figsize=(6, 4))
        plt.scatter(subset[req.x_col], subset[req.y_col], color="#64748b", alpha=0.6, label='Dane')
        plt.plot(subset[req.x_col], y_pred, color="#eab308", linewidth=2.5, label="Linia trendu")
        plt.xlabel(req.x_col)
        plt.ylabel(req.y_col)
        plt.title(f"Regresja liniowa: {req.y_col} vs {req.x_col} (R^2 = {r2:.2f})")
        plt.grid(True, linestyle="--", alpha=0.4)
        plt.legend()
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=100)
        plt.close()
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode("utf-8")

        return {
            "status": "success",
            "image": image_base64,
            "slope": slope,
            "intercept": intercept,
            "r2_score": r2,
            "formula": f"{req.y_col} = {slope:.2f} * {req.x_col} + {intercept:.2f}",
            "samples_count": len(subset)
        }
    except Exception as e:
        plt.close()
        return {"error": f"Błąd generowania regresji: {str(e)}"}