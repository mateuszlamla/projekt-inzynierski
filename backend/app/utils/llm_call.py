from openai import OpenAI


def generate_text(
    client: OpenAI,
    model_name: str,
    system_prompt: str,
    user_message: str,
    temperature: float = 0.2,
    timeout_s: float | None = None,
) -> str:
    """
    Jedno wywołanie modelu przez API zgodne z OpenAI (Chat Completions), odpowiedź jako tekst.

    `timeout_s` ogranicza całe żądanie; bez niego zawieszony serwer modelu blokowałby
    generowanie raportu bez końca.

    Raises:
        openai.APIConnectionError, openai.APITimeoutError, openai.APIStatusError: błąd serwera
        ValueError: model nie zwrócił treści
    """
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
        timeout=timeout_s,
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("LLM returned no content")
    return content.strip()
