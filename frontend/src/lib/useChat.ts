import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import type { BoardData } from "@/lib/kanban";

interface UseChatOptions {
  onBoardUpdate?: (boardData: BoardData) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const { onBoardUpdate } = options || {};
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const newHistory = [...messages];
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: newHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI");
      }

      const data = await response.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

      if (data.board_update && onBoardUpdate) {
        onBoardUpdate(data.board_update);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    isLoading,
    messagesEndRef,
    setInput,
    handleSubmit,
  };
}
