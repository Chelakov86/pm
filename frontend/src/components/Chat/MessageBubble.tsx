import React from "react";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isUser
            ? "bg-[var(--primary-blue)] text-white rounded-br-sm"
            : "bg-[var(--surface)] text-[var(--navy-dark)] border border-[var(--stroke)] rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
      <span className="text-[9px] text-[var(--gray-text)] mt-1 px-1 capitalize">
        {message.role}
      </span>
    </div>
  );
};
