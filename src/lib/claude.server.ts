import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;

/** Single text-in / text-out call to Claude. Reads ANTHROPIC_API_KEY from the server environment. */
export async function askClaude({
  system,
  input,
  maxTokens = 4000,
}: {
  system: string;
  input: string;
  maxTokens?: number;
}) {
  if (!process.env["ANTHROPIC_API_KEY"])
    throw new Error("AI non configurata (manca ANTHROPIC_API_KEY)");
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort: "low" },
      // On a safety decline, the API re-runs the request on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: input }],
    });
    if (response.stop_reason === "refusal") throw new Error("L'AI ha rifiutato la richiesta.");
    return response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      throw new Error("Chiave API Anthropic non valida.");
    if (error instanceof Anthropic.RateLimitError)
      throw new Error("Troppe richieste, riprova tra poco.");
    if (error instanceof Anthropic.APIError)
      throw new Error(`Errore AI (${error.status ?? "rete"})`);
    throw error;
  }
}

/** Parses the first JSON object in a model reply. */
export function parseJsonReply(text: string): unknown {
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}
