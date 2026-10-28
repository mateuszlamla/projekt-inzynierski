"""
Moduł downsamplingu danych do wykresów (Sekcja 2 - Task 1.3).
Zawiera implementację algorytmu LTTB (Largest Triangle Three Buckets) dla szeregów czasowych
i wykresów liniowych. Algorytm redukuje liczbę punktów do zadanego progu, zachowując minima,
maksima, lokalne ekstrema i ogólny trend.
"""

import time
from typing import Any

import numpy as np


def lttb_indices(x: np.ndarray, y: np.ndarray, threshold: int = 1000) -> np.ndarray:
    """
    Zwraca tablicę indeksów wybranych przez algorytm LTTB (Largest Triangle Three Buckets).

    :param x: Tablica wartości numerycznych osi X (uporządkowana rosnąco)
    :param y: Tablica wartości numerycznych osi Y
    :param threshold: Docelowa maksymalna liczba punktów po redukcji (min. 3)
    :return: Tablica indeksów (np.ndarray) wybranych punktów
    """
    n = len(x)
    if n <= threshold or threshold < 3:
        return np.arange(n, dtype=np.int64)

    sampled_indices = [0]
    every = (n - 2) / (threshold - 2)
    a_idx = 0

    for b in range(threshold - 2):
        # 1. Kubełek następny (b + 1) do obliczenia punktu uśrednionego C
        if b == threshold - 3:
            # Dla ostatniego kubełka środkowego, punkt C to dokładnie ostatni punkt zbioru
            c_x = x[-1]
            c_y = y[-1]
        else:
            next_start = int(np.floor((b + 1) * every)) + 1
            next_end = int(np.floor((b + 2) * every)) + 1
            next_end = min(next_end, n)

            if next_start < next_end:
                c_x = np.mean(x[next_start:next_end])
                c_y = np.mean(y[next_start:next_end])
            else:
                c_x = x[-1]
                c_y = y[-1]

        # 2. Bieżący kubełek (b)
        range_start = int(np.floor(b * every)) + 1
        range_end = int(np.floor((b + 1) * every)) + 1
        range_end = min(range_end, n - 1)
        if range_start >= range_end:
            range_start = max(1, range_end - 1)

        a_x = x[a_idx]
        a_y = y[a_idx]

        x_curr = x[range_start:range_end]
        y_curr = y[range_start:range_end]

        # 3. Wektorowe wyliczenie podwojonego pola trójkąta (A, B_i, C)
        # Pole = 0.5 * |(A_x - C_x)(B_y - A_y) - (A_x - B_x)(C_y - A_y)|
        areas = np.abs((a_x - c_x) * (y_curr - a_y) - (a_x - x_curr) * (c_y - a_y))
        max_sub_idx = int(np.argmax(areas))
        a_idx = range_start + max_sub_idx
        sampled_indices.append(a_idx)

    # 4. Zawsze dodajemy ostatni punkt
    sampled_indices.append(n - 1)
    return np.array(sampled_indices, dtype=np.int64)


def _convert_x_to_numeric(x_list: list) -> np.ndarray:
    """
    Konwertuje dowolną listę wartości osi X (liczby, daty ISO, stringi)
    na tablicę float do kalkulacji LTTB.
    """
    n = len(x_list)
    if n == 0:
        return np.array([], dtype=np.float64)

    # Sprawdzenie czy wartości są już liczbami
    first_val = x_list[0]
    if isinstance(first_val, (int, float, np.number)):
        try:
            return np.asarray(x_list, dtype=np.float64)
        except (ValueError, TypeError):
            pass

    # Próba konwersji ciągów ISO / dat na timestampy
    import warnings

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            import pandas as pd

            s = pd.to_datetime(x_list, errors="coerce")
            if not s.isna().all():
                # Rzutujemy na sekundy float
                return (s.view("int64") / 1e9).to_numpy(dtype=np.float64)
        except Exception:
            pass

    # Domyślny fallback: monotoniczny indeks wierszy
    return np.arange(n, dtype=np.float64)


def downsample_lttb(x: list, y: list, threshold: int = 1000) -> tuple[list, list, dict[str, Any]]:
    """
    Wykonuje downsampling LTTB dla par (X, Y).
    Zwraca zredukowane listy X, Y oraz słownik z metadanymi operacji.

    :param x: Lista wartości osi X
    :param y: Lista wartości osi Y (numerycznych)
    :param threshold: Próg docelowej liczby punktów (domyślnie 1000)
    :return: (x_downsampled, y_downsampled, meta_info)
    """
    start_time = time.perf_counter()
    n = len(x)

    if n <= threshold or threshold < 3:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return (
            x,
            y,
            {
                "downsampled": False,
                "algorithm": "none",
                "original_points": n,
                "points_count": n,
                "threshold": threshold,
                "execution_time_ms": duration_ms,
            },
        )

    # Przygotowanie tablic numerycznych
    x_num = _convert_x_to_numeric(x)
    y_num = np.asarray([float(v) if v is not None else 0.0 for v in y], dtype=np.float64)

    # Obliczenie indeksów wybranych punktów
    indices = lttb_indices(x_num, y_num, threshold=threshold)

    # Pobranie oryginalnych wartości X i Y na podstawie wybranych indeksów
    x_sampled = [x[i] for i in indices]
    y_sampled = [float(y[i]) if y[i] is not None else 0.0 for i in indices]

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    meta_info = {
        "downsampled": True,
        "algorithm": "lttb",
        "original_points": n,
        "points_count": len(x_sampled),
        "threshold": threshold,
        "execution_time_ms": duration_ms,
    }

    return x_sampled, y_sampled, meta_info
