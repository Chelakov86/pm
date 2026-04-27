import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AuthProvider } from "@/lib/auth";
import { initialData } from "@/lib/kanban";

/**
 * Mock fetch to return the initial board data (simulating GET /api/board)
 * and to accept PUT /api/board silently.
 */
const mockFetch = vi.fn((url: string, opts?: RequestInit) => {
  if (url === "/api/board" && (!opts || opts.method === undefined || opts.method === "GET")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: 1, user_id: 1, state: initialData }),
    });
  }
  if (url === "/api/board" && opts?.method === "PUT") {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: 1, user_id: 1, state: JSON.parse(opts.body as string).state }),
    });
  }
  // AI chat endpoint — not exercised in these tests
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});

const renderBoard = async () => {
  localStorage.setItem("kanban_auth", "true");
  let result;
  await act(async () => {
    result = render(
      <AuthProvider>
        <KanbanBoard />
      </AuthProvider>
    );
  });
  // Wait for loading to finish and columns to appear
  await waitFor(() => {
    expect(screen.getAllByTestId(/column-/i).length).toBeGreaterThan(0);
  });
  return result;
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders five columns", async () => {
    await renderBoard();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    await renderBoard();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    await renderBoard();
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("shows a sign out button", async () => {
    await renderBoard();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
