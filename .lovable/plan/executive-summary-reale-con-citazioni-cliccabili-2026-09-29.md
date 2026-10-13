# Executive summary reale con citazioni cliccabili

## Cosa vedrai
- **Executive summary**: un vero riassunto di quello che succede nel video, scritto dall'AI a partire dal transcript (3-4 frasi in italiano).
- **Temi predominanti**: 3-4 temi riscontrati dall'AI in questa sessione, al posto di quelli di esempio (carrello, menu laterale, caricamento).
- **Numerini nel testo**: ogni affermazione importante ha un numerino collegato a una frase esatta del transcript.
  - **Hover sul numerino**: appare un piccolo tooltip con la citazione e il minuto (es. "01:40").
  - **Click sul numerino o sul tooltip**: il transcript scorre fino a quel punto e la frase si illumina di giallo per un paio di secondi, poi torna normale.
- Durante la generazione compare un breve stato di caricamento; l'icona "Rigenera" già presente sotto al riassunto crea una nuova versione.
- Se l'AI non risponde (es. crediti esauriti), resta visibile un messaggio breve con la possibilità di riprovare.

## Dettagli tecnici
- Nuova funzione server in `src/lib/ai-summary.functions.ts` (stesso schema di `ai-note.functions.ts`, Lovable AI Gateway, `openai/gpt-6-astra`), che riceve il transcript (blocchi con minuto + testo) e restituisce un JSON: `{ summary: [{ text, citation? }], themes: string[] }`, dove ogni `citation` è `{ time, quote }` con la quote copiata alla lettera dal transcript. Validazione con zod; le citazioni la cui quote non si trova nel transcript vengono scartate.
- In `video-analysis.tsx`: il transcript viene letto dal DOM una volta montato, la generazione parte al caricamento della pagina (risultato tenuto in memoria per la sessione, rigenerato dal bottone Refresh).
- Tooltip: popover leggero al passaggio del mouse sul numerino (quote in riquadro grigio + minuto), cliccabile.
- Click: si calcolano le posizioni della quote nel testo del paragrafo, si inserisce un segno giallo temporaneo (stesso sistema usato per le selezioni, limitato al paragrafo), si scrolla il transcript in vista e dopo ~2,5s il segno viene rimosso con dissolvenza. Non interferisce con highlight salvati o con una card in bozza aperta.
