# Judge Test Fixtures

Use these to validate that the Judge agent is calibrated correctly.
Run each through the Judge. Expected verdicts are noted.

---

## Fixture 1: SHOULD PASS

```markdown
# Task Timer — Specification

## Overview
A minimal countdown timer web app for freelancers who bill by the hour. The user sets a duration, starts the timer, and gets a browser notification when time is up. Solves the problem of losing track of billable time blocks.

## User
Freelance professionals (designers, developers, consultants) who work in timed blocks (e.g., 25-minute pomodoros or 1-hour client sessions). Used on desktop browsers during work sessions. Single user, no accounts, no backend.

## Behaviors

### Setting a timer
- **Precondition:** App is open in browser. No timer is running.
- **Action:** User enters duration in minutes (numeric input field, integers only) and clicks "Start."
- **Expected outcome:** Timer begins counting down. Display shows remaining time in MM:SS format. Start button changes to "Pause" button.
- **Edge cases:**
  - Empty input → "Start" button is disabled. No error message needed — the disabled state is sufficient.
  - Zero or negative number → Input rejects non-positive values. Minimum value is 1.
  - Non-integer input → Input field accepts only integers (type="number", step="1"). Decimals are rounded down.
  - Very large number (e.g., 9999) → Accepted. Display switches to HH:MM:SS format when duration exceeds 59 minutes.

### Pausing and resuming
- **Precondition:** Timer is running.
- **Action:** User clicks "Pause." Timer stops. Button changes to "Resume."
- **Expected outcome:** Timer freezes at current remaining time. Clicking "Resume" continues countdown from where it stopped.
- **Edge cases:**
  - Rapid pause/resume clicks → Timer state is correct regardless of click speed. No debounce needed — state is synchronous.
  - Browser tab loses focus while paused → Timer remains paused. No drift.

### Timer completion
- **Precondition:** Timer is running and reaches 00:00.
- **Action:** Automatic — no user action required.
- **Expected outcome:** Browser notification fires with text "Timer complete!" Display shows 00:00. A "Reset" button appears.
- **Edge cases:**
  - Browser notifications not permitted → App shows an in-page alert banner instead (yellow background, black text, centered above timer). No sound.
  - Browser tab is in background → Notification still fires (uses Notification API, not alert()). Timer accuracy maintained via Date.now() comparison, not setInterval counting.

### Resetting
- **Precondition:** Timer has completed (showing 00:00) or is paused.
- **Action:** User clicks "Reset."
- **Expected outcome:** Timer clears. Display returns to initial state (empty input field, "Start" button). Previous duration is NOT pre-filled.
- **Edge cases:**
  - Reset while timer is running → "Reset" button is not visible while timer is running. Only visible when paused or completed.

## Constraints
- No backend. Pure client-side (HTML + CSS + JS).
- No frameworks. Vanilla JS only.
- No accounts, no login, no data persistence between sessions.
- Does not track history of past timers.
- Does not play audio on completion (notifications only).
- Single timer only — no simultaneous timers.

## Acceptance criteria
- [ ] User can enter minutes and start a countdown timer
- [ ] Timer displays remaining time in MM:SS (or HH:MM:SS for >59 min)
- [ ] Pause stops the timer; Resume continues from paused time
- [ ] Timer fires browser notification on completion
- [ ] If notifications are blocked, in-page alert appears instead
- [ ] Timer accuracy is maintained even when tab is in background (within 1 second tolerance)
- [ ] Reset returns app to initial state
- [ ] Input rejects non-positive and non-integer values

## Open questions
- None
```

**Expected Judge verdict: APPROVED**
Reasoning: All behaviors have complete precondition/action/outcome/edge cases. Acceptance criteria are testable. Constraints are specific. No ambiguous language. Scope is clearly bounded.

---

## Fixture 2: SHOULD FAIL (missing edge cases, vague language)

```markdown
# Note Taking App — Specification

## Overview
A simple note-taking application for personal use. Users can create, edit, and delete notes.

## User
Anyone who wants to take notes.

## Behaviors

### Creating a note
- **Precondition:** User is on the main screen
- **Action:** User clicks "New Note" and types content
- **Expected outcome:** Note is saved automatically

### Editing a note
- **Precondition:** Note exists
- **Action:** User clicks on a note and modifies the text
- **Expected outcome:** Changes are saved

### Deleting a note
- **Precondition:** Note exists
- **Action:** User deletes the note
- **Expected outcome:** Note is removed

## Constraints
- Should be fast and responsive
- Should work on mobile

## Acceptance criteria
- [ ] User can create notes
- [ ] User can edit notes
- [ ] User can delete notes
- [ ] App feels snappy

## Open questions
- What database to use?
- How should search work?
```

**Expected Judge verdict: REJECTED**
Expected issues:
- 🔴 No edge cases on any behavior (what if note is empty? what's the max length? what happens on save failure?)
- 🔴 "Saved automatically" — when? on every keystroke? on blur? after a delay? 
- 🔴 "User deletes the note" — how? button? swipe? keyboard shortcut? Is there confirmation?
- 🔴 "App feels snappy" is not testable
- 🟡 "fast and responsive" is vague — needs specific metrics
- 🟡 "Anyone who wants to take notes" is too broad — what context? Desktop? Mobile? Both?
- 🟡 No constraints on what the app does NOT do
- 🟡 Open questions include search — is search in scope or not?

---

## Fixture 3: SHOULD FAIL (borderline — good structure but critical gaps)

```markdown
# Expense Tracker — Specification

## Overview
A personal expense tracking web app for freelancers who need to categorize spending for tax purposes. Users log expenses with amount, category, date, and optional receipt photo. Generates monthly summaries.

## User
Freelance professionals in the US who track business expenses for Schedule C tax filing. Desktop browser, single user, no shared access.

## Behaviors

### Adding an expense
- **Precondition:** User is logged in and on the dashboard
- **Action:** User clicks "Add Expense," fills in amount (USD), selects category from dropdown, sets date, optionally uploads receipt photo, clicks "Save"
- **Expected outcome:** Expense appears in the list, sorted by date (newest first). Monthly total updates.
- **Edge cases:**
  - Missing amount → Save button disabled
  - Future date → Allowed (for pre-planned expenses)
  - Duplicate entry → Allowed (user might have two lunches)
  - Receipt photo > 10MB → Error message: "File too large. Maximum 10MB."
  - Receipt photo wrong format → Accept: JPG, PNG, PDF only. Error message for others.

### Viewing monthly summary
- **Precondition:** User has logged at least one expense
- **Action:** User navigates to "Monthly Summary" view, selects month/year
- **Expected outcome:** Displays total spend, breakdown by category (bar chart), and list of all expenses for that month
- **Edge cases:**
  - Month with no expenses → Shows $0 total, empty chart, message: "No expenses recorded for [month]"
  - Expense on boundary (e.g., Jan 31 23:59) → Assigned to January based on the date field value, not timestamp of entry

### Editing an expense
- **Precondition:** Expense exists
- **Action:** User clicks expense row, modifies fields, clicks "Save"
- **Expected outcome:** Expense updates. Monthly summary recalculates.
- **Edge cases:**
  - Change date to different month → Expense moves to new month's summary
  - Remove receipt photo → Photo deleted, expense retains other fields

### Deleting an expense
- **Precondition:** Expense exists
- **Action:** User clicks delete icon on expense row, confirms in modal ("Are you sure? This cannot be undone.")
- **Expected outcome:** Expense removed. Monthly summary recalculates. 
- **Edge cases:**
  - Delete last expense in a month → Monthly summary shows $0, not an error

## Constraints
- Does NOT do tax filing or tax calculations
- Does NOT support multiple currencies (USD only)
- Does NOT sync with bank accounts
- Does NOT support shared/team access
- Tech: React frontend, local storage for Phase 1 (no backend)
- Receipt photos stored as base64 in local storage
- Maximum 1000 expenses before performance may degrade (acceptable for Phase 1)

## Acceptance criteria
- [ ] User can add expense with amount, category, date, and optional receipt
- [ ] User can view monthly summary with category breakdown
- [ ] User can edit any field of an existing expense
- [ ] User can delete expense with confirmation dialog
- [ ] Monthly totals recalculate correctly after add/edit/delete
- [ ] Receipt upload accepts JPG/PNG/PDF under 10MB

## Open questions
- What are the expense categories? (Need final list from user)
- Should there be an export feature (CSV) for tax season?
```

**Expected Judge verdict: REJECTED**
Expected issues:
- 🔴 "User is logged in" — but no login behavior is defined anywhere in the spec. Is there auth? The constraints don't mention it. If there's no auth, remove "logged in" from preconditions. If there is auth, it needs its own behavior section.
- 🔴 Categories are listed as an open question but are required for the "Add Expense" behavior (dropdown). The Coder can't build the dropdown without knowing the categories. Either provide the list or make it user-configurable (which is a new behavior).
- 🟡 "bar chart" in monthly summary — is this a specific requirement or is any visualization acceptable? If bar chart is required, specify: horizontal or vertical? One bar per category? What colors?
- 🟡 No behavior for first-time use / empty state (what does the dashboard look like with zero expenses?)
- 🟢 Export feature in open questions should be explicitly scoped out if not in Phase 1

Note: This spec is much better than Fixture 2 — good structure, real edge cases, clear constraints. But the auth contradiction and missing categories are critical enough to reject. The Judge should acknowledge the quality while still rejecting.

---

## How to use these fixtures

1. Feed each spec to your Judge agent
2. Compare the Judge's verdict and issues against the expected results
3. If the Judge approves Fixture 2, the Judge prompt is too lenient — tighten evaluation criteria
4. If the Judge rejects Fixture 1, the Judge prompt is too strict — relax the "always flag" ambiguity list
5. Fixture 3 is the calibration test — the Judge should reject but acknowledge quality. If it just dumps a list of issues without noting strengths, adjust the disposition.
