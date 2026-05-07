"use client";

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
import { AiChatWidget } from "@/components/AiChatWidget";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary-blue)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden kanban-container">
        <main className="relative mx-auto flex min-h-max max-w-[1500px] flex-col gap-8 px-6 pb-24 pt-8">

        <header className="flex flex-col gap-6 rounded-[28px] glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[var(--navy-dark)] drop-shadow-sm">
                Kanban Studio
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <button
                type="button"
                onClick={logout}
                className="logout-button"
                id="logout-button"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4 kanban-container -mx-6 px-6">
            <section className="flex flex-row gap-6 h-[calc(100vh-250px)] min-h-[500px] w-max">
              {board.columns.map((column) => (
                <div key={column.id} className="flex-1 w-[320px] max-w-[360px]">
                <KanbanColumn
                  column={column}
                  cards={column.cardIds.map((cardId) => board.cards[cardId])}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              </div>
              ))}
            </section>
          </div>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
      </div>
      <AiChatWidget onBoardUpdate={setBoard} />
    </div>
  );
};
