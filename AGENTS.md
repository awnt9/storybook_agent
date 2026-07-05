# AGENTS.md — Guide for AI coding agents

This file is the **primary entry point** for agents working on StoryBook Agent. Read it before making changes. Human-oriented docs live under `docs/`; this file focuses on **where things are**, **what is active**, and **rules of the road**.

---

## What this project is

StoryBook Agent is a monorepo: **FastAPI backend** + **React (Vite) frontend**, orchestrated with **Docker Compose**. Users register, store an OpenAI API key, upload a hand-drawn character photo, and continue an illustrated story via **SSE streaming**.

**Stack:** Python 3.12, FastAPI, SQLModel, Alembic, MinIO, Postgres, OpenAI (Chat + Images API), pydantic-graph, Pydantic AI, React 19, Tailwind 4, Framer Motion.

---

## Repository map

```
StoryBook_Agent/
├── AGENTS.md                 ← you are here
├── README.md                 ← human overview + quick start
├── .env.example              ← copy to .env before first run
├── docker-compose.yaml       ← frontend, backend, db, minio, pgweb
├── justfile                  ← update / restart / logs (Docker)
│
├── docs/
│   ├── ARCHITECTURE.md       ← layers, pipeline, data flow
│   ├── DEVELOPMENT.md        ← setup, env, migrations, commands
│   └── DESIGN.md             ← UI aesthetic (Flipa en Colores)
│
├── backend/app/
│   ├── main.py               ← FastAPI app
│   ├── api/v1/               ← HTTP routes (thin controllers)
│   ├── services/             ← orchestration (AgentService, AuthService, …)
│   ├── repositories/         ← Postgres + MinIO access
│   ├── schemas/              ← Pydantic + SQLModel models
│   ├── story_pipeline/       ← ★ ACTIVE story generation graph
│   └── core/                 ← config, DB, security, OpenAI client, prompts
│
└── frontend/src/
    ├── router/               ← routes + RequireAuth
    ├── pages/                ← Home, Login, Dashboard, NewStory, …
    ├── components/
    │   ├── book/             ← interactive story book UI
    │   ├── game/             ← shared game-style UI primitives
    │   └── Navbar.jsx
    ├── lib/api.js            ← fetch wrapper + JWT refresh
    └── styles/game-ui.css    ← design tokens + game components
```

---

## Where story generation lives

| Path | Status | Notes |
|---|---|---|
| `backend/app/story_pipeline/` | **ACTIVE** | pydantic-graph pipeline (3 nodes) used by `AgentService` |
| `backend/app/story_pipeline/agents/` | **ACTIVE** | Pydantic AI agents: reference image vision, background planner |
| `backend/app/story_pipeline/steps/background.py` | **ACTIVE** | OpenAI Images API step (deterministic) |
| `backend/app/services/agent_service.py` | **ACTIVE** | Prepares deps, runs graph, streams SSE, persists state |
| `backend/app/schemas/story_pipeline.py` | **ACTIVE** | Pipeline DTOs (`BackgroundScenePlan`, …) |
| `backend/app/core/prompts/*.txt` | **ACTIVE** | All LLM/image prompt templates (load via `prompt_loader.py`) |

There is **no** `backend/app/core/agents/` folder in this repo. Prompts live only under `core/prompts/`.

**When adding generation logic:** new LLM behavior → `story_pipeline/agents/` + prompt file; deterministic I/O → `story_pipeline/steps/`; wire nodes in `graph.py`. Do not add one file per graph node by default.

---

## Layer rules (backend)

```
API  →  Service  →  Repository  →  Postgres / MinIO
              ↘
           story_pipeline  →  OpenAI (via injected AsyncOpenAI client)
```

| Layer | May do | Must not |
|---|---|---|
| **API** (`api/v1/`) | Auth deps, parse multipart/form, return `StreamingResponse` | Business logic, direct DB/OpenAI calls |
| **Service** | Orchestrate pipeline, format SSE, call repositories | Raw SQL, MinIO SDK, graph step implementation |
| **Repository** | CRUD, JSONB state, image bytes in MinIO | HTTP, SSE, OpenAI |
| **story_pipeline** | Graph nodes, Pydantic AI agents, deterministic steps; uses `StoryRunDeps` + ports | Know about FastAPI or HTTP |
| **schemas** | Domain types (`Scene`, `StoryState`, …) and pipeline DTOs (`story_pipeline.py`) | FastAPI routes, pipeline orchestration |

User OpenAI keys come from `ApiKeyService.get_selected_plaintext()` → `create_llm_client(api_key)` → passed in `StoryRunDeps`.

---

## Main runtime flow (story continuation)

1. Frontend `POST /api/v1/stories/continue-history` (multipart: `text`, `history_id`, optional `image`).
2. `stories.py` resolves user API key, calls `AgentService.prepare_continue_history()`.
3. `AgentService.stream_continue_history()` records user action, runs `run_scene_graph(deps)`.
4. Graph (`story_pipeline/graph.py`): `enrich_reference_image → compose_background_prompt → create_background_image → end` → returns `Scene`.
5. Enrich step (Pydantic AI vision) describes uploaded reference photos; planner step builds scene brief; background step calls Images API and saves via `RepositoryImageStore` → MinIO.
6. SSE events: `start` → `step` (×3) → `end` → `done` (or `error`).
7. Final `story_state` persisted in `story_histories.state` (JSONB).

Images are served at `GET /api/v1/stories/{history_id}/images/{image_id}` (auth required).

---

## Frontend routes

| Path | Auth | Purpose |
|---|---|---|
| `/` | Public | Landing; redirects to `/dashboard` if token exists |
| `/login`, `/register` | Public | Auth |
| `/dashboard` | Required | Main menu |
| `/nueva-historia` | Required | Story book + generation |
| `/mis-historias` | Required | Saved stories (placeholder UI) |

**UI rules:** follow `docs/DESIGN.md` and `.cursor/rules/frontend-aesthetic.mdc`. Use `components/game/*` and `styles/game-ui.css`; do not introduce corporate/SaaS aesthetics.

---

## API surface (`/api/v1`)

| Prefix | Key endpoints |
|---|---|
| `/health` | `GET ""` |
| `/auth` | `POST register, login, refresh, logout` |
| `/users` | `GET /me` |
| `/users/me/api-keys` | CRUD, reveal, select active key |
| `/stories` | `POST /continue-history` (SSE), `GET /{history_id}/images/{image_id}` |

OpenAPI: `http://localhost:8000/docs` when backend is running.

---

## Configuration

- Single `.env` at **repo root** (loaded by backend `Settings` and Docker Compose).
- Required secrets: `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `API_KEY_ENCRYPTION_KEY` (Fernet).
- Image model: `BG_IMAGE_MODEL`, `BG_IMAGE_SIZE`, `BG_IMAGE_QUALITY`.
- See `.env.example` and `docs/DEVELOPMENT.md`.

---

## Commands (local dev)

```bash
cp .env.example .env   # fill secrets
just update            # build + up full stack
just logs              # tail frontend + backend
```

Migrations are **manual** — see `docs/DEVELOPMENT.md`.

---

## Conventions for agents

1. **Minimal diffs** — match existing style; do not refactor unrelated code.
2. **Whole-layer placement** — new HTTP route in `api/`, orchestration in `services/`, persistence in `repositories/`.
3. **Domain types in `schemas/`** — story domain in `story_elements.py`; pipeline DTOs in `story_pipeline.py`; runtime deps in `story_pipeline/deps.py`.
4. **Prompts** — text files under `backend/app/core/prompts/`; load via `load_prompt()`.
5. **No secrets in git** — `.env` is gitignored.
6. **Do not commit** `postgres_data/`, `__pycache__/`, or local `.agents/` unless explicitly asked.
7. **Frontend API calls** — use `lib/api.js` for JSON; story SSE uses raw `fetch` + `EventSource` pattern in book components.
8. **Tests** — none enforced yet; add only when requested or when covering non-trivial behavior.

---

## Common pitfalls

- Calling OpenAI from repositories or API handlers — use pipeline + injected client.
- Forgetting user must **select an API key** in ProfileModal before generation works.
- Assuming Redis/caching exists — it does not (state is Postgres JSONB + browser `localStorage` for tokens).
- Running migrations automatically on container start — they are not; run Alembic manually after `db` is up.

---

## Further reading

| Doc | Use when |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Deep dive: layers, pipeline, persistence |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, Docker, env vars, migrations |
| [docs/DESIGN.md](docs/DESIGN.md) | Frontend look & feel |
| [README.md](README.md) | Project goal + quick start |

---

## Cursor-specific

Project rules: `.cursor/rules/frontend-aesthetic.mdc` (apply when editing `frontend/**`).

When unsure where code belongs, prefer asking via a small change in the correct layer over bolting logic into `AgentService` or page components.
