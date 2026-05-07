import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative rounded-2xl glass-panel p-4",
        "transition-all duration-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-[var(--glass-border)] cursor-grab active:cursor-grabbing",
        isDragging && "z-50 opacity-70 shadow-[0_20px_40px_rgba(0,0,0,0.2)] scale-105"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-base font-semibold text-[var(--navy-dark)] truncate">
            {card.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-[var(--gray-text)] line-clamp-3">
            {card.details}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-[var(--gray-text)] hover:text-red-500 hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
          aria-label={`Delete ${card.title}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
};
