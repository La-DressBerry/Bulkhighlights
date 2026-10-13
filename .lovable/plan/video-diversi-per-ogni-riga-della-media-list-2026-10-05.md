# Video diversi per ogni riga della Media list

Oggi `/video-analysis` mostra sempre lo stesso video (id fisso 1). Rendo la pagina dipendente dal video cliccato.

## Cosa cambia

- **Indirizzo per video**: la pagina diventa `/video-analysis/$mediaId` (es. `/video-analysis/2`). Ogni video ha il suo indirizzo, condivisibile e con tasto Indietro funzionante.
- **Media list**: cliccando una riga si apre il video di quella riga (TN12.mp4 → video 1, TN13.mp4 → video 2, ecc.).
- **Pagina video**: legge l'id dall'indirizzo e mostra titolo, partecipante, video e transcript di quel video. Gli highlight creati restano associati a quel video (già funziona così con `videoId`, ora l'id arriva dall'indirizzo invece che dal valore fisso).
- **Freccia indietro**: riporta sempre a `/media-list`.

## Contenuti dei video

- **Video 1 (TN12.mp4)**: la registrazione reale già caricata, con il suo transcript.
- **Video 2-4**: non abbiamo ancora le registrazioni. Useranno in via provvisoria la stessa registrazione come segnaposto, con un transcript breve di esempio diverso per ciascuno, così si vede che sono pagine diverse. Quando caricherai i video reali li sostituiremo.

## Note tecniche

- Nuovo file `src/routes/video-analysis.$mediaId.tsx` (sostituisce `video-analysis.tsx`); il vecchio indirizzo `/video-analysis` reindirizza a `/video-analysis/1`.
- Mappa per-video in `src/lib/observations-store.tsx`: id → { videoSrc, transcript blocks, titolo, partecipante }.
- `media-list.tsx`: `navigate({ to: "/video-analysis/$mediaId", params: { mediaId: String(m.id) } })`.
- Temi e insight e la media list continuano a leggere gli highlight da tutti i video.
