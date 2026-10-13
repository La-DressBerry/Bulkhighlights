import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const summarizeQuote = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ quote: z.string().min(1).max(4000), variant: z.number().int().min(0).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI non configurata");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "Sei un UX researcher. Ricevi una citazione trascritta da un'intervista/test di usabilità in italiano (può contenere intercalari e frasi spezzate). Scrivi una nota di sintesi in italiano, max 140 caratteri, una sola frase chiara e sensata che spieghi cosa sta vivendo il tester: il bisogno e il problema/osservazione. Non ripetere la citazione, non usare virgolette né prefissi come 'Need:'. Rispondi solo con la nota.",
        input: `Citazione: """${data.quote}"""${data.variant > 0 ? `\nFornisci una formulazione alternativa diversa (variante ${data.variant}).` : ""}`,
      }),
    });
    if (!res.ok || !res.body) {
      const status = res.status;
      throw new Error(
        status === 429 ? "Troppe richieste, riprova tra poco." : status === 402 ? "Crediti AI esauriti." : `Errore AI (${status})`,
      );
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        } catch {
          /* ignore */
        }
      }
    }
    return { note: out.trim().replace(/^["“]|["”]$/g, "") };
  });
