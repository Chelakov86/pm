# Database Schema and Rationale

## Overview
For the backend of the Kanban Studio, we will use **SQLite** as our database, utilizing its ability to store JSON payloads for the board state.

## Schema Proposals

### `users` Table
Stores user information for authentication and identification.
- `id` (INTEGER, Primary Key): Unique identifier for the user.
- `username` (VARCHAR, Unique): The user's login name (e.g., "user").
- `created_at` (DATETIME): Timestamp of when the user was created.

### `boards` Table
Stores the Kanban board state associated with a user.
- `id` (INTEGER, Primary Key): Unique identifier for the board.
- `user_id` (INTEGER, Foreign Key): References `users.id`.
- `state` (JSON / TEXT): The full, serialized JSON representation of the Kanban board, including columns and tasks.
- `updated_at` (DATETIME): Timestamp of the last board modification.

## Rationale: Why SQLite + JSON?

1. **Simplicity and Portability (SQLite)**
   - **Zero Configuration:** SQLite is a file-based database that requires no external server setup, making it perfect for a lightweight Dockerized application.
   - **Built-in Support:** Standard Python and major ORMs support SQLite natively, making it extremely easy to scaffold.

2. **State Management (JSON Column)**
   - **Frontend Alignment:** Our React frontend operates on a nested hierarchical state (Board -> Columns -> Tasks). Storing this exact structure as a JSON blob allows for a simple read/write operation without needing complex, multi-table joins to reconstruct the UI state.
   - **LLM Compatibility (Future-proofing):** In the upcoming AI features (Part 8-10), the LLM will ingest the board state and output modifications as JSON. Having the database schema mirror this structure means we can directly pass the AI's Structured Output back into the database without translation layers.
   - **Flexibility:** If we want to add new fields to a card (e.g., tags, due dates, assignees), we won't need to write complex SQL schema migrations; we just update the frontend typing.
