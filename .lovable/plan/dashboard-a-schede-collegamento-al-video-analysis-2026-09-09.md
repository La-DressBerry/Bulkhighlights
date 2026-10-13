# Dashboard a schede + collegamento al Video Analysis

Trasformo il progetto in un'app a più pagine con tre percorsi:

- `/media-list` — home predefinita (anche `/` porta qui)
- `/themes-insights`
- `/video-analysis` — l'attuale area di lavoro con video e transcript, spostata qui invariata

## Layout condiviso (Media list + Themes and insights)

- Header in alto: breadcrumb "< Testino200n >", titolo "Giulia" con icona matita, pulsante "Upload media" a destra.
- Due schede sotto il titolo: "Media list" e "Themes and insights". La scheda attiva ha una sottolineatura nera spessa; cliccandole si passa da una vista all'altra (sono due indirizzi diversi, quindi condivisibili e con tasto Indietro funzionante).

## Media list

- Riga di riepilogo: "4 media uploaded" seguito da pillole grigie: "Unknown device 4", "Minor issue 4", "Positive finding 5", "Observation 5".
- Riquadro bianco con bordo che contiene l'elenco.
- Intestazione elenco: "Device: Unknown device (4)" a sinistra; "Duration", "Test date", "Actions" a destra.
- 4 righe di esempio: miniatura nera, titolo file (es. "TN12.mp4"), sottotitolo "Participant: Giulia", piccole etichette di severità; a destra durata ("05:37"), data ("Jun 09, 26") e icona tre puntini.
- Tutta la riga è cliccabile e porta a `/video-analysis`. Il menu tre puntini non fa scattare la navigazione.

## Themes and insights

- Tre riquadri in griglia: "Analyzed User Contributions" (0 videos su 0), "Detected Themes" (0 recurring themes su 0), "Test Progress" (numero arancione "4 minor issue" su 14 con barra di avanzamento segmentata blu scuro / verde / arancione / rosso).
- Titolo sezione "Themes and Observations" con due icone per vista elenco/griglia a destra.
- Sottotitolo gruppo: "Usecase 0 - Import Video".
- Elenco di temi apribili a fisarmonica: intestazione bianca con bordo, casella di spunta + titolo del tema a sinistra; a destra etichette ("Positive Findings (3)", "/3 tot.", "Users: 1") e freccia.
- Aperta la fisarmonica, dentro compaiono le stesse schede di osservazione già usate nella colonna destra del Video Analysis, in sola lettura (stessi colori di severità, temi, nota e citazione).

## Video Analysis

- La freccia indietro in alto a sinistra, accanto a "Titolo video", riporta a `/media-list`.

## Note tecniche

- Route file-based TanStack: `src/routes/media-list.tsx`, `src/routes/themes-insights.tsx`, `src/routes/video-analysis.tsx`; `src/routes/index.tsx` reindirizza a `/media-list`. Layout condiviso come componente `src/components/DashboardShell.tsx` usato dalle due pagine dashboard (niente layout route, così `/video-analysis` resta a schermo intero).
- Il contenuto attuale di `src/routes/index.tsx` viene spostato in `src/routes/video-analysis.tsx` senza modifiche di logica, salvo la freccia indietro che diventa un `Link to="/media-list"`.
- Gli helper di severità (`severityClass`, `severityBorderClass`, `severityFillClass`, ecc.) e le costanti (`SEVERITY_OPTIONS`, `THEME_OPTIONS`) si spostano in `src/lib/highlights.ts` e vengono importati sia dal workspace sia dalla nuova scheda in sola lettura `src/components/HighlightCard.tsx`.
- Ogni route ha il proprio `head()` con titolo e descrizione dedicati.
- Tutti i dati sono di esempio, nessun backend.
