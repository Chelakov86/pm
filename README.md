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
