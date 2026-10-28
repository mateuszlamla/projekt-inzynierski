from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Konfiguracja aplikacji. Każdą wartość można nadpisać zmienną środowiskową
    o tej samej nazwie (np. STORAGE_DIR) albo wpisem w pliku .env.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Katalog na pliki Parquet z wgranymi zbiorami danych
    storage_dir: str = "storage/datasets"
    # Lista JSON, np. CORS_ORIGINS='["http://localhost:5173"]'
    cors_origins: list[str] = ["*"]
    # Liczba wierszy podglądu zwracana po zmianie kroków potoku
    preview_limit: int = 50


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
