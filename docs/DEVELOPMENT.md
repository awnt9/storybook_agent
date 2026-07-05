# Development guide

How to run StoryBook Agent locally, configure environment variables, run migrations, and use common commands.

See also: [ARCHITECTURE.md](ARCHITECTURE.md), [AGENTS.md](../AGENTS.md), [DESIGN.md](DESIGN.md).

---

## Prerequisites

- **Docker** and **Docker Compose** (v2)
- **just** (optional but recommended) — [https://github.com/casey/just](https://github.com/casey/just)
- **Git**

For running backend commands without the full stack, you also need Python 3.12+ and [uv](https://github.com/astral-sh/uv) — but the documented path is Docker-first.

---

## First-time setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd StoryBook_Agent
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Description |
|---|---|
| `JWT_SECRET_KEY` | Long random string for signing access tokens |
| `JWT_ALGORITHM` | e.g. `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | e.g. `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | e.g. `30` |
| `REFRESH_TOKEN_COOKIE_NAME` | e.g. `refresh_token` |
| `COOKIE_SECURE` | `false` for local HTTP |
| `COOKIE_SAMESITE` | `lax` for local dev |
| `API_KEY_ENCRYPTION_KEY` | Fernet key (see below) |

Generate a Fernet key for `API_KEY_ENCRYPTION_KEY`:

```bash
docker compose run --rm --no-deps backend python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Other variables in `.env.example` have sensible defaults for local Compose (ports, Postgres, MinIO, model names).

### 2. Start the stack

With **just** (recommended):

```bash
just update
```

Equivalent manual commands:

```bash
docker compose build --pull frontend backend
docker compose up -d --force-recreate --remove-orphans
docker compose ps
```

### 3. Run database migrations

Migrations do **not** run automatically on container start. After `db` is healthy:

```bash
docker compose exec backend alembic upgrade head
```

To create a new migration after model changes:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe change"
docker compose exec backend alembic upgrade head
```

Alembic config: `backend/alembic.ini`, versions in `backend/alembic/versions/`.

### 4. Open the app

| Service | URL (defaults) |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| OpenAPI / Swagger | http://localhost:8000/docs |
| MinIO console | http://localhost:9001 (user/pass from `.env`) |
| pgweb | http://localhost:8081 |

### 5. Create a user and API key

1. Register at http://localhost:5173/register
2. Log in → Dashboard → **API keys** (navbar)
3. Add your OpenAI API key and **select** it as active
4. Start a new story at `/nueva-historia`

Without a selected API key, `POST /stories/continue-history` will fail.

---

## Environment variables reference

The backend reads the **root** `.env` file (`backend/app/core/config.py` resolves `ROOT_DIR` to the repo root). Docker Compose also uses the same file for service configuration.

### API / app

| Variable | Default (example) | Notes |
|---|---|---|
| `API_HOST` | `0.0.0.0` | Uvicorn bind (inside container) |
| `API_PORT` | `8000` | Host port mapping |
| `DEBUG` | `false` | FastAPI debug |
| `DATABASE_URL` | `postgresql+psycopg://...@db:5432/storybook_agent` | Use host `db` inside Compose |

### Auth

| Variable | Notes |
|---|---|
| `JWT_SECRET_KEY` | Required |
| `JWT_ALGORITHM` | Required |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL |
| `REFRESH_TOKEN_COOKIE_NAME` | HttpOnly cookie name |
| `COOKIE_SECURE` | `true` only behind HTTPS |
| `COOKIE_SAMESITE` | `lax` or `strict` |

### OpenAI / generation

| Variable | Default (example) | Notes |
|---|---|---|
| `BG_MODEL` | `openai:gpt-4o-mini` | Text model for background scene planning (`compose_background_prompt`) |
| `BG_IMAGE_MODEL` | `gpt-image-1` | Images API model for backgrounds |
| `BG_IMAGE_SIZE` | `1536x1024` | |
| `BG_IMAGE_QUALITY` | `medium` | |

User API keys are stored encrypted; the app uses the **selected** key per user, not a global OpenAI key in `.env`.

### Prompt templates

Loaded from `backend/app/core/prompts/` via `load_prompt()`:

| File | Used by |
|---|---|
| `reference_image.txt` | Vision agent instructions (`enrich_reference_image`) |
| `reference_image_user.txt` | Vision agent user turn |
| `background_planner.txt` | Scene planner agent (`compose_background_prompt`) |
| `background_generator.txt` | Images API prompt wrapper (`create_background_image`) |

Do not hardcode prompt text in Python — add or edit `.txt` files under `core/prompts/`.

### Docker Compose / infra

| Variable | Purpose |
|---|---|
| `FRONTEND_PORT` | Host port → Vite 5173 |
| `VITE_API_PROXY_TARGET` | Frontend proxy target (`http://backend:8000` in Compose) |
| `POSTGRES_*` | Database credentials and image |
| `MINIO_*` | Object storage endpoint and credentials |
| `PGWEB_*` | Optional Postgres web UI |

---

## just commands

Defined in `justfile` at repo root (PowerShell on Windows):

| Command | Action |
|---|---|
| `just` / `just update` | Rebuild frontend + backend images, recreate containers |
| `just update-clean` | Same with `--no-cache` |
| `just restart` | `docker compose up` without rebuild |
| `just logs` | Follow logs for frontend + backend (last 100 lines) |

Examples:

```bash
just restart
just logs
```

---

## Docker services

```text
frontend  → Vite dev server, volume-mount ./frontend
backend   → Uvicorn, volume-mount ./backend, env_file .env
db        → Postgres 16, data in ./postgres_data
minio     → S3-compatible storage, volume minio_data
pgweb     → Read-only DB browser
```

Rebuild only backend after dependency changes:

```bash
docker compose build backend
docker compose up -d backend
```

Install Python deps locally (inside image build): `backend/pyproject.toml` + `uv.lock`.

---

## Backend development

### Project layout entry points

- App factory: `backend/app/main.py`
- Routes: `backend/app/api/v1/`
- Story pipeline: `backend/app/story_pipeline/`

### Run one-off commands in container

```bash
docker compose exec backend python -c "from app.core.config import settings; print(settings.bg_image_model)"
docker compose exec backend alembic current
```

### Dependencies

Managed with **uv** in `backend/Dockerfile`. Add a dependency in `pyproject.toml`, rebuild the backend image.

---

## Frontend development

### Stack

- React 19 + Vite
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Framer Motion, Lucide icons, Sonner toasts

### Dev server

In Docker, the frontend container runs Vite with HMR. Source is bind-mounted from `./frontend`.

API requests go to `/api/...`; Vite proxies to `VITE_API_PROXY_TARGET`.

### Styles

- Global: `src/index.css`
- Game UI system: `src/styles/game-ui.css` (imported in `main.jsx`)
- Book component: `src/components/book/style.css`

Follow [DESIGN.md](DESIGN.md) for new UI work.

---

## Database

### Connection

From host machine (if `POSTGRES_PORT=5432`):

```text
postgresql://postgres:postgres@localhost:5432/storybook_agent
```

From backend container: use `DATABASE_URL` with host `db`.

### Main tables (via migrations)

- `users`
- `refresh_tokens` (auth)
- `user_api_keys`
- `story_histories` (JSONB `state`)

Use **pgweb** at http://localhost:8081 for quick inspection.

---

## MinIO

- API: port `MINIO_API_PORT` (default 9000)
- Console: `MINIO_CONSOLE_PORT` (default 9001)
- Bucket: `MINIO_BUCKET` (default `storybook`)

Images are private; the app serves them through the backend stories image endpoint.

---

## Troubleshooting

| Problem | Check |
|---|---|
| Frontend cannot reach API | `VITE_API_PROXY_TARGET`, backend container up, `just logs` |
| 401 on story requests | Token in `localStorage`, try logout/login; refresh cookie |
| Generation fails immediately | User has selected API key in ProfileModal |
| `alembic` errors | DB running, `DATABASE_URL` correct, run `upgrade head` |
| Empty images | MinIO up, bucket exists, check backend logs for MinIO errors |
| Fernet / API key errors | `API_KEY_ENCRYPTION_KEY` must be valid Fernet; re-add keys if key rotated |

### View logs

```bash
just logs
# or
docker compose logs -f backend
docker compose logs -f frontend
```

### Reset local data (destructive)

```bash
docker compose down
# remove postgres_data/ and/or volumes if you need a clean DB
docker compose up -d
docker compose exec backend alembic upgrade head
```

---

## Git ignored paths

Do not commit:

- `.env`
- `postgres_data/`
- `__pycache__/`, `node_modules/` (in volumes)

`.env.example` is tracked — keep it updated when adding settings.
