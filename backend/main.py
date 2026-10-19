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

@app.get("/plot/bar")
def get_plot_bar(file_id: str, x_col: str, y_col: str):
    if file_id not in data_store:
        return {"error":"File not found"}
    df = data_store[file_id]
    if x_col not in df.columns or y_col not in df.columns:
        return {"error":"Column not found"}

    try:
        temp_df = df.copy()
        temp_df[y_col] = pd.to_numeric(temp_df[y_col], errors="coerce")
        aggregated = temp_df.groupby(x_col)[y_col].sum().reset_index()

        plt.figure(figsize = (6,4))
        plt.bar(aggregated[x_col].astype(str), aggregated[y_col], color="#a855f7")
        plt.xlabel(x_col)
        plt.ylabel(y_col)
        plt.title(f"{y_col} wg {x_col}")
        plt.xticks(rotation=45, ha="right")
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