"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message, AIModel, ChatRequest, ChatResponse } from "@/types/ai";
import { ALL_MODELS, DEFAULT_MODEL } from "@/lib/ai/models";
import { ModelSelector } from "./ModelSelector";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const body: ChatRequest = {
          messages: [...messagesRef.current, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel.id,
        };

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const data: ChatResponse = await res.json();

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message.content,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [selectedModel]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Kith</h1>
        <ModelSelector
          models={ALL_MODELS}
          selected={selectedModel}
          onChange={setSelectedModel}
        />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-medium text-zinc-600 dark:text-zinc-300">
                Start a conversation
              </h2>
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
                Using {selectedModel.name} via {selectedModel.provider}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-2 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
