import * as fs from "fs";
import * as path from "path";
import type { ChatMessage, JudgeResult, Project } from "@/types/chat";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function projectDir(projectId: string): string {
  return path.join(DATA_DIR, "projects", projectId);
}

// --- Project management ---

export function listProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

export function createProject(name: string): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
  const projects = listProjects();
  projects.push(project);
  saveProjects(projects);
  ensureDir(projectDir(project.id));
  return project;
}

export function getProject(projectId: string): Project | undefined {
  return listProjects().find((p) => p.id === projectId);
}

export function updateProject(projectId: string, updates: Partial<Project>) {
  const projects = listProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx !== -1) {
    projects[idx] = { ...projects[idx], ...updates };
    saveProjects(projects);
  }
}

// --- Conversation persistence (per project) ---

export function loadConversation(projectId: string): ChatMessage[] {
  const filePath = path.join(projectDir(projectId), "conversation.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

export function saveConversation(projectId: string, messages: ChatMessage[]) {
  const dir = projectDir(projectId);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "conversation.json"), JSON.stringify(messages, null, 2));
}

// --- Judge history (per project) ---

export function loadJudgeHistory(projectId: string): JudgeResult[] {
  const filePath = path.join(projectDir(projectId), "judge-history.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

export function appendJudgeHistory(projectId: string, entry: JudgeResult) {
  const dir = projectDir(projectId);
  ensureDir(dir);
  const history = loadJudgeHistory(projectId);
  history.push(entry);
  fs.writeFileSync(path.join(dir, "judge-history.json"), JSON.stringify(history, null, 2));
}

// --- Spec saving (per project) ---

export function saveApprovedSpec(projectId: string, markdown: string) {
  const dir = projectDir(projectId);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "spec-approved.md"), markdown);
  updateProject(projectId, { approvedSpec: markdown });
}

export function saveOverrideSpec(projectId: string, markdown: string) {
  const dir = projectDir(projectId);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "spec-override.md"), markdown);
  updateProject(projectId, { approvedSpec: markdown });
}

export function loadApprovedSpec(projectId: string): string | null {
  const filePath = path.join(projectDir(projectId), "spec-approved.md");
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf-8");
  const overridePath = path.join(projectDir(projectId), "spec-override.md");
  if (fs.existsSync(overridePath)) return fs.readFileSync(overridePath, "utf-8");
  return null;
}

// --- Clear session (per project) ---

export function clearSession(projectId: string) {
  const dir = projectDir(projectId);
  for (const f of ["conversation.json", "judge-history.json"]) {
    const filePath = path.join(dir, f);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
