import { renderHook, waitFor, act } from "@testing-library/react";
import { useKanbanBoard } from "./useKanbanBoard";
import { initialData } from "./kanban";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("useKanbanBoard", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default success response for board fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ state: initialData }),
    });
  });

  it("should initialize with initialData and fetch board", async () => {
    const { result } = renderHook(() => useKanbanBoard());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.board).toEqual(initialData);
    expect(mockFetch).toHaveBeenCalledWith("/api/board");
  });

  it("should update board optimistically and call API", async () => {
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetch.mockResolvedValue({ ok: true });

    act(() => {
      result.current.handleAddCard("col-backlog", "New Card", "Details");
    });

    // Optimistic update: was 2, now 3
    expect(result.current.board.columns[0].cardIds).toHaveLength(3);
    
    // Wait for debounce and API call
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/board", expect.objectContaining({
      method: "PUT",
    })), { timeout: 1000 });
  });

  it("should rollback on API failure", async () => {
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Initially 2 cards in backlog
    expect(result.current.board.columns[0].cardIds).toHaveLength(2);

    // Mock API failure
    mockFetch.mockResolvedValue({ ok: false });

    await act(async () => {
      result.current.handleAddCard("col-backlog", "Failing Card", "Details");
    });

    // Optimistically added: was 2, now 3
    expect(result.current.board.columns[0].cardIds).toHaveLength(3);

    // Wait for rollback: should be 2 again
    await waitFor(() => expect(result.current.board.columns[0].cardIds).toHaveLength(2), { timeout: 1000 });
    expect(result.current.error).toBe("Failed to save changes.");
  });

  it("should track isSaving state", async () => {
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetch.mockResolvedValue({ ok: true });

    act(() => {
      result.current.handleRenameColumn("col-backlog", "New Name");
    });

    expect(result.current.isSaving).toBe(true);

    // Wait for debounce and API call to complete
    await waitFor(() => expect(result.current.isSaving).toBe(false), { timeout: 1000 });
  });
});
