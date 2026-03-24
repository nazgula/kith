"use client";

import { useState } from "react";
import type { Project } from "@/types/chat";

interface ProjectSelectorProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onNew: (name: string) => void;
}

export function ProjectSelector({ projects, onSelect, onNew }: ProjectSelectorProps) {
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onNew(name);
    setNewName("");
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Kith</h2>
          <p className="mt-1 text-sm text-zinc-500">Start a new project or continue an existing one</p>
        </div>

        {/* New project */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New project name..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Create
          </button>
        </div>

        {/* Existing projects */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">Previous projects</p>
            {projects
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelect(project)}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {project.name}
                    </span>
                    {project.approvedSpec && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Approved
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
