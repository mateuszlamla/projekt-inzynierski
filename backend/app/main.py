from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.exceptions import register_exception_handlers
from app.routers import analysis, charts, datasets, pipeline, reports

app = FastAPI(title="DataFlow Builder", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    # Frontend czyta z tego nagłówka nazwę pobieranego pliku PDF
    expose_headers=["Content-Disposition"],
)
register_exception_handlers(app)

app.include_router(datasets.router)
app.include_router(pipeline.router)
app.include_router(charts.router)
app.include_router(analysis.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
