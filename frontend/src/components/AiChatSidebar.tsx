import React, { useState, useRef, useEffect } from "react";
import { type BoardData } from "@/lib/kanban";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatSidebarProps {
  onBoardUpdate: (newBoard: BoardData) => void;
}

export const AiChatSidebar: React.FC<AiChatSidebarProps> = ({ onBoardUpdate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      
      if (data.board_update) {
        onBoardUpdate(data.board_update);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-80 md:w-96 flex-shrink-0 border-l border-[var(--stroke)] bg-white/80 backdrop-blur-md shadow-[-4px_0_24px_rgba(0,0,0,0.05)] flex flex-col z-10 relative h-screen">
      <div className="p-5 border-b border-[var(--stroke)]">
        <h2 className="text-lg font-semibold text-[var(--navy-dark)] flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--primary-blue)] animate-pulse" />
          AI Assistant
        </h2>
        <p className="text-xs text-[var(--gray-text)] mt-1">
          Chat to update your Kanban board.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--gray-text)] mt-10">
            Send a message to let the AI help you manage your board!
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--primary-blue)] text-white rounded-br-none"
                  : "bg-gray-100 text-[var(--navy-dark)] border border-gray-200 rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 px-1 capitalize">
              {msg.role}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--stroke)] bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g. Move the docs card to Doing"
            className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1 top-1 bottom-1 w-9 flex items-center justify-center bg-[var(--primary-blue)] text-white rounded-full disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </div>
      </form>
    </aside>
  );
};
