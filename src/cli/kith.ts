import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { sendMessage } from "../lib/claude.js";
import { detectSpec, extractSpec, parseVerdict } from "../lib/router.js";

const PROJECT_DIR = path.resolve("project");
const AGENTS_DIR = path.resolve("agents");
const CONVERSATION_FILE = path.join(PROJECT_DIR, "conversation.json");
const JUDGE_HISTORY_FILE = path.join(PROJECT_DIR, "judge-history.json");
const SPEC_APPROVED_FILE = path.join(PROJECT_DIR, "spec-approved.md");
const SPEC_OVERRIDE_FILE = path.join(PROJECT_DIR, "spec-override.md");

interface JudgeEntry {
  verdict: string;
  feedback: string;
  timestamp: string;
}

function ensureProjectDir() {
  if (!fs.existsSync(PROJECT_DIR)) {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
  }
}

function loadSystemPrompt(filename: string): string {
  const filePath = path.join(AGENTS_DIR, filename);
  return fs.readFileSync(filePath, "utf-8");
}

function saveConversation(messages: MessageParam[]) {
  ensureProjectDir();
  fs.writeFileSync(CONVERSATION_FILE, JSON.stringify(messages, null, 2));
}

function loadConversation(): MessageParam[] | null {
  if (!fs.existsSync(CONVERSATION_FILE)) return null;
  try {
    const raw = fs.readFileSync(CONVERSATION_FILE, "utf-8");
    return JSON.parse(raw) as MessageParam[];
  } catch {
    return null;
  }
}

function appendJudgeHistory(entry: JudgeEntry) {
  ensureProjectDir();
  let history: JudgeEntry[] = [];
  if (fs.existsSync(JUDGE_HISTORY_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(JUDGE_HISTORY_FILE, "utf-8"));
    } catch {
      // corrupted, start fresh
    }
  }
  history.push(entry);
  fs.writeFileSync(JUDGE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

function prompt(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const args = process.argv.slice(2);
  const isResume = args.includes("--resume");

  const specWriterPrompt = loadSystemPrompt("spec-writer.md");
  const specJudgePrompt = loadSystemPrompt("spec-judge.md");

  let messages: MessageParam[] = [];
  let rejectionCount = 0;
  let lastSpecDraft = "";

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Handle Ctrl+C — save state before exit
  process.on("SIGINT", () => {
    console.log("\n[System] Interrupted. Saving conversation...");
    saveConversation(messages);
    console.log("[System] Conversation saved. Run with --resume to continue.");
    rl.close();
    process.exit(0);
  });

  ensureProjectDir();

  // Resume or start fresh
  if (isResume) {
    const saved = loadConversation();
    if (saved) {
      messages = saved;
      console.log(`[System] Resuming session. ${messages.length} messages loaded.\n`);
    } else if (fs.existsSync(CONVERSATION_FILE)) {
      console.log("[System] Session file is corrupted. Starting new project.\n");
    } else {
      console.log("[System] No session to resume. Starting new project.\n");
    }
  }

  // If starting fresh, get initial idea
  if (messages.length === 0) {
    console.log("Welcome to Kith — Spec Writer\n");

    let idea = "";
    while (!idea) {
      idea = (await prompt(rl, "What are you building? Describe your idea.\nYou > ")).trim();
    }

    if (idea === "quit" || idea === "exit") {
      console.log("Session ended. No spec saved.");
      rl.close();
      return;
    }

    messages.push({ role: "user", content: idea });
    saveConversation(messages);
  }

  // Main conversation loop
  while (true) {
    // Send to Spec Writer
    const thinkingTimer = setTimeout(() => {
      process.stdout.write("[System] Still thinking...\n");
    }, 10000);

    let writerResponse: string;
    try {
      writerResponse = await sendMessage({
        systemPrompt: specWriterPrompt,
        messages,
      });
    } catch (err) {
      clearTimeout(thinkingTimer);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`\n[System] Connection error: ${errMsg}. Your conversation is saved. Run with --resume to continue.`);
      saveConversation(messages);
      rl.close();
      return;
    }
    clearTimeout(thinkingTimer);

    messages.push({ role: "assistant", content: writerResponse });
    saveConversation(messages);

    console.log(`\n[Spec Writer] ${writerResponse}\n`);

    // Check for spec
    if (detectSpec(writerResponse)) {
      console.log("[System] Spec draft detected. Sending to Judge for evaluation...\n");

      const specMarkdown = extractSpec(writerResponse);
      lastSpecDraft = specMarkdown;

      // Send to Judge — ONLY the spec, no conversation
      let judgeResponse: string;
      try {
        judgeResponse = await sendMessage({
          systemPrompt: specJudgePrompt,
          messages: [{ role: "user", content: specMarkdown }],
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(`\n[System] Connection error: ${errMsg}. Your conversation is saved. Run with --resume to continue.`);
        saveConversation(messages);
        rl.close();
        return;
      }

      const verdict = parseVerdict(judgeResponse);

      appendJudgeHistory({
        verdict: verdict.status,
        feedback: verdict.fullResponse,
        timestamp: new Date().toISOString(),
      });

      if (verdict.status === "APPROVED") {
        console.log(`[Judge] ${verdict.fullResponse}\n`);
        ensureProjectDir();
        fs.writeFileSync(SPEC_APPROVED_FILE, specMarkdown);
        console.log(`[System] Spec approved and saved to ${SPEC_APPROVED_FILE}`);
        rl.close();
        return;
      }

      // REJECTED or UNKNOWN
      if (verdict.status === "UNKNOWN") {
        console.log("[System] Judge response format unexpected. Treating as rejection. Feedback below:\n");
      }

      console.log(`[Judge] ${verdict.fullResponse}\n`);

      rejectionCount++;
      if (rejectionCount >= 3) {
        console.log(`[System] The Judge has rejected ${rejectionCount} times. Your direct input is needed.\n`);
      }

      console.log("[System] Judge rejected the spec. You can discuss the feedback with the Spec Writer.\n");

      // Inject judge feedback into conversation for Spec Writer
      messages.push({
        role: "user",
        content: `The Judge rejected your spec with this feedback: ${verdict.fullResponse}. Address these issues — either by asking the user for clarification or by revising the spec directly.`,
      });
      saveConversation(messages);
      continue; // Loop back to Spec Writer
    }

    // No spec detected — get user input
    let userInput = "";
    while (!userInput) {
      userInput = (await prompt(rl, "You > ")).trim();
    }

    if (userInput === "quit" || userInput === "exit") {
      console.log("Session ended. No spec saved.");
      saveConversation(messages);
      rl.close();
      return;
    }

    if (userInput === "/approve") {
      if (lastSpecDraft) {
        ensureProjectDir();
        fs.writeFileSync(SPEC_OVERRIDE_FILE, lastSpecDraft);
        console.log("Spec saved with user override. Judge did not approve this version.");
      } else {
        console.log("[System] No spec draft to approve yet.");
        continue;
      }
      rl.close();
      return;
    }

    messages.push({ role: "user", content: userInput });
    saveConversation(messages);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
