# Modale "Add to Insight" + snackbar

## Cosa cambia
Cliccando "Craft insight" nella barra flottante si apre una modale (come negli screenshot) invece del toast attuale.

**Step 1 – Add to Insight**
- Titolo "Add to Insight", sottotitolo "N highlights selected", X per chiudere.
- Riga "Create new Insight" (icona +, chevron) → porta allo step 2.
- Sezione grigia "Or select a pre-existing Insight" con campo "Find Insight" che filtra la lista.
- Ogni insight esistente mostra titolo e "N linked highlights"; cliccandolo gli highlight vengono aggiunti (senza duplicati).
- Se non ci sono insight: messaggio vuoto discreto.

**Step 2 – Create new Insight**
- Freccia indietro, X, titolo "Create new Insight".
- Campo "Title*" obbligatorio, "Subtitle" facoltativo (area di testo).
- "N highlights will be linked to this insight."
- "Create" disabilitato finché il titolo è vuoto; "Cancel" chiude.

**Dopo creazione o aggiunta**
- La modale si chiude, la selezione si azzera.
- Snackbar verde con spunta: "Added to “Titolo”" + pulsante scuro "Vedi insight" che porta alla pagina Temi e insight. Sparisce da sola dopo ~5s.

Gli insight restano in memoria per la sessione (spariscono al refresh, come gli highlight).

## Dettagli tecnici
- `observations-store.tsx`: aggiungere `insights: {id, title, subtitle, highlightIds[]}[]` + `setInsights` al context.
- `video-analysis.tsx`: stato `insightModal` (null | "pick" | "create"), query ricerca, titolo/sottotitolo; sostituire `insightToast` con `insightSnack: {title} | null`; snackbar con `<Link to="/themes-insights">`.
- Modale realizzata con il Dialog shadcn esistente, stile coerente (bordi grigi, card arrotondate, CTA primaria).
