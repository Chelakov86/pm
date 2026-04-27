"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "kanban_auth";
const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState({
    isAuthenticated: false,
    hydrated: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      isAuthenticated: localStorage.getItem(STORAGE_KEY) === "true",
      hydrated: true,
    });
  }, []);

  const login = (username: string, password: string): boolean => {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "true");
      setState((prev) => ({ ...prev, isAuthenticated: true }));
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({ ...prev, isAuthenticated: false }));
  };

  if (!state.hydrated) {
    return null;
  }

  const value = {
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
