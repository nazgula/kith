"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage as ChatMessageType, AgentRequest, AgentResponse, JudgeResult } from "@/types/chat";
import { detectSpec, extractSpec, parseVerdict } from "@/lib/router";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

function makeMsg(
  agent: ChatMessageType["agent"],
  content: string,
  role: "user" | "assistant" = "assistant"
): ChatMessageType {
  return {
    id: crypto.randomUUID(),
    role,
    agent,
    content,
    timestamp: Date.now(),
  };
}

async function callAgent(agentPromptFile: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentPromptFile, messages } as AgentRequest),
  });
  const data: AgentResponse = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data.content;
}

async function saveSession(action: string, payload: Record<string, unknown>) {
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const rejectionCountRef = useRef(0);
  const lastSpecDraftRef = useRef("");
  messagesRef.current = messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();
        if (data.conversation?.length > 0) {
          setMessages([
            makeMsg("system", `Session restored — ${data.conversation.length} messages loaded`),
            ...data.conversation,
          ]);
          rejectionCountRef.current = (data.judgeHistory ?? []).filter(
            (j: JudgeResult) => j.verdict === "REJECTED" || j.verdict === "UNKNOWN"
          ).length;
        } else {
          setMessages([makeMsg("system", "What are you building? Describe your idea.")]);
        }
      } catch {
        setMessages([makeMsg("system", "What are you building? Describe your idea.")]);
      }
      setInitialized(true);
    })();
  }, []);

  // Persist conversation whenever messages change (skip system-only states)
  useEffect(() => {
    if (!initialized) return;
    const persistable = messages.filter((m) => m.agent !== "system");
    if (persistable.length > 0) {
      saveSession("save-conversation", { messages: persistable });
    }
  }, [messages, initialized]);

  const addMessage = useCallback((msg: ChatMessageType) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleJudgeFlow = useCallback(async (specWriterResponse: string, currentMessages: ChatMessageType[]) => {
    addMessage(makeMsg("system", "Spec draft detected. Sending to Judge..."));

    const specMarkdown = extractSpec(specWriterResponse);
    lastSpecDraftRef.current = specMarkdown;

    let judgeResponse: string;
    try {
      judgeResponse = await callAgent("spec-judge.md", [
        { role: "user", content: specMarkdown },
      ]);
    } catch (err) {
      addMessage(makeMsg("system", `Judge error: ${err instanceof Error ? err.message : "unknown"}`));
      return;
    }

    const verdict = parseVerdict(judgeResponse);

    // Save judge result
    const judgeResult: JudgeResult = {
      verdict: verdict.status,
      feedback: verdict.fullResponse,
      specMarkdown,
      timestamp: new Date().toISOString(),
    };
    await saveSession("save-judge-result", { result: judgeResult });

    // Show judge response
    addMessage(makeMsg("judge", verdict.fullResponse));

    if (verdict.status === "APPROVED") {
      addMessage(makeMsg("system", "Spec approved!"));
      await saveSession("save-approved-spec", { markdown: specMarkdown });
      return;
    }

    // REJECTED or UNKNOWN
    if (verdict.status === "UNKNOWN") {
      addMessage(makeMsg("system", "Judge response format unexpected. Treating as rejection."));
    }

    rejectionCountRef.current++;
    if (rejectionCountRef.current >= 3) {
      addMessage(
        makeMsg("system", `The Judge has rejected ${rejectionCountRef.current} times. Your direct input is needed on the unresolved issues above.`)
      );
    }

    addMessage(
      makeMsg("system", "Judge rejected the spec. Discuss the feedback with the Spec Writer, or type /approve to override.")
    );

    // Inject feedback into conversation for Spec Writer context
    const feedbackMsg = makeMsg(
      "user",
      `The Judge rejected your spec with this feedback:\n\n${verdict.fullResponse}\n\nAddress these issues — either by asking the user for clarification or by revising the spec directly.`,
      "user"
    );
    setMessages((prev) => [...prev, feedbackMsg]);
  }, [addMessage]);

  const sendMessage = useCallback(
    async (content: string) => {
      // /approve override
      if (content === "/approve") {
        if (lastSpecDraftRef.current) {
          await saveSession("save-override-spec", { markdown: lastSpecDraftRef.current });
          addMessage(makeMsg("system", "Spec saved with user override. The Judge did not approve this version."));
        } else {
          addMessage(makeMsg("system", "No spec to approve yet. Continue the interview."));
        }
        return;
      }

      const userMsg = makeMsg("user", content, "user");
      addMessage(userMsg);
      setLoading(true);

      try {
        // Build conversation for Spec Writer (exclude system messages)
        const allMsgs = [...messagesRef.current, userMsg];
        const apiMessages = allMsgs
          .filter((m) => m.agent !== "system")
          .map((m) => ({ role: m.role, content: m.content }));

        const writerResponse = await callAgent("spec-writer.md", apiMessages);
        const writerMsg = makeMsg("spec-writer", writerResponse);
        addMessage(writerMsg);

        // Check for spec
        if (detectSpec(writerResponse)) {
          await handleJudgeFlow(writerResponse, [...allMsgs, writerMsg]);
        }
      } catch (err) {
        addMessage(
          makeMsg("system", `Connection error: ${err instanceof Error ? err.message : "unknown"}. Your conversation is saved.`)
        );
      } finally {
        setLoading(false);
      }
    },
    [addMessage, handleJudgeFlow]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Kith</h1>
        <span className="text-xs text-zinc-400">Spec Writer + Judge</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
