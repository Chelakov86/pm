"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export const LoginForm = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="login-backdrop">
      <div className="absolute top-6 right-6">
        <ThemeSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`login-card glass-panel ${shaking ? "login-shake" : ""}`}
        data-testid="login-form"
      >
        <div className="login-header">
          <div className="login-accent-bar" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Welcome back
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Kanban Studio
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
            Sign in to access your board.
          </p>
        </div>

        <div className="login-fields">
          <div className="login-field-group">
            <label
              htmlFor="login-username"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(false);
              }}
              placeholder="Enter your username"
              className="login-input"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-field-group">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter your password"
              className="login-input"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <p className="login-error" role="alert">
            Invalid username or password. Please try again.
          </p>
        )}

        <button type="submit" className="login-button" id="login-submit">
          Sign in
        </button>
      </form>
    </div>
  );
};
