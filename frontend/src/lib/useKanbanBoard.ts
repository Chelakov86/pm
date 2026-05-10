import { useState, useEffect, useCallback, useRef } from "react";
import { initialData, moveCard, createId, type BoardData } from "@/lib/kanban";

export function useKanbanBoard() {
  const [board, setBoard] = useState<BoardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;

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
  }, []);

  const saveBoard = useCallback((newBoard: BoardData, previousBoard: BoardData) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: newBoard }),
        });
        if (!response.ok) {
          throw new Error("Failed to update");
        }
        setError(null);
      } catch (err) {
        console.error("Error saving board:", err);
        setError("Failed to save changes.");
        setBoard(previousBoard);
      } finally {
        setIsSaving(false);
      }
    }, 300);
  }, []);

  const handleDragEnd = useCallback((activeId: string, overId: string) => {
    const previousBoard = boardRef.current;
    setBoard((prevBoard) => {
      const newBoard = {
        ...prevBoard,
        columns: moveCard(prevBoard.columns, activeId, overId),
      };
      saveBoard(newBoard, previousBoard);
      return newBoard;
    });
  }, [saveBoard]);

  const handleRenameColumn = useCallback((columnId: string, title: string) => {
    const previousBoard = boardRef.current;
    setBoard((prevBoard) => {
      const newBoard = {
        ...prevBoard,
        columns: prevBoard.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column
        ),
      };
      saveBoard(newBoard, previousBoard);
      return newBoard;
    });
  }, [saveBoard]);

  const handleAddCard = useCallback((columnId: string, title: string, details: string) => {
    const id = createId("card");
    const previousBoard = boardRef.current;
    setBoard((prevBoard) => {
      const newBoard = {
        ...prevBoard,
        cards: {
          ...prevBoard.cards,
          [id]: { id, title, details: details || "No details yet." },
        },
        columns: prevBoard.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: [...column.cardIds, id] }
            : column
        ),
      };
      saveBoard(newBoard, previousBoard);
      return newBoard;
    });
  }, [saveBoard]);

  const handleDeleteCard = useCallback((columnId: string, cardId: string) => {
    const previousBoard = boardRef.current;
    setBoard((prevBoard) => {
      const newBoard = {
        ...prevBoard,
        cards: Object.fromEntries(
          Object.entries(prevBoard.cards).filter(([id]) => id !== cardId)
        ),
        columns: prevBoard.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
            : column
        ),
      };
      saveBoard(newBoard, previousBoard);
      return newBoard;
    });
  }, [saveBoard]);

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
