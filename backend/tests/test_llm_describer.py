import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import httpx
import openai
import pytest

from app.constants.system_prompts import DESCRIBE_RESULTS_PROMPT
from app.exceptions import ServiceUnavailableError
from app.services.ai.llm_describer import LlmDescriber
from app.utils.llm_call import generate_text

REQUEST = httpx.Request("POST", "http://ollama:11434/v1/chat/completions")


def _client(content=None, error=None) -> MagicMock:
    client = MagicMock()
    client.base_url = "http://ollama:11434/v1/"
    if error is not None:
        client.chat.completions.create.side_effect = error
    else:
        message = SimpleNamespace(content=content)
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=message)]
        )
    return client


def test_generate_text_sends_system_and_user_messages():
    client = _client("  Opis wyników.  ")

    text = generate_text(client, "gemma3:4b", "system", "dane", temperature=0.3, timeout_s=12)

    assert text == "Opis wyników."
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "gemma3:4b"
    assert kwargs["messages"] == [
        {"role": "system", "content": "system"},
        {"role": "user", "content": "dane"},
    ]
    assert kwargs["temperature"] == 0.3
    assert kwargs["timeout"] == 12


@pytest.mark.parametrize("content", [None, "   "])
def test_generate_text_rejects_empty_answer(content):
    with pytest.raises(ValueError):
        generate_text(_client(content), "gemma3:4b", "system", "dane")


def test_describer_sends_heading_and_facts_as_json():
    client = _client("Średnia sprzedaż wynosi **200**.")
    describer = LlmDescriber(client, "gemma3:4b", timeout_s=30)

    text = describer.describe("Statystyki opisowe", {"liczba_wierszy": 4})

    # Pogrubienie Markdown jest usuwane z odpowiedzi
    assert text == "Średnia sprzedaż wynosi 200."
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["messages"][0]["content"] == DESCRIBE_RESULTS_PROMPT
    assert json.loads(kwargs["messages"][1]["content"]) == {
        "sekcja": "Statystyki opisowe",
        "wyniki": {"liczba_wierszy": 4},
    }
    assert kwargs["timeout"] == 30


@pytest.mark.parametrize(
    ("error", "message_part"),
    [
        (openai.APITimeoutError(request=REQUEST), "nie odpowiedział w ciągu 30 s"),
        (
            openai.APIConnectionError(request=REQUEST),
            "Brak połączenia z modelem językowym pod adresem http://ollama:11434/v1/",
        ),
        (
            openai.NotFoundError(
                "model 'gemma3:4b' not found",
                response=httpx.Response(404, request=REQUEST),
                body=None,
            ),
            "Model językowy zwrócił błąd 404: model 'gemma3:4b' not found",
        ),
    ],
)
def test_describer_turns_api_errors_into_readable_messages(error, message_part):
    describer = LlmDescriber(_client(error=error), "gemma3:4b", timeout_s=30)

    with pytest.raises(ServiceUnavailableError) as exc_info:
        describer.describe("Statystyki opisowe", {})

    assert message_part in exc_info.value.message


def test_describer_reports_empty_answer():
    describer = LlmDescriber(_client("  "), "gemma3:4b")

    with pytest.raises(ServiceUnavailableError, match="pustą odpowiedź"):
        describer.describe("Statystyki opisowe", {})
