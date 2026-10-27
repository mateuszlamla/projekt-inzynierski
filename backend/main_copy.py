import base64

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
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

data_store ={}

class LinearRegressionRequest(BaseModel):
    file_id:str
    x_col:str
    y_col:str
    

@app.post('/upload-csv')
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()

    df = pd.read_csv(io.BytesIO(contents))

    file_id = file.filename
    data_store[file_id] = df

    return {
        'status': 'success',
        'file_id': file_id,
        'columns': df.columns.to_list(),
        'rows_count': len(df)
    }

from typing import Optional

class BarChartRequest(BaseModel):
    file_id: str
    x_col: str
    y_col: str
    aggregation: str = "sum"        # sum, mean, count, min, max, median
    sort_order: str = "none"        # none, desc, asc, alpha
    limit: Optional[int] = None     # np. 5, 10, 20, None
    orientation: str = "vertical"   # vertical, horizontal
    color: str = "#a855f7"          # hex
    palette: str = "custom"         # custom, viridis, plasma, magma, coolwarm, tab10, Pastel1
    title: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    show_grid: bool = True
    show_values: bool = False
    rotation: int = 45              # 0, 45, 90
    theme: str = "white"            # white, dark, minimal

def generate_bar_code(req: BarChartRequest, agg_name: str, title: str) -> str:
    lines = [
        "# Wygenerowane automatycznie przez platformę DataFlow Builder",
        "import pandas as pd",
        "import matplotlib.pyplot as plt",
        "",
        "# 1. Wczytanie danych z pliku",
        f"df = pd.read_csv('{req.file_id}')",
        "",
        "# 2. Selekcja kolumn i czyszczenie",
        f"temp_df = df[['{req.x_col}', '{req.y_col}']].dropna().copy()",
    ]
    if req.aggregation != "count":
        lines.append(f"temp_df['{req.y_col}'] = pd.to_numeric(temp_df['{req.y_col}'], errors='coerce')")
        lines.append("temp_df = temp_df.dropna()")

    lines.append("")
    lines.append(f"# 3. Agregacja danych: {agg_name}")
    if req.aggregation == "count":
        lines.append(f"agg = temp_df.groupby('{req.x_col}')['{req.y_col}'].count().reset_index()")
    else:
        lines.append(f"agg = temp_df.groupby('{req.x_col}')['{req.y_col}'].{req.aggregation}().reset_index()")

    if req.sort_order == "desc":
        lines.append(f"agg = agg.sort_values(by='{req.y_col}', ascending=False)")
    elif req.sort_order == "asc":
        lines.append(f"agg = agg.sort_values(by='{req.y_col}', ascending=True)")
    elif req.sort_order == "alpha":
        lines.append(f"agg = agg.sort_values(by='{req.x_col}', ascending=True)")

    if req.limit and req.limit > 0:
        lines.append(f"agg = agg.head({req.limit})")

    lines.append("")
    lines.append("# 4. Rysowanie wykresu")
    lines.append("plt.figure(figsize=(8, 5), dpi=100)")
    if req.orientation == "horizontal":
        lines.append(f"plt.barh(agg['{req.x_col}'].astype(str), agg['{req.y_col}'], color='{req.color}')")
        lines.append(f"plt.xlabel('{req.x_label or (agg_name + ' ' + req.y_col)}')")
        lines.append(f"plt.ylabel('{req.y_label or req.x_col}')")
    else:
        lines.append(f"plt.bar(agg['{req.x_col}'].astype(str), agg['{req.y_col}'], color='{req.color}')")
        lines.append(f"plt.xlabel('{req.x_label or req.x_col}')")
        lines.append(f"plt.ylabel('{req.y_label or (agg_name + ' ' + req.y_col)}')")
        lines.append(f"plt.xticks(rotation={req.rotation}, ha='right')")

    lines.append(f"plt.title('{title}')")
    if req.show_grid:
        lines.append("plt.grid(True, linestyle='--', alpha=0.5)")
    lines.append("plt.tight_layout()")
    lines.append("plt.show()")
    return "\n".join(lines)

@app.post("/plot/bar")
def get_plot_bar(req: BarChartRequest):
    if req.file_id not in data_store:
        return {"error": "Plik nie został znaleziony w pamięci"}
    df = data_store[req.file_id]
    if req.x_col not in df.columns or req.y_col not in df.columns:
        return {"error": "Kolumna nie istnieje w wybranym pliku"}

    try:
        temp_df = df[[req.x_col, req.y_col]].dropna().copy()
        if req.aggregation != "count":
            temp_df[req.y_col] = pd.to_numeric(temp_df[req.y_col], errors="coerce")
            temp_df = temp_df.dropna()

        if len(temp_df) == 0:
            return {"error": "Brak poprawnych danych po oczyszczeniu"}

        agg_labels = {
            "sum": "Suma",
            "mean": "Średnia",
            "count": "Liczność",
            "min": "Minimum",
            "max": "Maksimum",
            "median": "Mediana"
        }
        agg_name = agg_labels.get(req.aggregation, "Wartość")

        if req.aggregation == "count":
            aggregated = temp_df.groupby(req.x_col)[req.y_col].count().reset_index()
        else:
            agg_method = req.aggregation if req.aggregation in ["sum", "mean", "min", "max", "median"] else "sum"
            aggregated = temp_df.groupby(req.x_col)[req.y_col].agg(agg_method).reset_index()

        if req.sort_order == "desc":
            aggregated = aggregated.sort_values(by=req.y_col, ascending=False)
        elif req.sort_order == "asc":
            aggregated = aggregated.sort_values(by=req.y_col, ascending=True)
        elif req.sort_order == "alpha":
            aggregated = aggregated.sort_values(by=req.x_col, ascending=True)

        if req.limit and req.limit > 0:
            aggregated = aggregated.head(req.limit)

        if len(aggregated) == 0:
            return {"error": "Brak danych po agregacji"}

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
                num_items = max(1, len(aggregated))
                bar_colors = [cmap(i / max(1, num_items - 1)) if num_items > 1 else cmap(0.5) for i in range(num_items)]
            except Exception:
                bar_colors = req.color
        else:
            bar_colors = req.color

        cats = [str(c) for c in aggregated[req.x_col].tolist()]
        vals = aggregated[req.y_col].tolist()

        title_text = req.title.strip() if req.title and req.title.strip() else f"{agg_name} {req.y_col} wg {req.x_col}"
        x_lbl = req.x_label.strip() if req.x_label and req.x_label.strip() else req.x_col
        y_lbl = req.y_label.strip() if req.y_label and req.y_label.strip() else f"{agg_name} {req.y_col}"

        if req.orientation == "horizontal":
            cats = cats[::-1]
            vals = vals[::-1]
            if isinstance(bar_colors, list):
                bar_colors = bar_colors[::-1]

            bars = ax.barh(cats, vals, color=bar_colors, edgecolor="none", alpha=0.9, height=0.6)
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
        val_series = pd.Series(vals)

        return {
            "status": "success",
            "image": image_base64,
            "code": generated_code,
            "summary": {
                "categories_count": len(aggregated),
                "total_sum": float(val_series.sum()),
                "mean": float(val_series.mean()),
                "min": float(val_series.min()),
                "max": float(val_series.max()),
            }
        }
    except Exception as e:
        plt.close()
        return {"error": f"Błąd generowania wykresu: {str(e)}"}

@app.get("/plot/bar")
def get_plot_bar_legacy(file_id: str, x_col: str, y_col: str):
    return get_plot_bar(BarChartRequest(file_id=file_id, x_col=x_col, y_col=y_col))

@app.get("/plot/line")
def get_plot_line(file_id: str, x_col: str, y_col: str):
    if file_id not in data_store:
        return {"error": "File not found"}
    df = data_store[file_id]
    if x_col not in df.columns or y_col not in df.columns:
        return {"error": "Column not found"}

    try:
        temp_df = df.copy()
        temp_df[y_col] = pd.to_numeric(temp_df[y_col], errors="coerce")
        aggregated = temp_df.groupby(x_col)[y_col].sum().reset_index()

        plt.figure(figsize=(6, 4))
        plt.plot(aggregated[x_col].astype(str), aggregated[y_col], marker="o", color="#2563eb", linewidth=2, markersize=5)
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

@app.get("/data/view")
def view_data(file_id: str, limit: int = 50):
    if file_id not in data_store:
        return {"error": "File not found"}

    df = data_store[file_id]
    data_subset = df.head(limit)
    data_subset = data_subset.where(pd.notnull(data_subset), None)
    return {
        "columns": df.columns.to_list(),
        "data": data_subset.to_dict(orient="records")
    }

@app.post("/ml/linear_regression")
def train_linear_regression(req: LinearRegressionRequest):
    if req.file_id not in data_store:
        return {"error": "File not found"}
    df = data_store[req.file_id]
    if req.x_col not in df.columns  or req.y_col not in df.columns:
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

        plt.figure(figsize=(6,4))
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
            "formula": f"{req.y_col} = {slope:.2f} * {req.x_col} + {intercept:.2f}" ,
            "samples_count": len(subset)
        }
    except Exception as e:
        plt.close()
        return {"error": f"Błąd generowania regresji: {str(e)}"}