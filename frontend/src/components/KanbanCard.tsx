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
        "group relative rounded-2xl border border-[var(--stroke)] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(3,33,71,0.04)]",
        "transition-all duration-200 hover:shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        isDragging && "z-50 opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
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
          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-[var(--gray-text)] hover:text-red-500 hover:bg-red-50 transition-all duration-200"
          aria-label={`Delete ${card.title}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
};
