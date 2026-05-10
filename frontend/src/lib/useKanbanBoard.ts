import { useState, useEffect, useRef } from "react";
import { initialData, moveCard, createId, type BoardData } from "@/lib/kanban";

export function useKanbanBoard() {
  const [board, setBoard] = useState<BoardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
              body: JSON.stringify({ state: initialData }),
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

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const saveBoard = (newBoard: BoardData, previousBoard: BoardData) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsSaving(true);
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: newBoard }),
          signal,
        });
        if (!response.ok) {
          throw new Error("Failed to update");
        }
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Error saving board:", err);
        setError("Failed to save changes.");
        setBoard(previousBoard);
      } finally {
        if (!signal.aborted) {
          setIsSaving(false);
        }
      }
    }, 500); // Slightly longer debounce for better stability
  };

  const handleDragEnd = (activeId: string, overId: string) => {
    const previousBoard = board;
    const newBoard = {
      ...board,
      columns: moveCard(board.columns, activeId, overId),
    };
    setBoard(newBoard);
    saveBoard(newBoard, previousBoard);
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    const previousBoard = board;
    const newBoard = {
      ...board,
      columns: board.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    };
    setBoard(newBoard);
    saveBoard(newBoard, previousBoard);
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    const previousBoard = board;
    const newBoard = {
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    };
    setBoard(newBoard);
    saveBoard(newBoard, previousBoard);
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    const previousBoard = board;
    const newBoard = {
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
          : column
      ),
    };
    setBoard(newBoard);
    saveBoard(newBoard, previousBoard);
  };

  return {
    board,
    setBoard,
    isLoading,
    isSaving,
    error,
    handleDragEnd,
    handleRenameColumn,
    handleAddCard,
    handleDeleteCard,
  };
}
