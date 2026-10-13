# UX Research Platform — Video Analysis Screen

Build a single full-screen page (`h-screen`) at `/` that recreates a UX research video-analysis workspace, exactly per your spec: light mode, Tailwind v4, lucide-react icons, Inter font.

## Layout

```text
┌──────────────────────────────────────────────────────────┐
│ Header: ← Titolo video ✎        [Use Case] [1] [2] [...] │
├──────────────────────────────┬───────────────────────────┤
│ Left column (60%)            │ Right column (40%)        │
│ ┌──────────────────────────┐ │  Nome partecipante ✎      │
│ │ Video area (bg-gray-200) │ │  Executive summary + [1]  │
│ │  ▶ center, 📌 Bookmark   │ │  Temi predominanti list   │
│ │  [Space] bottom-right    │ │  Refresh/Copy/Share/👍/👎 │
│ ├──────────⠿──────────────┤ │  AI warning box           │
│ │ Transcript (scrollable)  │ ├─ sticky filters ─────────┤
│ │  header + search + links │ │  Highlights: 2, search,   │
│ │  00:00 (yellow highlight)│ │  chips: +Tema/Minor/Major │
│ │  00:22 block             │ ├───────────────────────────┤
│ │  AI warning footer       │ │  Highlight flat cards x2  │
│ └──────────────────────────┘ │  (checkbox, tags, quote,  │
│                              │   severity, author)       │
└──────────────────────────────┴───────────────────────────┘
```

## Details

- **Header**: white, bottom border. Left: ChevronLeft, "Titolo video" + Pencil. Right: three outline buttons (Use Case, 1, 2) + small "..." (MoreHorizontal) button.
- **Main body**: `flex`, `bg-slate-50`, `gap-4`, `p-4`; both columns white, `rounded-xl`, bordered, subtle shadow.
- **Left column (w-3/5)**: video area with large centered Play-circle; small semi-transparent black `Pin` + "Bookmark [Space]" button bottom-right; horizontal resizer with GripHorizontal; scrollable transcript with ThumbsUp/Down, search bar, "Translate"/"Show Sentiment" links, two timestamp blocks (one sentence `bg-yellow-100` highlighted), yellow AI-warning footer.
- **Right column (w-2/5)**: scrollable; participant name h2 + Pencil; executive summary with inline blue citation badges; "Temi predominanti" bullets; action icon row; yellow AI warning; `<hr>`; **sticky filter bar** (`sticky top-0 z-10 bg-white pt-4 pb-4 border-b`) with "Highlights: 2", search input, chips "+ Tema / Minor issue / Major issue"; two flat highlight cards (`border-blue-400`, `rounded-lg`, `p-4`, `mb-4`) with checkbox, Tag icon, timestamp, Pencil/Share/MoreHorizontal, gray theme pills, Nota text, gray Quote block, colored severity label, italic author.
- **Sticky behavior**: enough highlight card content (the 2 cards are tall) so scrolling the right column visibly demonstrates the filter bar sticking.
- **Typography**: Inter via Google Fonts `<link>` in `src/routes/__root.tsx`.

## Technical notes

- Replace the placeholder in `src/routes/index.tsx` with this page; add per-route `head()` (title "UX Research Platform — Video Analysis", description, og tags). No backend, all static mock content.
- Load Inter `<link>` and update root head metadata in `src/routes/__root.tsx`.
- Content is mock data (Italian labels per your spec: "Titolo video", "Nome partecipante", "Temi predominanti", "Carrello non funzionante").
