"use client";

interface SystemMessageProps {
  content: string;
}

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex justify-center py-2">
      <span className="text-xs text-zinc-400 dark:text-zinc-500">
        {content}
      </span>
    </div>
  );
}
