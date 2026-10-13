import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askClaude } from "@/lib/claude.server";

const Block = z.object({ time: z.string().max(10), text: z.string().max(4000) });

export type SummaryResult = {
  summary: { text: string; citation: { time: string; quote: string } | null }[];
  themes: string[];
};

export const summarizeSession = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ blocks: z.array(Block).min(1).max(60), variant: z.number().int().min(0).max(50) }).parse(d),
  )
  .handler(async ({ data }): Promise<SummaryResult> => {
    const transcript = data.blocks.map((b) => `[${b.time}] ${b.text}`).join("\n");
    const out = await askClaude({
      system:
        'Sei un UX researcher. Ricevi il transcript di un test di usabilità in italiano (blocchi con minuto). Scrivi un executive summary in italiano di 3-4 frasi che riassuma davvero cosa accade nella sessione e i problemi principali, e 3-4 temi predominanti (brevi, max 5 parole). Rispondi SOLO con JSON valido: {"summary":[{"text":"frase","citation":{"time":"01:40","quote":"testo copiato ALLA LETTERA dal transcript, 4-15 parole"}}],"themes":["..."]}. Ogni frase del summary deve avere una citation (o null se non applicabile). La quote deve essere una sottostringa esatta di un singolo blocco, e time il minuto di quel blocco.',
      input: `Transcript:\n${transcript}${data.variant > 0 ? `\n\nFornisci una formulazione diversa (variante ${data.variant}).` : ""}`,
    });
    const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
    const parsed = z
      .object({
        summary: z.array(
          z.object({
            text: z.string(),
            citation: z.object({ time: z.string(), quote: z.string() }).nullable().optional(),
          }),
        ),
        themes: z.array(z.string()),
      })
      .parse(JSON.parse(json));
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    return {
      summary: parsed.summary.map((s) => {
        const c = s.citation;
        const ok = c && data.blocks.some((b) => norm(b.text).includes(norm(c.quote)));
        return { text: s.text.trim(), citation: ok ? { time: c.time, quote: norm(c.quote) } : null };
      }),
      themes: parsed.themes.slice(0, 4),
    };
  });
