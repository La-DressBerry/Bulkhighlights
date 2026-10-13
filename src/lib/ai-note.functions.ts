import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askClaude } from "@/lib/claude.server";

export const summarizeQuote = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ quote: z.string().min(1).max(4000), variant: z.number().int().min(0).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    const out = await askClaude({
      system:
        "Sei un UX researcher. Ricevi una citazione trascritta da un'intervista/test di usabilità in italiano (può contenere intercalari e frasi spezzate). Scrivi una nota di sintesi in italiano, max 140 caratteri, una sola frase chiara e sensata che spieghi cosa sta vivendo il tester: il bisogno e il problema/osservazione. Non ripetere la citazione, non usare virgolette né prefissi come 'Need:'. Rispondi solo con la nota.",
      input: `Citazione: """${data.quote}"""${data.variant > 0 ? `\nFornisci una formulazione alternativa diversa (variante ${data.variant}).` : ""}`,
      maxTokens: 1000,
    });
    return { note: out.trim().replace(/^["“]|["”]$/g, "") };
  });
