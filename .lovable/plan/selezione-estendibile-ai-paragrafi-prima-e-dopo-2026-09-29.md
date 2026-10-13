# Selezione estendibile ai paragrafi prima e dopo

## Cosa vedrai
- Trascinando le maniglie blu puoi allargare la selezione al paragrafo successivo o precedente. Vale sia per la card in creazione sia per un highlight già salvato.
- Anche selezionando a mano puoi prendere più paragrafi in una volta.
- Nel transcript la sottolineatura segue il testo parlato su più paragrafi, ma salta le righe "Partecipante · minuto": resta pulita, senza blocchi colorati tra un paragrafo e l'altro.
- Il colore della severity e il click per aprire la card funzionano su tutti i pezzi della selezione. Passando sopra un pezzo si illumina l'intero highlight.
- La Quote unisce il testo dei paragrafi selezionati, separati da uno spazio.
- Il minuto dell'highlight è quello del primo paragrafo selezionato, quindi l'ordine delle card a destra resta cronologico.
- Tornando alla pagina, gli highlight su più paragrafi vengono ridisegnati correttamente.

## Dettagli tecnici
- Rimuovere il blocco a un solo paragrafo: `blockBounds` nei due gestori di trascinamento (bozza e card salvate) e `clampToParagraph` in `applyMark`. Il limite diventa l'intero transcript, esclusi i testi delle etichette.
- Una selezione diventa un gruppo di più span, uno per ogni paragrafo attraversato, tutti con lo stesso `data-highlight-id` (o bozza):
  - `markRef` diventa una lista di span;
  - `unmark` e `applyMark` agiscono su tutti gli span;
  - `updateHandles` usa il primo rettangolo del primo span e l'ultimo rettangolo dell'ultimo.
- `spanRefs` conserva il primo span per lo scroll. Colore, flash di focus e rimozione vengono applicati a tutti gli span con lo stesso id.
- Ancoraggio salvato: i pezzi del testo per paragrafo, uniti da `\n`. Alla riapertura della pagina ogni pezzo viene cercato in sequenza e avvolto.
- Verifica con Playwright:
  - trascinare la maniglia di fine nel paragrafo successivo e quella di inizio in quello precedente;
  - salvare, controllare la quote e le sottolineature;
  - uscire e tornare alla pagina, poi cliccare un pezzo per aprire la card.
