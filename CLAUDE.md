# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Kanban Studio" - A persistent Kanban board application with AI assistant integration via OpenRouter. Users can manage tasks through a drag-and-drop UI and converse with an AI that can view and update the board state.

## Architecture

### Backend (FastAPI + SQLite)

Located in `backend/`. Uses FastAPI with SQLAlchemy ORM and SQLite for persistence.

- **`main.py`** - FastAPI app with endpoints:
  - `GET /api/board` - Fetch board state for the hardcoded "user"
  - `PUT /api/board` - Update board state (expects `{state: BoardData}`)
  - `POST /api/ai/chat` - AI chat that receives board state + conversation, returns message and optional board update
  - `GET /api/ai/test` - Simple connectivity test
- **`models.py`** - SQLAlchemy models: `User` (id, username) and `Board` (user_id FK, state as JSON)
- **`schemas.py`** - Pydantic models for validation: `BoardData`, `CardData`, `ColumnData`, `AIChatResponse`, `ChatRequest`
- **`database.py`** - SQLite setup (`kanban.db`), session factory, `get_db()` dependency
- **`ai.py`** - OpenRouter integration using OpenAI SDK compatibility. Uses `response_format: {type: "json_object"}` for structured outputs. System prompt includes current board JSON.

The backend serves the static frontend build (from `/frontend-build` or `frontend/out`).

### Frontend (Next.js + React)

Located in `frontend/`. Next.js 16 with App Router, configured for static export (`output: "export"` in `next.config.ts`).

- **`src/components/KanbanBoard.tsx`** - Main client component. Fetches board from `/api/board` on mount, manages state with `useState`, syncs changes via PUT. Uses `@dnd-kit/core` for drag-and-drop.
- **`src/components/AiChatSidebar.tsx`** - Chat sidebar that calls `POST /api/ai/chat` with message + history. Receives optional `board_update` and calls `onBoardUpdate` prop to refresh the board.
- **`src/components/KanbanColumn.tsx`** - Renders a column with cards, supports renaming.
- **`src/components/KanbanCard.tsx`** - Individual card display.
- **`src/lib/kanban.ts`** - Types (`BoardData`, `Column`, `Card`), `initialData`, and `moveCard()` logic.
- **`src/lib/auth.tsx`** - Simple localStorage-based auth (username: "user", password: "password"). Provides `AuthProvider` and `useAuth()` hook.

### Data Flow

1. Board state is a single JSON object: `{columns: Column[], cards: Record<string, Card>}`
2. Frontend fetches board from `GET /api/board` on load, sends updates via `PUT /api/board`
3. AI chat (`POST /api/ai/chat`) receives board state + user message + history, returns `{message, board_update?}`
4. If `board_update` is present, both backend (DB) and frontend (state) are updated

## Commands

### Development (Docker - recommended)
```bash
# Start the full stack (frontend build + backend)
./scripts/start.sh    # Linux/Mac
scripts\start.bat      # Windows

# Stop
./scripts/stop.sh
scripts\stop.bat
```

### Backend only
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend only
```bash
cd frontend
npm install
npm run dev          # Dev server (note: API calls will fail without backend)
npm run build        # Static export to frontend/out/
```

### Testing

Backend:
```bash
cd backend
pytest                         # All tests
pytest tests/test_api.py -v    # Single test file
```

Frontend:
```bash
cd frontend
npm run test           # Vitest unit tests (single run)
npm run test:unit:watch  # Vitest watch mode
npm run test:e2e       # Playwright e2e tests
npm run test:all       # All frontend tests
```

### Linting
```bash
cd frontend
npm run lint
```

## Environment

- `.env` file in project root with `OPENROUTER_API_KEY=...`
- Backend reads this via `python-dotenv` (loads from `../.env`)
- AI model: `openrouter/auto` (OpenRouter's automatic model selection)

## Key Details

- **Single user**: The app uses a hardcoded "user" account (created on startup if not exists)
- **Auth is fake**: Frontend uses localStorage flag `kanban_auth`, no real JWT/sessions
- **Board JSON structure**: Columns have `id`, `title`, `cardIds[]`. Cards are a dictionary keyed by ID, each with `id`, `title`, `details`
- **AI structured output**: The LLM returns JSON with `message` (string) and `board_update` (BoardData or null). The backend validates this with Pydantic's `AIChatResponse` model
- **Docker multi-stage build**: Node Alpine builds frontend, Python slim runs backend. Frontend static files copied to `/frontend-build` in container
