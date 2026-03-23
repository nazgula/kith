/**
 * Router — spec detection, extraction, and verdict parsing.
 * Plain code, no LLM calls.
 */

export interface Verdict {
  status: "APPROVED" | "REJECTED" | "UNKNOWN";
  fullResponse: string;
}

/**
 * Detects whether a Spec Writer response contains a draft spec.
 * Rule: contains `## Behaviors` AND at least one `### ` subheading after it.
 */
export function detectSpec(response: string): boolean {
  const behaviorsIndex = response.indexOf("## Behaviors");
  if (behaviorsIndex === -1) return false;

  const afterBehaviors = response.slice(behaviorsIndex);
  return /^### /m.test(afterBehaviors);
}

/**
 * Extracts the spec markdown from a Spec Writer response.
 * Strips code fence wrappers if present. Extracts from first `# ` heading to end.
 */
export function extractSpec(response: string): string {
  // Try code fence first: ```markdown ... ```
  const fenceMatch = response.match(/```markdown\n([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Fall back: extract from first `# ` heading to end
  const headingMatch = response.match(/^(# .+[\s\S]*)/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  return response.trim();
}

/**
 * Parses the Judge's verdict from its response.
 */
export function parseVerdict(response: string): Verdict {
  if (response.includes("## Verdict: APPROVED")) {
    return { status: "APPROVED", fullResponse: response };
  }
  if (response.includes("## Verdict: REJECTED")) {
    return { status: "REJECTED", fullResponse: response };
  }
  return { status: "UNKNOWN", fullResponse: response };
}
