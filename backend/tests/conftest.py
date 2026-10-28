import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_registry
from app.main import app
from app.services.datasets.registry import DatasetRegistry

SALES_CSV = (
    "region,produkt,sprzedaz,ilosc\n"
    "Kraków,A,100,10\n"
    "Warszawa,B,,5\n"
    "Kraków,B,300,30\n"
    "Gdańsk,A,200,20\n"
).encode()


@pytest.fixture
def registry(tmp_path) -> DatasetRegistry:
    # Każdy test ma własny katalog na pliki Parquet
    return DatasetRegistry(str(tmp_path / "datasets"))


@pytest.fixture
def client(registry):
    app.dependency_overrides[get_registry] = lambda: registry
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def upload(client):
    """Wgrywa plik przez API i zwraca odpowiedź jako słownik."""

    def _upload(content: bytes = SALES_CSV, file_name: str = "sprzedaz.csv") -> dict:
        res = client.post("/upload-csv", files={"file": (file_name, content, "text/csv")})
        assert res.status_code == 200, res.text
        return res.json()

    return _upload
