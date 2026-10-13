import { useEffect, useRef, useState } from "react";
import { interpretTheme } from "@/lib/ai-themes.functions";
import { useObservations, type Observation, type ThemeFeedback } from "@/lib/observations-store";

export const UNCATEGORIZED = "Uncategorized";

export const isAi = (o: Observation) => o.source === "ai";

/** Changes whenever a Highlight joins/leaves the Theme or its note is edited. */
export const lensSig = (obs: Observation[]) =>
  obs
    .map((o) => `${o.id}:${o.note}`)
    .sort()
    .join("|");

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function feedbackText(f: ThemeFeedback) {
  const q = f.quote ? `"${clip(f.quote)}"` : "";
  switch (f.kind) {
    case "confirm-interpretation":
      return "Interpretazione confermata dal researcher";
    case "edit-interpretation":
      return `Interpretazione riscritta dal researcher: ${f.reason ?? ""}`;
    case "confirm-quote":
      return `La quote ${q} appartiene al Theme`;
    case "reject-quote":
      return `La quote ${q} NON appartiene al Theme${f.reason ? `. Motivo: ${f.reason}` : ""}`;
    case "reassign-quote":
      return `La quote ${q} appartiene invece a "${f.to}"${f.reason ? `. Motivo: ${f.reason}` : ""}`;
    default:
      return `Commento: ${f.reason ?? ""}`;
  }
}

/** Local draft used when the AI gateway is unavailable, so the page never shows an empty lens. */
export function offlineInterpretation(obs: Observation[]) {
  const notes = obs
    .map((o) => o.note.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((n) => n.charAt(0).toLowerCase() + n.slice(1));
  if (!notes.length)
    return "Nessuna nota disponibile: aggiungi note agli Highlights per descrivere il Theme.";
  const head = `Raccoglie momenti in cui ${notes[0]}`;
  return notes.length > 1 ? `${head}; ricorre anche che ${notes[1]}.` : `${head}.`;
}

/** Latest researcher verdict on a Highlight inside a Theme. */
export function quoteVerdict(feedback: ThemeFeedback[], theme: string, id: number) {
  const last = [...feedback].reverse().find((f) => f.theme === theme && f.highlightId === id);
  if (!last) return null;
  if (last.kind === "confirm-quote") return "confirmed" as const;
  if (last.kind === "reject-quote" || last.kind === "reassign-quote") return "rejected" as const;
  return null;
}

/** Keeps the Theme interpretation in sync with its Highlights; never overwrites the researcher's own text. */
export function useThemeLens(theme: string, obs: Observation[]) {
  const { themeLens, setThemeLens, themeFeedback } = useObservations();
  const lens = themeLens[theme];
  const sig = lensSig(obs);
  const [loading, setLoading] = useState(false);
  const inflight = useRef<string | null>(null);
  const feedback = themeFeedback.filter((f) => f.theme === theme).map(feedbackText);

  const generate = async () => {
    if (!obs.length || inflight.current === sig) return;
    inflight.current = sig;
    setLoading(true);
    try {
      const res = await interpretTheme({
        data: {
          theme,
          feedback,
          highlights: obs.map((o) => ({
            id: o.id,
            note: o.note,
            quote: o.quote,
            source: isAi(o) ? ("ai" as const) : ("human" as const),
          })),
        },
      });
      setThemeLens((l) => ({ ...l, [theme]: { ...res, sig, origin: "ai" } }));
    } catch {
      setThemeLens((l) => ({
        ...l,
        [theme]: {
          interpretation: offlineInterpretation(obs),
          coherentIds: obs.map((o) => o.id),
          sig,
          origin: "offline",
        },
      }));
    } finally {
      inflight.current = null;
      setLoading(false);
    }
  };

  const auto =
    theme !== UNCATEGORIZED &&
    obs.length > 0 &&
    (!lens || (lens.sig !== sig && lens.origin !== "researcher"));
  useEffect(() => {
    if (auto) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, sig]);

  return {
    lens,
    loading,
    /** The researcher wrote the interpretation, but the Theme's Highlights changed since. */
    stale: !!lens && lens.origin === "researcher" && lens.sig !== sig,
    regenerate: generate,
    sig,
  };
}
