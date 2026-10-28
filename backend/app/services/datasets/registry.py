import os

import polars as pl

from app.exceptions import DatasetNotFoundError
from app.services.datasets.dataset_manager import DatasetManager


class DatasetRegistry:
    """
    Zbiory danych wgrane w bieżącym procesie serwera, dostępne po file_id (nazwie pliku).
    """

    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir
        self._managers: dict[str, DatasetManager] = {}

    def load(self, file_name: str, content: bytes) -> DatasetManager:
        source_type = file_name.split(".")[-1].lower()
        manager = DatasetManager(file_name, source_type, self.storage_dir)
        manager.load_file(content)
        self._managers[file_name] = manager
        return manager

    def get(self, file_id: str) -> DatasetManager:
        manager = self._managers.get(file_id)
        if manager is None:
            raise DatasetNotFoundError(f"Plik '{file_id}' nie został znaleziony.")
        return manager

    def get_lazy_frame(self, file_id: str) -> pl.LazyFrame:
        """
        Dane po krokach czyszczenia. Gdy zbioru nie ma w pamięci (np. po restarcie
        serwera), czyta zapisany wcześniej plik Parquet bez kroków potoku.
        """
        if file_id in self._managers:
            return self._managers[file_id].get_lazy_frame()

        parquet_path = os.path.join(self.storage_dir, f"{file_id}.parquet")
        if os.path.exists(parquet_path):
            return pl.scan_parquet(parquet_path)

        raise DatasetNotFoundError(
            f"Plik '{file_id}' nie został znaleziony w pamięci ani w magazynie storage."
        )
