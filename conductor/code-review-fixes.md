# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the architectural, robustness, and error handling improvements suggested in `docs/code_review.md`.

**Architecture:** We will split the work into Backend (Python/FastAPI) and Frontend (React/Next.js) tasks. Backend tasks will focus on robust session management, CORS configuration, and resilient AI response parsing. Frontend tasks will extract state management into a custom hook `useKanbanBoard`, implementing optimistic UI rollbacks and debounced API calls to prevent race conditions.

**Tech Stack:** FastAPI, SQLAlchemy, React, Next.js, dnd-kit

---

### Task 1: Backend Session Management & CORS

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Update imports in `backend/main.py`**

Add `SessionLocal` to the database imports, and `CORSMiddleware` to the FastAPI imports.

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# ... existing imports ...
from database import engine, get_db, SessionLocal
```

- [ ] **Step 2: Add CORS Middleware**

Configure CORS right after creating the FastAPI app instance.

```python
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 3: Refactor `on_startup`**

Replace the problematic `next(get_db())` with a proper context manager using `SessionLocal`.

```python
@app.on_event("startup")
def on_startup():
    with SessionLocal() as db:
        create_initial_user(db)
```

### Task 2: Robust AI Response Parsing

**Files:**
- Modify: `backend/ai.py`

- [ ] **Step 1: Add a markdown stripping helper**

Add a function to clean up potential markdown formatting from LLM responses before parsing.

```python
import re

def strip_markdown_json(text: str) -> str:
    """Strip markdown code block formatting if present."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
```

- [ ] **Step 2: Enhance exception handling and parsing in `chat_with_board`**

Refactor the `chat_with_board` function to handle JSON decode errors gracefully and apply the stripping helper.

```python
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        print(f"DEBUG: AI call failed: {str(e)}")
        raise e

    raw_content = response.choices[0].message.content
    print(f"DEBUG: raw_content: {raw_content}")
    
    cleaned_content = strip_markdown_json(raw_content)
    try:
        parsed = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        print(f"DEBUG: Failed to parse JSON: {e} - Raw content: {cleaned_content}")
        # Fallback to a safe error message if JSON parsing fails completely
        parsed = {"message": "I encountered an error parsing the board state. Please try again.", "board_update": None}
```

### Task 3: Frontend Custom Hook (`useKanbanBoard`)

**Files:**
- Create: `frontend/src/lib/useKanbanBoard.ts`

- [ ] **Step 1: Create the hook definition**

Create the new file and migrate state, fetch logic, and optimistic updates.

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { initialData, moveCard, createId, type BoardData } from "@/lib/kanban";

export function useKanbanBoard() {
  const [board, setBoard] = useState<BoardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch("/api/board");
        if (response.ok) {
          const data = await response.json();
          if (data.state && Array.isArray(data.state.columns) && data.state.columns.length > 0) {
            setBoard(data.state);
          } else {
            setBoard(initialData);
            await fetch("/api/board", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state: initialData })
            });
          }
        } else {
          setBoard(initialData);
        }
      } catch (err) {
        console.error("Failed to fetch board:", err);
        setError("Failed to load board data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBoard();
  }, []);

  const updateBoard = useCallback(async (newBoard: BoardData, previousBoard: BoardData) => {
    // Debounce the actual API call
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise<void>((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch("/api/board", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: newBoard }),
          });
          if (!response.ok) {
            console.error("Failed to update board");
            setError("Failed to save changes.");
            setBoard(previousBoard); // Rollback
            reject(new Error("Failed to update"));
          } else {
            setError(null);
            resolve();
          }
        } catch (err) {
          console.error("Error saving board:", err);
          setError("Failed to save changes.");
          setBoard(previousBoard); // Rollback
          reject(err);
        }
      }, 300); // 300ms debounce
    });
  }, []);

  const handleDragEnd = useCallback((activeId: string, overId: string) => {
    setBoard((prev) => {
      const newBoard = {
        ...prev,
        columns: moveCard(prev.columns, activeId, overId),
      };
      updateBoard(newBoard, prev).catch(() => {});
      return newBoard;
    });
  }, [updateBoard]);

  const handleRenameColumn = useCallback((columnId: string, title: string) => {
    setBoard((prev) => {
      const newBoard = {
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column
        ),
      };
      updateBoard(newBoard, prev).catch(() => {});
      return newBoard;
    });
  }, [updateBoard]);

  const handleAddCard = useCallback((columnId: string, title: string, details: string) => {
    const id = createId("card");
    setBoard((prev) => {
      const newBoard = {
        ...prev,
        cards: {
          ...prev.cards,
          [id]: { id, title, details: details || "No details yet." },
        },
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: [...column.cardIds, id] }
            : column
        ),
      };
      updateBoard(newBoard, prev).catch(() => {});
      return newBoard;
    });
  }, [updateBoard]);

  const handleDeleteCard = useCallback((columnId: string, cardId: string) => {
    setBoard((prev) => {
      const newBoard = {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
      updateBoard(newBoard, prev).catch(() => {});
      return newBoard;
    });
  }, [updateBoard]);

  return {
    board,
    setBoard,
    isLoading,
    error,
    handleDragEnd,
    handleRenameColumn,
    handleAddCard,
    handleDeleteCard
  };
}
```

### Task 4: Refactor KanbanBoard Component

**Files:**
- Modify: `frontend/src/components/KanbanBoard.tsx`

- [ ] **Step 1: Update imports and use the hook**

Replace the internal state logic with the `useKanbanBoard` hook.

```typescript
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { useAuth } from "@/lib/auth";
import { AiChatSidebar } from "@/components/AiChatSidebar";
import { useKanbanBoard } from "@/lib/useKanbanBoard";

export const KanbanBoard = () => {
  const { logout } = useAuth();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  const {
    board,
    setBoard,
    isLoading,
    error,
    handleDragEnd: handleBoardDragEnd,
    handleRenameColumn,
    handleAddCard,
    handleDeleteCard
  } = useKanbanBoard();
```

- [ ] **Step 2: Update the `handleDragEnd` wrapper**

The component still needs a thin wrapper around `handleDragEnd` to extract IDs from the event object.

```typescript
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }
    
    handleBoardDragEnd(active.id as string, over.id as string);
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;
```

Remove the old internal handler implementations, and the component is fully refactored. The `AiChatSidebar` still receives the `setBoard` prop naturally.
