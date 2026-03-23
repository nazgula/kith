"use client";

import type { Message } from "@/types/ai";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
        }`}
      >
        {!isUser && (
          <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Assistant
          </span>
        )}
        {message.content}
      </div>
    </div>
  );
}
