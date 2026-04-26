# Frontend Codebase Structure

This directory contains the initial pure-frontend Next.js Kanban demo.
It uses Next.js with App Router (`src/app`), Tailwind CSS for styling, and `@dnd-kit/core` for drag-and-drop interactions.

## Key Components (`src/components/`)
- `KanbanBoard.tsx`: The main container that manages the board state (`BoardData`) and the `DndContext` for drag-and-drop.
- `KanbanColumn.tsx`: Renders a single column. Supports renaming.
- `KanbanCard.tsx`: Represents a task on the board.
- `KanbanCardPreview.tsx`: The visual representation of a card while it is being dragged.
- `NewCardForm.tsx`: UI for adding a new card to a column.

## Library/State Management (`src/lib/`)
- `kanban.ts`: Contains the types for `Card`, `Column`, and `BoardData`. Also holds `initialData` (the demo mock data) and the core logic for moving a card (`moveCard`), ensuring stable updates when interacting via drag-and-drop.

## Testing (`src/test/`)
- Unit tests are set up using Vitest and React Testing Library (`KanbanBoard.test.tsx`, `kanban.test.ts`).
