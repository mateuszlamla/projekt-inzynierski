from functools import lru_cache

from app.config import get_settings
from app.services.datasets.registry import DatasetRegistry


@lru_cache(maxsize=1)
def get_registry() -> DatasetRegistry:
    """
    Wspólny rejestr zbiorów danych dla całego procesu serwera.
    W testach podmieniany przez app.dependency_overrides.
    """
    return DatasetRegistry(get_settings().storage_dir)
