"use client";

import type { AIModel } from "@/types/ai";

interface ModelSelectorProps {
  models: AIModel[];
  selected: AIModel;
  onChange: (model: AIModel) => void;
}

export function ModelSelector({ models, selected, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <span className="font-medium text-zinc-400">Model:</span>
      <select
        value={selected.id}
        onChange={(e) => {
          const model = models.find((m) => m.id === e.target.value);
          if (model) onChange(model);
        }}
        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none focus:border-zinc-500"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} ({model.provider})
          </option>
        ))}
      </select>
    </div>
  );
}
