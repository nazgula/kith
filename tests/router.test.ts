import { describe, it, expect } from "vitest";
import { detectSpec, extractSpec, parseVerdict } from "@/lib/router";

describe("detectSpec", () => {
  it("detects a valid spec with ## Behaviors and ### subheading", () => {
    const response = `Here's the spec:

# My App — Specification

## Overview
A cool app.

## Behaviors
### Creating a thing
- **Precondition:** stuff
`;
    expect(detectSpec(response)).toBe(true);
  });

  it("rejects response without ## Behaviors", () => {
    expect(detectSpec("Just a normal conversation message.")).toBe(false);
  });

  it("rejects response with ## Behaviors but no ### subheading after it", () => {
    const response = `## Behaviors
This section discusses behaviors but has no subheadings.`;
    expect(detectSpec(response)).toBe(false);
  });

  it("rejects ### subheading that appears before ## Behaviors", () => {
    const response = `### Some heading
Then later
## Behaviors
No subheadings here.`;
    expect(detectSpec(response)).toBe(false);
  });

  it("detects spec inside a code fence", () => {
    const response = `Here's my draft:

\`\`\`markdown
# Timer — Specification

## Behaviors
### Setting a timer
- stuff
\`\`\``;
    expect(detectSpec(response)).toBe(true);
  });

  it("does not detect casual mention without proper ### subheading", () => {
    const response = `I'm thinking about the ## Behaviors section. ### Maybe we need
to discuss this more.`;
    // ### is mid-line, not at line start — doesn't match
    expect(detectSpec(response)).toBe(false);
  });
});

describe("extractSpec", () => {
  it("extracts spec from first # heading to end", () => {
    const response = `Let me draft the spec for you.

# Timer — Specification

## Overview
A timer app.

## Behaviors
### Setting a timer
- stuff`;
    const extracted = extractSpec(response);
    expect(extracted).toMatch(/^# Timer — Specification/);
    expect(extracted).toContain("## Behaviors");
    expect(extracted).toContain("### Setting a timer");
    expect(extracted).not.toContain("Let me draft");
  });

  it("extracts spec from markdown code fence", () => {
    const response = `Here it is:

\`\`\`markdown
# My App — Specification

## Overview
Stuff here.
\`\`\`

Let me know what you think.`;
    const extracted = extractSpec(response);
    expect(extracted).toMatch(/^# My App — Specification/);
    expect(extracted).not.toContain("```");
    expect(extracted).not.toContain("Let me know");
  });

  it("falls back to full response if no heading found", () => {
    const response = "Just some text with no heading.";
    expect(extractSpec(response)).toBe("Just some text with no heading.");
  });
});

describe("parseVerdict", () => {
  it("parses APPROVED verdict", () => {
    const response = `## Verdict: APPROVED

## Strengths
- Great spec`;
    const verdict = parseVerdict(response);
    expect(verdict.status).toBe("APPROVED");
    expect(verdict.fullResponse).toBe(response);
  });

  it("parses REJECTED verdict", () => {
    const response = `## Verdict: REJECTED

## Issues
### 🔴 Critical — Missing edge cases`;
    const verdict = parseVerdict(response);
    expect(verdict.status).toBe("REJECTED");
  });

  it("returns UNKNOWN for malformed verdict", () => {
    const response = "This is some feedback but no verdict format.";
    const verdict = parseVerdict(response);
    expect(verdict.status).toBe("UNKNOWN");
    expect(verdict.fullResponse).toBe(response);
  });

  it("handles verdict with extra text before it", () => {
    const response = `Let me evaluate this spec.

## Verdict: APPROVED

Good work.`;
    const verdict = parseVerdict(response);
    expect(verdict.status).toBe("APPROVED");
  });
});
