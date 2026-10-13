# Il pannello di creazione diventa una card nella colonna di destra

Oggi, quando si seleziona del testo nel transcript, il pannello di creazione appare fluttuante sopra il transcript. Lo spostiamo nella lista degli highlight a destra.

## Comportamento

1. Selezionando del testo nel transcript, il testo resta evidenziato come adesso (giallo, oppure colore della severity appena la si sceglie).
2. Il pannello di creazione non appare più sopra il transcript: compare come una card nella colonna di destra, inserita fra le card esistenti nella posizione corretta secondo il minuto della selezione.
3. La card di creazione ha lo stesso aspetto delle altre card (stesso bordo, stessa larghezza, stesso spazio interno) così da sembrare parte della lista, e i suoi campi restano quelli attuali: nota con suggerimento AI, quote, temi, severity, "Cancel" e "Add highlight".
4. Entra con una piccola animazione morbida (comparsa in dissolvenza con leggero scorrimento) e la lista si apre per farle spazio; la colonna scorre da sola fino a mostrarla.
5. Cliccando fuori — cioè fuori dalla card e fuori dal testo selezionato — la card si chiude e l'evidenziazione nel transcript sparisce. Se è stato scritto qualcosa resta la richiesta di conferma di scarto già esistente.
6. "Add highlight" continua a salvare e la card diventa un highlight normale nella stessa posizione cronologica.
7. Il pannello del "Start highlight" dal player resta dov'è, accanto ai comandi del video (lì serve vicino al pulsante). Se preferisci spostare anche quello nella colonna di destra, basta dirlo.

## Note tecniche

- In `src/routes/video-analysis.tsx` il blocco `phase === "editing"` viene estratto dal wrapper del transcript e reso all'interno della lista di destra, non più `fixed` con `pos`/`popRef` posizionati sul testo.
- La lista di destra costruisce un array unificato: gli highlight visibili più, quando `phase === "editing"` e non è in live tagging, un elemento draft con chiave `"draft"` e `time = selTime`; l'ordinamento cronologico esistente per minuto di inizio viene applicato all'array unificato.
- La card draft riusa il markup del popover senza contenitore `fixed`, con classi `animate-fade-in-up` e larghezza piena, e mantiene `popRef` per il click esterno (il listener `mousedown` continua a ignorare i click sullo span evidenziato e sulle maniglie).
- Scroll automatico alla card draft al montaggio tramite `scrollIntoView({ behavior: "smooth", block: "nearest" })`.
- `pos`/`setPos` restano solo per il popover del live tagging; nessun cambiamento a modale di scarto, toast, maniglie di selezione e marker in timeline.
