import pytest

from app.exceptions import DatasetNotFoundError, InvalidRequestError
from app.services.datasets.registry import DatasetRegistry
from tests.conftest import SALES_CSV


def test_load_and_get(registry):
    manager = registry.load("sprzedaz.csv", SALES_CSV)

    assert registry.get("sprzedaz.csv") is manager
    assert manager.rows_count == 4
    assert manager.columns["sprzedaz"] == "Int64"


def test_lazy_frame_includes_pipeline_steps(registry):
    manager = registry.load("sprzedaz.csv", SALES_CSV)
    manager.add_step("drop_nulls", {"columns": ["sprzedaz"]})

    assert registry.get_lazy_frame("sprzedaz.csv").collect().height == 3


def test_lazy_frame_falls_back_to_parquet_after_restart(registry):
    registry.load("sprzedaz.csv", SALES_CSV)
    # Nowy rejestr na tym samym katalogu udaje restart serwera
    restarted = DatasetRegistry(registry.storage_dir)

    assert restarted.get_lazy_frame("sprzedaz.csv").collect().height == 4
    with pytest.raises(DatasetNotFoundError):
        restarted.get("sprzedaz.csv")


def test_unknown_dataset(registry):
    with pytest.raises(DatasetNotFoundError):
        registry.get("brak.csv")
    with pytest.raises(DatasetNotFoundError):
        registry.get_lazy_frame("brak.csv")


def test_unsupported_format(registry):
    with pytest.raises(InvalidRequestError):
        registry.load("dane.xlsx", b"")
