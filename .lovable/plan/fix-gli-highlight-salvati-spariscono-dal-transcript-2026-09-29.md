# Fix: gli highlight salvati spariscono dal transcript

## Cosa ho verificato
- Creare e salvare un highlight funziona: subito dopo il salvataggio la frase è sottolineata (l'ho provato in un browser di test).
- La sottolineatura però viene disegnata una volta sola, al momento del salvataggio. Quando la pagina di analisi video si ricarica senza un refresh completo, le sottolineature non vengono ridisegnate: succede tornando da "Media list" o "Temi e insight", e anche dopo un mio aggiornamento dell'anteprima. La card resta a destra, ma il transcript torna pulito.
- Al caricamento vengono ridisegnati solo gli highlight di esempio, che ora sono stati rimossi. Quelli creati da te vengono salvati senza la frase a cui sono collegati.

## Cosa cambia
- Ogni highlight salvato ricorda la frase esatta del transcript e il paragrafo in cui si trova.
- Ogni volta che la pagina di analisi video si apre, tutti gli highlight della sessione vengono ridisegnati nel transcript, con il colore della loro severity (grigio se non ne hanno).
- Il collegamento nei due sensi resta attivo: click sulla sottolineatura porta alla card, click sulla card porta alla frase.
- Vale anche per gli highlight creati con Start/End.

## Dettagli tecnici
- In `save()` di `src/routes/video-analysis.tsx`: salvare `anchor` = testo della quote più `anchorStart`/`anchorEnd` (offset nel testo del transcript), al posto di `anchor: ""`.
- Sostituire l'effetto al mount che ancora solo `INITIAL_OBSERVATIONS` con uno che scorre le osservazioni del video corrente dallo store globale. Usa prima gli offset salvati (verificando che il testo corrisponda), altrimenti cerca il testo della quote. Poi applica `markClass(severity, true)` e registra lo span in `spanRefs`.
- Svuotare `spanRefs` al mount, così non restano riferimenti a nodi staccati dal transcript.
- Verifica con Playwright: crea, salva, vai su Media list e torna indietro. La sottolineatura deve essere ancora presente e cliccabile.
