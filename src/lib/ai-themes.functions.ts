import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askClaude, parseJsonReply } from "@/lib/claude.server";

const Highlight = z.object({
  id: z.number(),
  note: z.string().max(2000),
  quote: z.string().max(4000),
  source: z.enum(["human", "ai"]),
  status: z.string().max(40).optional(),
});
const Feedback = z.array(z.string().max(1000)).max(60);

async function callGateway(instructions: string, input: string) {
  return parseJsonReply(await askClaude({ system: instructions, input }));
}

const describe = (hs: z.infer<typeof Highlight>[]) =>
  hs
    .map(
      (h) =>
        `#${h.id} [${h.source === "ai" ? "AI-generated" : "researcher"}${h.status ? `, ${h.status}` : ""}] Nota: ${h.note || "—"} | Quote: "${h.quote || "—"}"`,
    )
    .join("\n");

/** Short AI interpretation of what a Theme means, built from the notes of its Highlights. */
export const interpretTheme = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        theme: z.string().min(1).max(120),
        highlights: z.array(Highlight).min(1).max(80),
        feedback: Feedback,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      'Sei un UX researcher. Ricevi un Theme di una ricerca qualitativa e i suoi Highlights (nota del researcher o dell\'AI + quote del tester). Scrivi in italiano una interpretazione breve (max 2 frasi, max 260 caratteri) di cosa significa questo Theme, basandoti soprattutto sulle NOTE. Tieni conto del feedback del researcher, che ha priorità. Indica anche gli id degli Highlights le cui quote sono davvero coerenti con il Theme. Rispondi SOLO con JSON valido: {"interpretation":"...","coherentIds":[1,2]}.',
      `Theme: ${data.theme}\n\nHighlights:\n${describe(data.highlights)}${data.feedback.length ? `\n\nFeedback del researcher:\n- ${data.feedback.join("\n- ")}` : ""}`,
    );
    const parsed = z
      .object({ interpretation: z.string(), coherentIds: z.array(z.number()) })
      .parse(raw);
    const ids = new Set(data.highlights.map((h) => h.id));
    return {
      interpretation: parsed.interpretation.trim(),
      coherentIds: parsed.coherentIds.filter((id) => ids.has(id)),
    };
  });

/** Conversational turn about a Theme: the researcher corrects the lens and discusses its quotes. */
export const chatTheme = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        theme: z.string().min(1).max(120),
        interpretation: z.string().max(1000),
        otherThemes: z.array(z.string().max(120)).max(60),
        highlights: z.array(Highlight).max(80),
        feedback: Feedback,
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
          .min(1)
          .max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      'Sei un assistente di UX research che aiuta il researcher a calibrare la "lente" di un Theme prima di applicarla al resto del corpus. Rispondi in italiano, in modo breve e concreto (max 4 frasi). Se il researcher contesta una quote, ragiona sul perché e, se utile, suggerisci uno degli altri Theme esistenti. Se il researcher corregge il significato del Theme, proponi una nuova interpretazione (max 2 frasi). Rispondi SOLO con JSON valido: {"reply":"...","interpretation":"nuova interpretazione oppure null"}.',
      `Theme: ${data.theme}\nInterpretazione attuale: ${data.interpretation || "—"}\nAltri Theme: ${data.otherThemes.join(", ") || "—"}\n\nHighlights:\n${describe(data.highlights)}${data.feedback.length ? `\n\nFeedback già dato:\n- ${data.feedback.join("\n- ")}` : ""}\n\nConversazione:\n${data.messages.map((m) => `${m.role === "user" ? "Researcher" : "AI"}: ${m.text}`).join("\n")}`,
    );
    const parsed = z
      .object({ reply: z.string(), interpretation: z.string().nullable().optional() })
      .parse(raw);
    return { reply: parsed.reply.trim(), interpretation: parsed.interpretation?.trim() || null };
  });
