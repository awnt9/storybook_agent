# Architecture

This document describes how StoryBook Agent is structured **today**. For agent-oriented conventions see [AGENTS.md](../AGENTS.md). For running the stack locally see [DEVELOPMENT.md](DEVELOPMENT.md).

---

## System overview

```mermaid
flowchart TB
    subgraph client["Browser"]
        FE[React frontend]
    end

    subgraph compose["Docker Compose"]
        subgraph backend["Backend (FastAPI)"]
            API[API layer]
            SVC[Services]
            PIPE[story_pipeline]
            REPO[Repositories]
        end
        DB[(Postgres)]
        MINIO[(MinIO)]
    end

    OPENAI[OpenAI API]

    FE -->|REST + SSE /api/v1| API
    API --> SVC
    SVC --> PIPE
    SVC --> REPO
    PIPE -->|Chat + Images API| OPENAI
    PIPE -->|ImageStore + StoryStateStore| REPO
    REPO --> DB
    REPO --> MINIO
```

The frontend proxies `/api` to the backend (Vite dev server in Docker). Users authenticate with JWT access tokens (header) + refresh token (httpOnly cookie).

---

## Backend layers

### API (`backend/app/api/v1/`)

Thin HTTP adapters. Responsibilities:

- Parse request bodies (JSON, `multipart/form-data`).
- Enforce authentication via `get_current_user`.
- Delegate to services; return JSON or `StreamingResponse` for SSE.

No business rules, no direct OpenAI or MinIO calls.

### Services (`backend/app/services/`)

| Service | Role |
|---|---|
| `AgentService` | Story continuation: prepare `StoryRunDeps`, stream SSE, persist graph output |
| `AuthService` | Register, login, refresh, logout |
| `ApiKeyService` | Encrypt/store user OpenAI keys; expose selected plaintext key for generation |

Services coordinate repositories and the pipeline. They do not implement graph steps.

### Repositories (`backend/app/repositories/`)

| Repository | Storage |
|---|---|
| `AgentRepository` | `story_histories` JSONB state, user actions, MinIO image objects |
| `UserRepository`, `TokenRepository`, `ApiKeyRepository` | Auth and API keys |

Only repositories talk to Postgres and MinIO directly.

### Schemas (`backend/app/schemas/`)

Shared domain language:

- **`story_elements.py`** — `Image`, `Scene`, `StoryState`, `UserAction`, `StoryHistory` (table).
- **`story_pipeline.py`** — `BackgroundPlannerInput`, `BackgroundScenePlan`, `ReferenceImageDescription`.
- **`auth.py`, `user.py`, `api_key.py`** — auth and user DTOs.

Schemas are plain Pydantic/SQLModel types. Pipeline runtime deps (`StoryRunDeps`) live in `story_pipeline/deps.py`, not here.

### Core (`backend/app/core/`)

Cross-cutting infrastructure:

| Module | Purpose |
|---|---|
| `config.py` | Settings from root `.env` |
| `database.py` | SQLModel session |
| `dependencies.py` | `get_current_user`, DB session |
| `security.py` | Password hashing, JWT |
| `openai_client.py` | `AsyncOpenAI` factory per user key |
| `minio.py` | MinIO client |
| `api_key_crypto.py` | Fernet encrypt/decrypt for stored keys |
| `prompt_loader.py` | Load `core/prompts/*.txt` templates |

---

## Story generation: `story_pipeline` (active path)

Story continuation is **not** a monolithic Pydantic AI agent loop. It is a **pydantic-graph** pipeline invoked by `AgentService`, with **Pydantic AI agents** for LLM steps and **deterministic steps** for the Images API.

### Module layout

```
story_pipeline/
├── deps.py              # StoryRunDeps dataclass
├── ports.py             # ImageStore, StoryStateStore protocols
├── adapters.py          # RepositoryImageStore, RepositoryStoryStateStore
├── graph.py             # Graph definition (3 nodes)
├── runner.py            # run_scene_graph() async iterator
├── events.py            # PipelineStep, PipelineEnd, PipelineDone, …
├── serialization.py     # JSON-safe values for SSE
├── agents/
│   ├── common.py        # Shared OpenAIChatModel factory (BG_MODEL)
│   ├── reference_image.py   # Vision agent + enrich_story_deps()
│   └── background_planner.py # Scene planning agent
└── steps/
    └── background.py    # OpenAI Images API step (deterministic)

core/prompts/
├── reference_image.txt
├── reference_image_user.txt
├── background_planner.txt
└── background_generator.txt
```

### Current graph

```mermaid
flowchart LR
    START([start]) --> ENRICH[enrich_reference_image]
    ENRICH --> PLAN[compose_background_prompt]
    PLAN --> BG[create_background_image]
    BG --> END([end])
```

- **Input:** `StoryRunDeps` (user, history, action, state, OpenAI client, image/state stores, optional uploaded image bytes).
- **Output:** `Scene` with `background_image` set.

| Node | Type | Calls |
|---|---|---|
| `enrich_reference_image` | Pydantic AI (vision) | `agents/reference_image.enrich_story_deps()` → describes uploaded photo via `BinaryContent`, persists `Image.description` via `StoryStateStore` |
| `compose_background_prompt` | Pydantic AI (text) | `agents/background_planner.plan_background()` → `BackgroundScenePlan` using story context + `background_planner.txt` |
| `create_background_image` | Deterministic step | `steps/background.run()` → `background_generator.txt` + `images.generate()` (`BG_IMAGE_MODEL`) → `ImageStore.save()` → MinIO |

`ctx.deps` is the same `StoryRunDeps` object across all nodes; the enrich step mutates it in place so later nodes see the reference description.

### AgentService orchestration (outside the graph)

Before the graph runs, `AgentService.stream_continue_history()`:

1. Emits SSE `start`.
2. Calls `record_user_action()` (Postgres + MinIO if user uploaded an image).
3. Runs `run_scene_graph(deps)`.
4. On graph complete, calls `apply_scene_output()` and emits SSE `done`.

The service does **not** implement graph steps; it only prepares deps, streams events, and persists the final scene.

### SSE contract (`POST /stories/continue-history`)

| Event | Payload (summary) |
|---|---|
| `start` | `history_id`, `story_state` |
| `step` | `node_id`, `inputs` — one event per graph node (`enrich_reference_image`, `compose_background_prompt`, `create_background_image`) |
| `end` | `output` |
| `done` | `history_id`, `output`, `story_state` |
| `error` | `detail` |

Frontend book component consumes these events to update the UI and load images via authenticated image URLs.

### Extending the pipeline

- **New LLM step:** add an agent under `story_pipeline/agents/`, prompt under `core/prompts/`, wire a node in `graph.py`.
- **New deterministic step:** add under `story_pipeline/steps/`.
- **New DTOs:** add to `schemas/story_pipeline.py` (or `story_elements.py` for domain types).
- Do **not** add one file per graph node by default — reuse agents/steps by domain.

There is **no** `backend/app/core/agents/` directory. Prompts live only under `core/prompts/`.

---

## Data model (stories)

### `story_histories` table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID string | `history_id` exposed to client |
| `user_id` | FK → users | Owner |
| `state` | JSONB | Serialized `StoryState` |
| `created_at`, `updated_at` | timestamp | |

`StoryState` shape:

```text
StoryState
├── story_id
├── current_scene: Scene
└── history: Scene[]
```

`Scene` holds `background_image`, `texts`, `images`.

### Images

Binary objects live in **MinIO** (`MINIO_BUCKET`). Metadata (`image_id`, `path`, `url`, `prompt`) is embedded in `StoryState` / `Image` models. URLs for the browser are built against the authenticated API image endpoint, not public MinIO URLs.

---

## Authentication & API keys

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as /auth
    participant DB as Postgres

    U->>FE: login
    FE->>API: POST /auth/login
    API->>DB: verify user
    API-->>FE: access_token + refresh cookie
    FE->>FE: localStorage access_token

    Note over FE,API: Later requests use Bearer header; 401 triggers POST /auth/refresh
```

Each user may store multiple OpenAI API keys (encrypted at rest with `API_KEY_ENCRYPTION_KEY`). One key is **selected** for generation. `continue-history` fails if no key is selected.

---

## Frontend architecture

### Routing (`frontend/src/router/index.jsx`)

Public: `/`, `/login`, `/register`.  
Protected (`RequireAuth`): `/dashboard`, `/nueva-historia`, `/mis-historias`.

### Key UI areas

| Area | Location | Role |
|---|---|---|
| Game shell | `components/game/`, `styles/game-ui.css` | Buttons, brand, backdrop, rainbow |
| Navbar | `components/Navbar.jsx` | Unified white box nav (guest + auth) |
| Story book | `components/book/` | Page turns, SSE, image display |
| API client | `lib/api.js` | JSON requests + token refresh |

Visual design is specified in [DESIGN.md](DESIGN.md).

### New story flow (simplified)

1. User opens `/nueva-historia`, sets cover photo/title on the first spread.
2. On first **Continuar historia**, frontend sends multipart (`text`, optional cover `image`, `history_id` on later turns).
3. Backend runs the graph (enrich → plan → generate background), streams SSE `step` events.
4. On `done`, frontend updates book pages from `story_state`.
5. Background images fetched with `Authorization` header from stories image route.

---

## Infrastructure (Docker Compose)

| Service | Purpose |
|---|---|
| `frontend` | Vite dev server, port `FRONTEND_PORT` |
| `backend` | Uvicorn, port `API_PORT` |
| `db` | Postgres 16 |
| `minio` | Object storage (API + console ports) |
| `pgweb` | Optional DB admin UI |

Persistent volumes: `postgres_data` (bind `./postgres_data`), `minio_data`.

---

## Planned / not implemented

Documented decisions not yet in code:

- Full multi-step LLM story agent (narrative text generation, generative UI blocks, tool loops).
- Redis session/cache layer — state is Postgres + browser storage.
- `mis-historias` listing from API — UI placeholder.
- Automatic Alembic on container boot.

When extending the pipeline, add agents under `story_pipeline/agents/` or steps under `story_pipeline/steps/`, then wire edges in `graph.py`.
