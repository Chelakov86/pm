"use client";

import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

export const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full border border-[var(--stroke)] bg-[var(--surface)] text-[var(--gray-text)] hover:text-[var(--navy-dark)] hover:bg-[var(--glass-border)] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};
