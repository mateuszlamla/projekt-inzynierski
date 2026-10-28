# Projekt Inżynierski

Projekt składający się z backendu w **FastAPI** oraz frontendu w **React + Vite + Tailwind CSS**.

---

## 🐳 Uruchamianie za pomocą Dockera (zalecane)

Aplikacja jest w pełni skonteneryzowana przy użyciu Docker Compose. Zarówno backend, jak i frontend posiadają podpięte wolumeny (hot-reload / live-reload), dzięki czemu zmiany w kodzie na Twoim komputerze od razu widoczne są w kontenerach.

### 1. Uruchomienie aplikacji

Aby zbudować i uruchomić wszystkie usługi:

```bash
docker compose up --build
```

Lub w tle (detached mode):

```bash
docker compose up -d
```

### 2. Dostęp do usług

- **Frontend (React/Vite):** [http://localhost:5173](http://localhost:5173)
- **Backend (FastAPI):** [http://localhost:8000](http://localhost:8000)
- **Interaktywna dokumentacja API (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Zatrzymanie kontenerów

```bash
docker compose down
```

---

## 🛠 Struktura plików Docker

- [docker-compose.yml](docker-compose.yml) – konfiguracja uruchamiania usług `backend` i `frontend`.
- [backend/Dockerfile](backend/Dockerfile) – obraz Pythona 3.11 z FastAPI, Uvicorn, Polars i narzędziami do testów.
- [backend/requirements.txt](backend/requirements.txt) – zależności aplikacji, [backend/requirements-dev.txt](backend/requirements-dev.txt) – dodatkowo pytest, ruff i pre-commit.
- [frontend/Dockerfile](frontend/Dockerfile) – wieloetapowy obraz Node.js (dla developmentu z hot-reload oraz opcjonalny build produkcyjny z Nginx).

---

## 🗂 Struktura kodu

### Backend (`backend/app/`)

| Moduł | Rola |
|---|---|
| `main.py` | Składa aplikację: CORS, handlery błędów, routery, `/api/health`. |
| `config.py` | Ustawienia (`Settings`), nadpisywane zmiennymi środowiskowymi lub plikiem `.env`. |
| `dependencies.py` | Zależności do `Depends`, np. wspólny `DatasetRegistry`. |
| `exceptions.py` | Błędy domenowe (`DatasetNotFoundError` → 404, `InvalidRequestError` → 422). |
| `routers/` | Endpointy HTTP, jeden plik na obszar: `datasets`, `pipeline`, `charts`, `analysis`. Bez logiki. |
| `schemas/` | Modele Pydantic żądań. |
| `services/` | Logika bez FastAPI: `datasets/` (wczytywanie, kroki potoku), `charts/` (agregacja, downsampling, wykresy), `analysis/` (statystyki, regresja). |

Błędy zwracane są jako odpowiedź z kodem 4xx i treścią `{"detail": "..."}`.

### Frontend (`frontend/src/`)

| Folder | Rola |
|---|---|
| `api/` | Klient HTTP (`client.js`) i funkcje wywołań, jeden plik na obszar API. |
| `hooks/` | Logika współdzielona przez komponenty, np. `useUpstreamDataset`. |
| `components/pipeline/` | Edytor potoku: rejestr węzłów (`nodeRegistry.js`), paleta, węzły, okno ustawień, a w `nodes/` ustawienia poszczególnych węzłów. |
| `components/common/`, `components/layout/` | Komponenty współdzielone i układ strony. |
| `pages/` | Strony składane z komponentów i hooków. |
| `store/` | Stan globalny (Zustand). |

Nowy węzeł potoku: wpis w `NODE_CATEGORIES` i `NODE_SETTINGS` w `components/pipeline/nodeRegistry.js` oraz komponent ustawień w `components/pipeline/nodes/`.

---

## ✅ Testy i lint

Backend (z katalogu `backend/`, lokalnie po `pip install -r requirements-dev.txt` albo w kontenerze):

```bash
docker compose exec backend pytest
docker compose exec backend ruff check .
docker compose exec backend ruff format .
```

Frontend (z katalogu `frontend/`):

```bash
npm run lint
npm test
npm run build
```

Hooki pre-commit (ruff dla backendu) instaluje się raz z katalogu głównego repozytorium: `pre-commit install`.
Te same sprawdzenia uruchamia CI w GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) dla każdego pull requesta.
