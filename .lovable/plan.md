# Highlight View → Edit → Save

## Scope
Update only existing Highlight cards in Video Analysis. Leave new Highlight creation, transcript selection, and bulk AI unchanged.

## Implementation
- Render saved cards in quiet read-only mode with Theme and Severity chips, Note and Quote text, timestamp, author, checkbox, menu, and an explicit Edit button.
- Give the active card a local draft containing Theme, Note, Quote, and Severity; editing controls update only this draft.
- Save all draft fields atomically, preserve transcript/card linking, show an inline polite “Saved” status, and restore focus to Edit.
- Cancel immediately when unchanged. For dirty edits, intercept Cancel, outside click, and Escape with the existing accessible dialog pattern offering Keep editing or Discard.
- Preserve checkbox selection, bulk insight creation, menu/delete Undo, provenance, and ordinary card-to-transcript navigation.

## Validation
- Type-check the project.
- Browser-test Edit → modify → Save; dirty Cancel → Keep editing; dirty Escape/outside → Discard; read-only transcript sync; checkbox selection.
