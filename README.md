# Kanban Studio

```text
  _  __            _                  _____ _             _ _ 
 | |/ /           | |                / ____| |           | (_)
 | ' / __ _ _ __ | |__   __ _ _ __  | (___ | |_ _   _  __| |_  ___ 
 |  < / _` | '_ \| '_ \ / _` | '_ \  \___ \| __| | | |/ _` | |/ _ \
 | . \ (_| | | | | |_) | (_| | | | | ____) | |_| |_| | (_| | | (_) |
 |_|\_\__,_|_| |_|_.__/ \__,_|_| |_||_____/ \__|\__,_|\__,_|_|\___/ 
```

> The AI-Powered Kanban Board that builds itself.

Kanban Studio is a persistent task management tool that combines a visual drag-and-drop interface with a natural language AI assistant. Manage your projects with traditional Kanban columns or simply talk to the board to add, move, or refine tasks.

## Key Features

- **🤖 Intelligent Sidebar:** Converse with an AI assistant that understands your board's context and can perform actions (add tasks, move cards, rename columns) via structured updates.
- **✋ Visual Drag-and-Drop:** Intuitive task management powered by `@dnd-kit`.
- **💾 Persistent Storage:** All changes are saved to a local SQLite database, ensuring your data survives restarts.
- **🐳 Dockerized:** One command to start the entire full-stack application (FastAPI backend + Next.js frontend).

## Quick Start

The fastest way to get Kanban Studio running is using Docker.

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose.
- An **OpenRouter API Key**. Get one at [openrouter.ai](https://openrouter.ai/).

### Launching the App

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pm
   ```

2. **Configure Environment:**
   Create a `.env` file in the project root:
   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   ```

3. **Start the Application:**
   ```bash
   # On Linux or Mac:
   ./scripts/start.sh

   # On Windows (PowerShell/CMD):
   scripts\start.bat
   ```

4. **Access the Board:**
   Open `http://localhost:8000` in your browser.
   Log in with:
   - **Username:** `user`
   - **Password:** `password`

## Technical Architecture

Kanban Studio is built as a modular full-stack application.

```text
[ Frontend (Next.js) ] <---> [ Backend (FastAPI) ] <---> [ Database (SQLite) ]
                                        ^
                                        |
                                        v
                               [ AI (OpenRouter) ]
```

### Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, @dnd-kit.
- **Backend:** FastAPI (Python 3.11), SQLAlchemy ORM, Pydantic (Structured Outputs).
- **AI Integration:** OpenRouter (OpenAI SDK compatibility) with structured JSON responses.
- **Persistence:** SQLite database (`kanban.db`).
