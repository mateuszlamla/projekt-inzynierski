import json

import openai

from app.constants.system_prompts import DESCRIBE_RESULTS_PROMPT
from app.exceptions import ServiceUnavailableError
from app.services.ai.base import ResultDescriber
from app.utils.llm_call import generate_text


class LlmDescriber(ResultDescriber):
    """Opisy generowane przez dowolny model dostępny przez API zgodne z OpenAI."""

    def __init__(
        self,
        client: openai.OpenAI,
        model_name: str,
        timeout_s: float = 60.0,
        temperature: float = 0.2,
    ):
        self.client = client
        self.model_name = model_name
        self.timeout_s = timeout_s
        self.temperature = temperature

    def describe(self, heading: str, facts: dict) -> str:
        user_message = json.dumps(
            {"sekcja": heading, "wyniki": facts}, ensure_ascii=False, default=str
        )
        try:
            text = generate_text(
                self.client,
                self.model_name,
                DESCRIBE_RESULTS_PROMPT,
                user_message,
                temperature=self.temperature,
                timeout_s=self.timeout_s,
            )
        # APITimeoutError dziedziczy po APIConnectionError, więc musi być sprawdzany pierwszy
        except openai.APITimeoutError as exc:
            raise ServiceUnavailableError(
                f"Model {self.model_name} nie odpowiedział w ciągu {self.timeout_s:g} s."
            ) from exc
        except openai.APIConnectionError as exc:
            raise ServiceUnavailableError(
                f"Brak połączenia z modelem językowym pod adresem {self.client.base_url}. "
                "Sprawdź, czy serwer modelu działa (np. docker compose --profile ai up)."
            ) from exc
        except openai.APIStatusError as exc:
            raise ServiceUnavailableError(
                f"Model językowy zwrócił błąd {exc.status_code}: {exc.message}"
            ) from exc
        except ValueError as exc:
            raise ServiceUnavailableError("Model językowy zwrócił pustą odpowiedź.") from exc

        # Mniejsze modele mimo instrukcji czasem pogrubiają tekst w Markdown
        return text.replace("**", "").replace("__", "")
