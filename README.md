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
- [backend/Dockerfile](backend/Dockerfile) – obraz Pythona 3.11 z FastAPI, Uvicorn i bibliotekami data science (`pandas`, `matplotlib`, `numpy`).
- [backend/requirements.txt](backend/requirements.txt) – zależności Pythona.
- [frontend/Dockerfile](frontend/Dockerfile) – wieloetapowy obraz Node.js (dla developmentu z hot-reload oraz opcjonalny build produkcyjny z Nginx).