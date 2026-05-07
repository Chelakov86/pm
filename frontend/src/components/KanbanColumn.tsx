import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreVertical } from "lucide-react";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[520px] flex-col rounded-[24px] glass-panel p-4 transition-all duration-300",
        isOver && "ring-2 ring-[var(--accent-yellow)] shadow-[0_0_30px_rgba(250,204,21,0.2)] bg-[var(--surface-strong)] scale-[1.01]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            className="bg-transparent font-display text-lg font-semibold text-[var(--navy-dark)] outline-none truncate focus:ring-2 ring-[var(--primary-blue)] rounded px-1 -ml-1 transition-all"
            aria-label="Column title"
          />
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--stroke)] text-[10px] font-bold text-[var(--gray-text)] uppercase tracking-wider">
            {cards.length}
          </span>
        </div>
        <button className="p-1.5 rounded-lg text-[var(--gray-text)] hover:bg-[var(--glass-border)] transition-colors">
          <MoreVertical size={16} />
        </button>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className={clsx(
            "flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--stroke)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition-all duration-300",
            isOver && "border-[var(--accent-yellow)] text-[var(--accent-yellow)] bg-[rgba(250,204,21,0.05)]"
          )}>
            Drop a card here
          </div>
        )}
      </div>
      <NewCardForm
        onAdd={(title, details) => onAddCard(column.id, title, details)}
      />
    </section>
  );
};
