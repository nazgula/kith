import * as fs from "fs";
import * as path from "path";
import type { ChatMessage, JudgeResult } from "@/types/chat";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONVERSATION_FILE = path.join(DATA_DIR, "conversation.json");
const JUDGE_HISTORY_FILE = path.join(DATA_DIR, "judge-history.json");
const SPEC_APPROVED_FILE = path.join(DATA_DIR, "spec-approved.md");
const SPEC_OVERRIDE_FILE = path.join(DATA_DIR, "spec-override.md");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Conversation persistence
export function loadConversation(): ChatMessage[] {
  if (!fs.existsSync(CONVERSATION_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONVERSATION_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveConversation(messages: ChatMessage[]) {
  ensureDataDir();
  fs.writeFileSync(CONVERSATION_FILE, JSON.stringify(messages, null, 2));
}

// Judge history
export function loadJudgeHistory(): JudgeResult[] {
  if (!fs.existsSync(JUDGE_HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(JUDGE_HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function appendJudgeHistory(entry: JudgeResult) {
  ensureDataDir();
  const history = loadJudgeHistory();
  history.push(entry);
  fs.writeFileSync(JUDGE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Spec saving
export function saveApprovedSpec(markdown: string) {
  ensureDataDir();
  fs.writeFileSync(SPEC_APPROVED_FILE, markdown);
}

export function saveOverrideSpec(markdown: string) {
  ensureDataDir();
  fs.writeFileSync(SPEC_OVERRIDE_FILE, markdown);
}

// Clear session
export function clearSession() {
  for (const f of [CONVERSATION_FILE, JUDGE_HISTORY_FILE]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}
