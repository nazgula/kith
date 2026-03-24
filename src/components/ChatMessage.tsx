"use client";

import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { SystemMessage } from "./SystemMessage";

interface ChatMessageProps {
  message: ChatMessageType;
}

const BADGE_COLORS: Record<string, string> = {
  "spec-writer": "text-emerald-600 dark:text-emerald-400",
  judge: "text-amber-600 dark:text-amber-400",
};

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.agent === "system") {
    return <SystemMessage content={message.content} />;
  }

  const isUser = message.agent === "user";

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
          <span
            className={`mb-1 block text-xs font-medium ${
              BADGE_COLORS[message.agent] ?? "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {message.agent === "spec-writer" ? "Spec Writer" : "Judge"}
          </span>
        )}
        {message.content}
      </div>
    </div>
  );
}
