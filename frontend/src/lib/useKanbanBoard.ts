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
