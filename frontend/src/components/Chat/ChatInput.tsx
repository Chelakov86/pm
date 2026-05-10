import React from "react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
}) => {
  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[var(--stroke)] p-3 bg-[var(--surface-strong)]"
    >
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
          </svg>
        </button>
      </div>
    </form>
  );
};
