from functools import lru_cache

from openai import OpenAI

from app.config import get_settings
from app.services.ai.base import ResultDescriber
from app.services.ai.llm_describer import LlmDescriber
from app.services.datasets.registry import DatasetRegistry


@lru_cache(maxsize=1)
def get_registry() -> DatasetRegistry:
    """
    Wspólny rejestr zbiorów danych dla całego procesu serwera.
    W testach podmieniany przez app.dependency_overrides.
    """
    return DatasetRegistry(get_settings().storage_dir)


@lru_cache(maxsize=1)
def get_describer() -> ResultDescriber:
    """
    Opisujący wyniki model językowy skonfigurowany zmiennymi LLM_*.
    Utworzenie klienta nie łączy się jeszcze z serwerem modelu.
    """
    settings = get_settings()
    # Jedna ponowna próba po błędzie sieci; dłuższe czekanie ogranicza llm_timeout_s
    client = OpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key, max_retries=1)
    return LlmDescriber(
        client,
        settings.llm_model,
        timeout_s=settings.llm_timeout_s,
        temperature=settings.llm_temperature,
    )
