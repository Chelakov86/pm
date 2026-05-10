import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { useChat } from "@/lib/useChat";
import { MessageBubble } from "./Chat/MessageBubble";
import { ChatInput } from "./Chat/ChatInput";
import type { BoardData } from "@/lib/kanban";

interface AiChatWidgetProps {
  onBoardUpdate: (newBoard: BoardData) => void;
}

export const AiChatWidget: React.FC<AiChatWidgetProps> = ({ onBoardUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, isLoading, messagesEndRef, setInput, handleSubmit } =
    useChat({ onBoardUpdate });

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
            <MessageBubble key={idx} message={msg} />
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

        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </>
  );
};
