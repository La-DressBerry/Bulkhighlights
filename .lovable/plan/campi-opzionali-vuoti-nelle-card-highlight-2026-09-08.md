# Campi opzionali vuoti nelle card highlight

Correggere il salvataggio e la visualizzazione delle card in modo che temi, nota e severity vuoti non producano alcun segnaposto né colore di default.

## Modifiche in `src/routes/index.tsx`

1. **Temi — niente chip "Nuovo tema" di default**
  - Nella funzione `save()` (~riga 466): sostituire `themes: themes.length ? themes : ["Nuovo tema"]` con `themes`.
  - La card in visualizzazione già nasconde l'area temi quando l'array è vuoto (condizione `h.themes.length > 0`), quindi con 0 temi non apparirà nulla.
2. **Nota — niente "-" di default**
  - Nella funzione `save()` (~riga 467): sostituire `note: note.trim() || "—"` con `note: note.trim()`.
  - La card in visualizzazione già nasconde il paragrafo quando la nota è vuota (`h.note.trim() !== ""`).
3. **Severity — nessun default "Minor issue", colore grigio**
  - `save()` (riga 462): salvare la severity come stringa vuota (`""`) quando non selezionata, invece di `"Minor issue"`. La card in visualizzazione già nasconde l'etichetta severity quando vuota (riga 2024).
  - Rimuovere i fallback `?? "Minor issue"` / `|| "Minor issue"` che forzano il colore ambra:
    - `markClass()` (~riga 329): con severity vuota usare il bordo grigio (`severityBorderClass("")` restituisce già `border-gray-200`).
    - drag delle maniglie in edit (~riga 759): passare `editDraft?.severity ?? ""`.
    - `savedSeverity` nel blocco demo (~riga 905): `severity ?? ""`.
  - Verificare che le funzioni colore trattino la severity vuota come grigio neutro: `severityClass` già restituisce `text-gray-400`; allineare il bordo "strong" (`severityStrongBorderClass`) a un grigio neutro quando vuota.

## Verifica

- `bunx tsgo --noEmit` deve passare.
- Test Playwright: creare un highlight senza tema, senza nota e senza severity → la card salvata mostra solo orario, quote e autore; nessuna chip, nessun "-", nessuna etichetta severity; il bordo della card e del testo evidenziato nel transcript è grigio.