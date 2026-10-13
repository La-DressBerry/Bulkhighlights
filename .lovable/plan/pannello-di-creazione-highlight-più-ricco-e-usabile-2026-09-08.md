# Pannello di creazione highlight più ricco e usabile

Obiettivo: dare più contesto alla card di creazione e rendere temi, severity e nota più veloci da compilare.

## Temi (multi-select con creazione)

- "+ Aggiungi Tema" apre un campo di ricerca con la lista dei temi esistenti, selezionabili in multi-selezione (checkbox, con spunta sui temi già scelti).
- Scrivendo nel campo la lista si filtra; se il testo non corrisponde a nessun tema compare "Crea «testo»" che aggiunge subito il nuovo tema e lo seleziona.
- I temi scelti restano visibili come pill sopra il campo, ognuna con una "x" per rimuoverla.
- I temi creati restano disponibili nella lista per gli highlight successivi.

## Severity (radio in fila)

- Sostituire il link "+ Aggiungi severity" con un gruppo di opzioni sempre visibile, in una riga orizzontale: Positive, Minor issue, Major issue.
- Stile radio/segmented con pallino selezionato e colore coerente alla gravità (verde, ambra, rosso); selezione singola, si può deselezionare ricliccando.

## Nota con suggerimento AI

- All'apertura del pannello la nota mostra un suggerimento generato automaticamente che descrive need e problema del tester a partire dalla frase selezionata (es. "Il partecipante fatica a… Il bisogno emerso è…").
- Il suggerimento appare come testo già inserito e modificabile, con etichetta "Suggerito da AI" e un pulsante piccolo "Rigenera" .
- Finché il testo è quello suggerito e non modificato, l'annulla non chiede conferma; se l'utente lo modifica scatta la conferma di scarto già esistente.

## Più contesto nella card

- Intestazione del pannello con timestamp della selezione e nome partecipante.
- Contatore caratteri sotto la nota e quote precompilata con etichetta "dalla trascrizione".

## Note tecniche

- Tutto in `src/routes/index.tsx`, stato locale React: lista temi disponibili (estendibile), temi selezionati, severity, testo nota e flag "modificata dall'utente".
- Il suggerimento AI in questa fase è generato lato client con un modello di testo predefinito basato sulla frase selezionata (prototipo). Se serve una generazione reale con Lovable AI, si aggiunge in un secondo momento una chiamata server.
- Nessuna modifica al layout generale, alla lista highlights o al transcript.