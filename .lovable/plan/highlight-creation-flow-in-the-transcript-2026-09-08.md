# Highlight creation flow in the transcript

Add an interactive flow that lets you create a highlight starting from a sentence in the transcript, with a small editing panel, a discard confirmation, a success message, and a new card appearing in the right-hand list.

## What you'll be able to do

1. Click the sentence at 00:45 ("Lavoriamo sulle opportunità che arrivano…").
   - It turns pastel yellow to show it's being worked on.
   - A small white panel appears next to it (rounded corners, soft shadow, fixed width).

2. Inside the panel:
   - "+ Aggiungi Tema" text button
   - "Nota" writing box with the placeholder "Nota - con suggerimento di testo"
   - "Quote precompilata *" writing box, grey background, already filled with the selected sentence
   - "+ Aggiungi severity" text button
   - Bottom row: blue "Add highlight" button and outlined "Cancel" button

3. Closing without saving:
   - Nothing typed in "Nota" → clicking "Cancel" or anywhere outside closes the panel and removes the yellow.
   - Something typed → a centred confirmation box appears over the page: "Discard highlight? Highlights are only saved when clicking 'Add highlight'." with "Keep editing" (returns to the panel) and "Discard" (closes everything, removes the yellow).

4. Saving with "Add highlight":
   - The panel fades away.
   - The sentence switches from yellow to a saved look: light grey background with a coloured left bar.
   - A green message appears at the bottom right: "Highlight salvata. Puoi modificarla in qualsiasi momento!" and fades after a few seconds.
   - A new card appears at the top of the "Highlights" list on the right, styled exactly like the existing ones, briefly flashing light green before settling to white. The counter above the list updates to 3.

## Technical notes

- All changes stay in `src/routes/index.tsx`; no new dependencies.
- Local React state: `phase` ('idle' | 'editing' | 'saved'), `note`, `quote`, `showDiscardModal`, `toastVisible`, and a `createdHighlights` array prepended to the existing static `highlights` array.
- The 00:45 transcript block becomes a `relative` wrapper containing a clickable `<span>`; the popover renders absolutely positioned below it with `z-50`, inside a `relative` container so it isn't clipped (transcript pane keeps `overflow-y-auto`; the popover width is `w-80` and stays inside the column).
- Outside-click handled with a `useRef` on the popover plus a `mousedown` listener on `document`, routed through the same dirty-check as "Cancel".
- Discard modal: `fixed inset-0 z-50` overlay with `bg-black/40` and a centred white card.
- Toast: `fixed bottom-4 right-4 z-50`, green, auto-dismiss via `setTimeout` (cleared on unmount).
- New card data: time `00:45 - 00:52`, themes from any added tema (default "Nuovo tema"), the typed note, the pre-filled quote, severity defaulting to "Minor issue", author "Giulia Lissoni". Flash effect via a `justAdded` id and a transition class removed after ~1.2s.
- Highlights heading text derives from the list length instead of the hardcoded "2".
- The "+ Aggiungi Tema" and "+ Aggiungi severity" buttons toggle simple inline pickers (small preset lists) so the demo stays self-contained.
