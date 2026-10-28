import polars as pl
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """
    Błąd domenowy zgłaszany przez serwisy. Handler zamienia go na odpowiedź
    {"detail": message} z kodem status_code, którą czyta interceptor klienta HTTP.
    """

    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class DatasetNotFoundError(AppError, LookupError):
    status_code = 404


class InvalidRequestError(AppError, ValueError):
    """Nieprawidłowe dane wejściowe: nieznana kolumna, zły format pliku, za mało danych."""

    status_code = 422


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    # Błędy Polars wynikają z zawartości danych (np. niezgodne typy), a nie z błędu serwera
    @app.exception_handler(pl.exceptions.PolarsError)
    async def handle_polars_error(request: Request, exc: pl.exceptions.PolarsError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": f"Błąd przetwarzania danych: {exc}"},
        )
