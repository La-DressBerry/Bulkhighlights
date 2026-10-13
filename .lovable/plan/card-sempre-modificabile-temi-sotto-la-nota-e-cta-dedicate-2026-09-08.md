# Card sempre modificabile, temi sotto la nota e CTA dedicate

## 1. Ordine dei campi

Nel pannello di creazione e nelle card della colonna destra i campi seguono questo ordine:

1. Nota
2. Quote
3. Tema
4. Severity

Il blocco Tema si sposta quindi in basso, subito prima della severity.

## 2. Niente più stato "visualizzazione" / "modifica"

- Sparisce l'icona matita e sparisce la coppia di pulsanti "Salva modifiche" / "Cancel".
- Ogni card mostra sempre i campi modificabili: nota e quote sono aree di testo sempre scrivibili, temi e severity si gestiscono con le CTA descritte sotto.
- Ogni modifica viene salvata da sola: la card e il testo evidenziato nel transcript (colore severity, quote) si aggiornano subito, senza conferme.
- Il click sulla card continua a portare al punto del transcript, ma non quando si clicca dentro un campo, una chip o una CTA.
- Restano invariati: menu tre puntini, eliminazione con "Annulla", ancoraggio bidirezionale, maniglie sul transcript (ora sempre attive per la card su cui si sta lavorando, cioè quella con un campo attivo).

## 3. CTA dedicate per temi e severity

**Temi**
- Se non ci sono temi: una CTA con icona etichetta e testo "Add themes" (bordo grigio chiaro, arrotondata, come nel riferimento).
- Cliccandola compare l'input di ricerca con la lista dei temi selezionabili e la possibilità di crearne di nuovi.
- Quando si esce dall'input (click fuori o Esc), l'input scompare e restano solo le chips dei temi scelti; ogni chip ha la "x" per rimuoverla e accanto alle chips resta un piccolo "+" per riaprire l'input.
- Se si esce senza aver scelto nulla, torna la CTA "Add themes".

**Severity**
- Se non è impostata: CTA "Add severity" con la stessa forma.
- Cliccandola compaiono le opzioni in riga (Positive, Wish, Minor issue, Major issue, Bug).
- Appena si sceglie un valore la riga di opzioni si chiude e resta solo la chip colorata della severity, con "x" per toglierla (che riporta la CTA).

## Note tecniche

- Tutto in `src/routes/index.tsx`.
- Si rimuovono `editingCardId`, `editDraft`, `startEditCard`, `saveEditCard`, `cancelEditCard` e le due varianti di markup della card; resta un unico markup sempre editabile che scrive direttamente su `items` tramite un `updateItem(id, patch)`.
- Stato locale per card: quale picker è aperto (`openThemePickerId`, `openSeverityPickerId`) e la query di ricerca temi; chiusura via listener `mousedown` su document + Esc.
- Il colore del bordo card, del marker in timeline e dello span nel transcript continua a derivare da `severity` (grigio se assente) e si aggiorna a ogni cambio.
- Le stesse CTA e lo stesso ordine dei campi vengono applicati anche al popover di creazione, per coerenza.
