import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { type BoardData } from "@/lib/kanban";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatWidgetProps {
  onBoardUpdate: (newBoard: BoardData) => void;
}

export const AiChatWidget: React.FC<AiChatWidgetProps> = ({ onBoardUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

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
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-blue)] text-white shadow-[0_8px_32px_rgba(32,157,215,0.4)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Widget Panel */}
      <div
        className={`fixed bottom-24 right-6 z-40 flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl glass-panel transition-all duration-300 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--stroke)] p-4 bg-[var(--surface-strong)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)] animate-pulse" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--navy-dark)]">AI Assistant</h2>
            <p className="text-[10px] text-[var(--gray-text)]">Chat to update your Kanban board</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-xs text-[var(--gray-text)] mt-10 px-4">
              Send a message to let the AI help you manage your board! Try &quot;Create a new column for Review&quot;.
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
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-[var(--primary-blue)] text-white rounded-br-sm"
                    : "bg-[var(--surface)] text-[var(--navy-dark)] border border-[var(--stroke)] rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-[var(--gray-text)] mt-1 px-1 capitalize">
                {msg.role}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-[var(--surface)] border border-[var(--stroke)] rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-[var(--gray-text)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[var(--gray-text)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[var(--gray-text)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[var(--stroke)] p-3 bg-[var(--surface-strong)]">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI..."
              className="w-full bg-[var(--input-bg)] border border-[var(--stroke)] rounded-full pl-4 pr-10 py-2 text-sm text-[var(--navy-dark)] placeholder-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1 top-1 bottom-1 w-7 flex items-center justify-center bg-[var(--primary-blue)] text-white rounded-full disabled:opacity-50 hover:bg-blue-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
