# Label "Salvato" con spunta nelle card in modifica

Quando si modifica qualsiasi cosa in un highlight già creato — nota, quote, temi, severity, oppure la porzione di transcript trascinando le maniglie — dentro la card compare una piccola label verde "Salvato" con una spunta, che scompare da sola dopo circa 2 secondi.

## Comportamento

- Ogni modifica a una card salvata (le card di creazione/draft non sono coinvolte: la loro creazione ha già il suo feedback) fa apparire la label "Salvato" nella card.
- La label resta visibile mentre si continua a modificare (es. durante la digitazione nella nota) e scompare ~2 secondi dopo l'ultima modifica.
- Se si passa a modificare un'altra card, la label segue l'ultima card modificata.

## Posizione nella card

- Nella riga di intestazione della card (quella con checkbox, icona tag e timestamp), a destra accanto alle icone azione: badge piccolo verde con icona Check + testo "Salvato" (fondo verde chiaro, testo verde, pill arrotondata, coerenza con il resto della UI).

## Note tecniche

- Tutto in `src/routes/video-analysis.tsx`.
- Nuovo stato `savedFlashId: number | null` + ref per il timer di auto-hide.
- Trigger centrale: la funzione `updateItem(id, patch)` (riga ~954) è già l'unico punto di scrittura delle card salvate — temi (Add themes/chips), nota, quote, severity e la modifica della selezione da maniglie (`updateItem(editingCardId, { quote, anchor })`) passano tutti da lì. Basta settare `savedFlashId = id` lì e riarmare il timer a ~2s.
- Nessuna modifica a `save()` (creazione): usa `setItems` direttamente, quindi non attiva la label; resta il flash verde "justAdded" esistente.
- Rendering: nel markup della card salvata (riga ~2277, gruppo icone a destra), `savedFlashId === h.id &&` badge `flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600` con `<Check className="h-3 w-3" />` + "Salvato". Import di `Check` da lucide-react se non già presente.
- Pulizia: il timer viene resettato a ogni update e clearato all'unmount.
