# Bulk AI Highlights review iteration

## What will change

- Rename the first-time entry point and related modal copy to **Find similar Highlights**, clearly framing results as candidates that require review.
- Keep the current eligibility behavior: only the subtle manual-analysis progress appears before unlock, then the existing global alert appears automatically.
- Remove the duplicate **View context** action; **Watch clip** remains the single way to inspect video, timestamp, quote, and surrounding transcript context.
- Make individual decisions reversible in both review stages: cards remain visible with **Accepted** or **Rejected** status and an **Undo** action that clears the decision.
- Keep the initial 3–4 examples one-by-one with live reviewed progress.
- Add a compact live status line, checkboxes, and **Accept selected / Reject selected** only to the final results step; selection remains independent from viewing or editing.
- Keep the final action available with unreviewed results, show how many will be skipped, and add only accepted Highlights.
- Preserve normal Highlight editing after addition and show the subtle provenance **AI-assisted · reviewed by you**.
- Rename later Theme states to plain language such as **New Theme**, **Not analyzed**, and **Up to date**, without rerunning current Themes.

## Interaction details

- Clicking **Undo** deletes that suggestion’s decision from state rather than replacing it with another status.
- Bulk actions update only selected final-result suggestions and then clear selection.
- The final counts and CTA update immediately after individual, undo, edit, or bulk actions.
- **Needs review** remains available for ambiguous Theme assignment and does not introduce confidence scores.

## Verification

- Exercise the initial sample, clip preview, accept/reject/undo, and transition to the second pass.
- Exercise final-result selection, bulk decisions, individual editing, live counts, unreviewed completion, and accepted-only addition.
- Confirm the pre-unlock state has no disabled action and the incremental Theme entry point affects only new Themes.