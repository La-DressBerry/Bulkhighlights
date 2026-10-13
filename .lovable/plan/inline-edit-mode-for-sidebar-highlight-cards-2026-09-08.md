# Inline Edit Mode for Sidebar Highlight Cards

## Goal
Make the Pencil icon on each saved highlight card toggle that card into an inline "Edit Mode" (no modal, no layout shift), with pre-filled editable fields and Save/Cancel actions.

## Changes (all in `src/routes/index.tsx`)

### 1. State
- `editingCardId: number | null` — which card is in edit mode (only one at a time).
- `editDraft: { themes: string[]; note: string; quote: string; severity: string }` — working copy of the card's data while editing.

### 2. Trigger
- The existing Pencil button (line ~1497) gets `onClick`: sets `editingCardId` to that card and copies its current `themes`, `note`, `quote`, `severity` into `editDraft`.

### 3. Edit Mode UI (replaces read-only content inside the same `<article>`)
Rendered when `editingCardId === h.id`, matching the reference:
- Container: white bg, `rounded-xl`, `border border-gray-200`, `p-4`.
- Timestamp text at top (the card's existing time).
- **Tema**: label + bordered container (`flex items-center gap-2 p-2 border`) with existing themes as removable chips (`bg-gray-200`, each with an `x` icon to remove). Reuses the existing theme list for adding.
- **Nota**: label + white textarea with light gray border, pre-filled with the note.
- **Quote**: textarea with `bg-gray-100`, pre-filled with the quote.
- **Severity**: label + horizontal row of radio inputs with colored labels: Positive (`text-green-500`), Wish (`text-blue-500`), Minor issue (`text-yellow-500`), Major issue (`text-red-500`); current severity pre-checked.
- **Footer**: primary blue button "Salva modifiche" + outline "Cancel".

### 4. Interactions
- **Cancel**: discards the draft, returns card to read-only state unchanged.
- **Salva modifiche**: writes the draft into the card's data (updates `themes`, `note`, `quote`, `severity` + matching `severityClass`/border color), exits edit mode, and fires the existing green success toast: "Highlight salvata. Puoi modificarla in qualsiasi momento!".
- Card-click-to-scroll stays disabled while in edit mode (clicks inside the form must not trigger transcript scrolling); Pencil/3-dots excluded as today.

## Verification
- `bunx tsc --noEmit` passes.
- Playwright: click Pencil on a card → form appears inline pre-filled; edit note/severity → Salva modifiche → read-only card shows new values, severity color/border updated, green toast appears; repeat with Cancel → data unchanged.
