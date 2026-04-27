import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/lib/auth";

const AuthStatus = () => {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{isAuthenticated ? "in" : "out"}</span>
      <button onClick={() => login("user", "password")}>login-valid</button>
      <button onClick={() => login("bad", "bad")}>login-invalid</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts unauthenticated by default", () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("out");
  });

  it("authenticates with valid credentials", async () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("login-valid"));
    expect(screen.getByTestId("status")).toHaveTextContent("in");
    expect(localStorage.getItem("kanban_auth")).toBe("true");
  });

  it("rejects invalid credentials", async () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("login-invalid"));
    expect(screen.getByTestId("status")).toHaveTextContent("out");
  });

  it("logs out and clears storage", async () => {
    localStorage.setItem("kanban_auth", "true");
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("in");

    await userEvent.click(screen.getByText("logout"));
    expect(screen.getByTestId("status")).toHaveTextContent("out");
    expect(localStorage.getItem("kanban_auth")).toBeNull();
  });

  it("restores auth state from localStorage", () => {
    localStorage.setItem("kanban_auth", "true");
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("in");
  });
});
