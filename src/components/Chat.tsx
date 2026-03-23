"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage as ChatMessageType, AgentRequest, AgentResponse, JudgeResult, Project } from "@/types/chat";
import { detectSpec, extractSpec, parseVerdict } from "@/lib/router";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ProjectSelector } from "./ProjectSelector";
import { SpecViewer } from "./SpecViewer";

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

async function sessionAction(action: string, payload: Record<string, unknown>) {
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
}

export function Chat() {
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [approvedSpec, setApprovedSpec] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const rejectionCountRef = useRef(0);
  const lastSpecDraftRef = useRef("");
  messagesRef.current = messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load project list on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();
        setProjects(data.projects ?? []);
      } catch {
        // ignore
      }
      setInitialized(true);
    })();
  }, []);

  // Load project session when project is selected
  const loadProject = useCallback(async (p: Project) => {
    setProject(p);
    setMessages([]);
    setApprovedSpec(null);
    rejectionCountRef.current = 0;
    lastSpecDraftRef.current = "";

    try {
      const res = await fetch(`/api/session?projectId=${p.id}`);
      const data = await res.json();

      if (data.approvedSpec) {
        setApprovedSpec(data.approvedSpec);
      }

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
  }, []);

  const handleNewProject = useCallback(async (name: string) => {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-project", name }),
    });
    const data = await res.json();
    if (data.project) {
      setProjects((prev) => [...prev, data.project]);
      loadProject(data.project);
    }
  }, [loadProject]);

  // Persist conversation whenever messages change
  useEffect(() => {
    if (!project) return;
    const persistable = messages.filter((m) => m.agent !== "system");
    if (persistable.length > 0) {
      sessionAction("save-conversation", { projectId: project.id, messages: persistable });
    }
  }, [messages, project]);

  const addMessage = useCallback((msg: ChatMessageType) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSpecApproved = useCallback(async (specMarkdown: string) => {
    setApprovedSpec(specMarkdown);
    if (project) {
      await sessionAction("save-approved-spec", { projectId: project.id, markdown: specMarkdown });
    }
  }, [project]);

  const handleJudgeFlow = useCallback(async (specWriterResponse: string) => {
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

    if (project) {
      const judgeResult: JudgeResult = {
        verdict: verdict.status,
        feedback: verdict.fullResponse,
        specMarkdown,
        timestamp: new Date().toISOString(),
      };
      await sessionAction("save-judge-result", { projectId: project.id, result: judgeResult });
    }

    addMessage(makeMsg("judge", verdict.fullResponse));

    if (verdict.status === "APPROVED") {
      addMessage(makeMsg("system", "Spec approved! View and download below."));
      await handleSpecApproved(specMarkdown);
      return;
    }

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
      makeMsg("system", "Judge rejected the spec. The Spec Writer is reviewing the feedback...")
    );

    const feedbackContent = `The Judge rejected your spec with this feedback:\n\n${verdict.fullResponse}\n\nAddress these issues — either by asking the user for clarification or by revising the spec directly.`;
    const feedbackMsg = makeMsg("user", feedbackContent, "user");
    feedbackMsg.agent = "system";
    feedbackMsg.content = "[Judge feedback forwarded to Spec Writer]";

    const allMsgs = [...messagesRef.current, feedbackMsg];
    const apiMessages = allMsgs
      .filter((m) => m.agent !== "system" || m === feedbackMsg)
      .map((m) => ({
        role: m.role,
        content: m === feedbackMsg ? feedbackContent : m.content,
      }));

    try {
      const writerResponse = await callAgent("spec-writer.md", apiMessages);
      const writerMsg = makeMsg("spec-writer", writerResponse);
      setMessages((prev) => [...prev, feedbackMsg, writerMsg]);

      if (detectSpec(writerResponse)) {
        await handleJudgeFlow(writerResponse);
      }
    } catch (err) {
      setMessages((prev) => [...prev, feedbackMsg]);
      addMessage(makeMsg("system", `Spec Writer error: ${err instanceof Error ? err.message : "unknown"}. Type /approve to override or continue the conversation.`));
    }
  }, [addMessage, project, handleSpecApproved]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (content === "/approve") {
        if (lastSpecDraftRef.current) {
          if (project) {
            await sessionAction("save-override-spec", { projectId: project.id, markdown: lastSpecDraftRef.current });
          }
          setApprovedSpec(lastSpecDraftRef.current);
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
        const allMsgs = [...messagesRef.current, userMsg];
        const apiMessages = allMsgs
          .filter((m) => m.agent !== "system")
          .map((m) => ({ role: m.role, content: m.content }));

        const writerResponse = await callAgent("spec-writer.md", apiMessages);
        const writerMsg = makeMsg("spec-writer", writerResponse);
        addMessage(writerMsg);

        if (detectSpec(writerResponse)) {
          await handleJudgeFlow(writerResponse);
        }
      } catch (err) {
        addMessage(
          makeMsg("system", `Connection error: ${err instanceof Error ? err.message : "unknown"}. Your conversation is saved.`)
        );
      } finally {
        setLoading(false);
      }
    },
    [addMessage, handleJudgeFlow, project]
  );

  const handleBackToProjects = useCallback(() => {
    setProject(null);
    setMessages([]);
    setApprovedSpec(null);
  }, []);

  if (!initialized) return null;

  // Project selector screen
  if (!project) {
    return <ProjectSelector projects={projects} onSelect={loadProject} onNew={handleNewProject} />;
  }

  // Chat screen
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToProjects}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            &larr; Projects
          </button>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h1>
        </div>
        <span className="text-xs text-zinc-400">Spec Writer + Judge</span>
      </header>

      {/* Messages — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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

      {/* Spec viewer — shown when spec is approved */}
      {approvedSpec && (
        <SpecViewer markdown={approvedSpec} projectName={project.name} />
      )}

      {/* Input — sticky at bottom */}
      <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
