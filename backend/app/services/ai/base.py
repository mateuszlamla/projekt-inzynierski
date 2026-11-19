from abc import ABC, abstractmethod


class ResultDescriber(ABC):
    """Opis wyniku sekcji raportu w języku naturalnym; implementacja wybiera model."""

    # Nazwa modelu pokazywana w raporcie przy wygenerowanym opisie
    model_name: str

    @abstractmethod
    def describe(self, heading: str, facts: dict) -> str:
        """
        Opis wyników sekcji `heading`. `facts` zawiera wyłącznie agregaty (statystyki,
        wartości wykresu, wynik regresji), nigdy surowe wiersze danych.

        Raises:
            AppError: opisu nie udało się wygenerować (np. serwer modelu jest niedostępny)
        """
