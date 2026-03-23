"use client";

interface SpecViewerProps {
  markdown: string;
  projectName: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderMarkdown(md: string): string {
  // Minimal markdown → HTML (headings, bold, lists, code blocks, paragraphs)
  return md
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold mt-4 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-2 border-b border-zinc-200 dark:border-zinc-700 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-start gap-2 ml-2"><input type="checkbox" disabled class="mt-1" /><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      return `<pre class="bg-zinc-100 dark:bg-zinc-800 rounded p-3 text-xs overflow-x-auto my-2"><code>${code}</code></pre>`;
    })
    .replace(/\n\n/g, '<br class="my-2" />');
}

export function SpecViewer({ markdown, projectName }: SpecViewerProps) {
  const handleDownload = () => {
    const slug = slugify(projectName) || `spec-${Date.now()}`;
    const filename = `${slug}-spec.md`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Approved Specification
          </h3>
          <button
            onClick={handleDownload}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Download .md
          </button>
        </div>
        <div
          className="prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
        />
      </div>
    </div>
  );
}
