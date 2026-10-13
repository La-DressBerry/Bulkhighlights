import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Pencil, PlayCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import interviewVideo from "@/assets/registrazione-schermo-ottimizzata.mp4.asset.json";
import {
  analysisProgress,
  useObservations,
  type Observation,
} from "@/lib/observations-store";

type Moment = { videoId: number; time: string; quote: string; context: string; text: string; contrast?: boolean; borderline?: boolean; cluster?: string };
const bl = (x: Moment): Moment => ({ ...x, borderline: true });
const cl = (cluster: string, x: Moment): Moment => ({ ...x, cluster });
const m = (videoId: number, time: string, quote: string, text: string, contrast = false): Moment => ({
  videoId, time, quote, text, contrast,
  context: `…${quote}…`,
});

/** Mock corpus for Theme-based search (exact phrases for traceability). `contrast` = different evidence. */
const CORPUS: Moment[] = [
  { ...m(1, "01:40", "nessuno mi sta dicendo che non ho compilato nulla", "Il tester non riceve feedback sui campi non compilati e resta incerto se procedere."), context: "…passo alla schermata successiva e nessuno mi sta dicendo che non ho compilato nulla, quindi non so se è giusto…" },
  { ...m(4, "01:30", "esita su un passaggio e descrive cosa si aspettava di trovare in quel punto", "Il tester esita perché l'elemento atteso non è dove se lo aspettava."), context: "…qui il partecipante prova a completare il task assegnato, esita su un passaggio e descrive cosa si aspettava di trovare in quel punto." },
  { ...m(2, "00:00", "esplora la schermata principale e commenta ad alta voce ciò che vede", "Il tester esplora la schermata principale senza un punto di partenza chiaro."), context: "In questa sessione il partecipante esplora la schermata principale e commenta ad alta voce ciò che vede." },
  bl(m(4, "03:00", "segnalando cosa gli è piaciuto e cosa gli ha creato confusione", "Il tester riassume l'esperienza: punti positivi misti a confusione.")),
  m(1, "00:20", "non capisco da dove devo partire", "Il tester non individua il primo passo del processo."),
  m(2, "00:45", "pensavo che questo bottone mi portasse avanti", "Il tester si aspetta che il bottone faccia avanzare il processo."),
  m(3, "00:30", "qui mi sono perso, torno indietro", "Il tester perde il filo del processo e torna indietro."),
  m(3, "01:10", "non so se ho salvato o no", "Il tester non ha conferma del salvataggio."),
  m(4, "00:50", "mi aspettavo un messaggio di conferma", "Manca un feedback di conferma dopo l'azione."),
  m(1, "02:30", "devo rifare tutto da capo?", "Il tester teme di dover ripetere l'intero processo."),
  m(2, "02:10", "questo passaggio non è chiaro", "Un passaggio del processo risulta poco chiaro."),
  m(3, "02:40", "ci ho messo un po' a trovare il campo giusto", "Il tester impiega tempo a trovare il campo corretto."),
  bl(m(4, "02:20", "non era ovvio che dovessi scorrere", "Il contenuto necessario è nascosto sotto la piega.")),
  m(2, "03:30", "ho cliccato due volte perché non succedeva niente", "Assenza di feedback immediato al click."),
  m(3, "03:20", "non capisco cosa succede dopo", "Il tester non prevede il passo successivo."),
  m(1, "03:10", "è stato semplice, ho fatto tutto senza pensarci", "Il tester completa il processo senza difficoltà.", true),
  m(4, "04:10", "questa parte invece è chiarissima", "Il tester trova questo passaggio molto chiaro.", true),
];

/** Mock corpus for searches started from new Human Highlights without a Theme. */
const P = "Privacy concerns";
const N = "Navigation uncertainty";
const SEMANTIC_CORPUS: Moment[] = [
  cl(P, m(2, "01:05", "non mi fido a inserire i dati della carta qui", "Il tester esita a inserire dati sensibili.")),
  cl(N, m(3, "00:40", "non trovo dove tornare alla pagina precedente", "Il tester non trova come tornare indietro.")),
  cl(P, m(3, "01:50", "chi vede queste informazioni?", "Il tester si chiede chi abbia accesso ai suoi dati.")),
  cl(N, m(1, "01:15", "il menu non mi dice dove sono", "Il menu non indica la posizione corrente.")),
  cl(P, m(4, "02:05", "mi sembra un sito poco sicuro", "Il tester percepisce il sito come poco sicuro.")),
  cl(P, m(1, "02:50", "vorrei sapere perché mi chiedono il numero di telefono", "Il tester non capisce perché venga richiesto il telefono.")),
  cl(N, m(4, "01:20", "ho aperto tre sezioni prima di trovarlo", "Il tester apre più sezioni prima di trovare il contenuto.")),
  cl(P, m(2, "02:40", "non c'è scritto niente sulla privacy", "Mancano informazioni sulla privacy.")),
  cl(P, bl(m(3, "03:40", "preferisco non dare la mia email", "Il tester evita di condividere l'email."))),
  cl(N, bl(m(2, "03:15", "forse era nel footer, non so", "Il tester ipotizza la posizione senza certezza."))),
  cl(P, bl(m(4, "03:30", "il lucchetto mi rassicura un po'", "Un segnale di sicurezza rassicura il tester."))),
  cl(N, m(3, "04:00", "le etichette del menu sono troppo simili", "Le voci di menu sono difficili da distinguere.")),
  cl(P, m(1, "04:20", "non so cosa ne faranno dei miei dati", "Il tester non sa come verranno usati i suoi dati.")),
  cl(P, m(2, "04:05", "qui chiedono troppe informazioni personali", "Il tester trova eccessive le informazioni richieste.")),
];

/** Representative mini-sample first: a clear match, one from another video, one borderline; then the rest. */
function representativeOrder<T extends Moment>(list: T[]): T[] {
  if (list.length <= 3) return list;
  const strong = list.find((x) => !x.borderline) ?? list[0];
  if (!strong) return list;
  const other = list.find((x) => x !== strong && !x.borderline && x.videoId !== strong.videoId);
  const border = list.find((x) => x.borderline && x !== strong);
  const head = [strong, other, border].filter((x): x is T => !!x);
  const rest = list.filter((x) => !head.includes(x));
  while (head.length < 3 && rest.length) {
    const next = rest.shift();
    if (next) head.push(next);
  }
  return [...head, ...rest];
}

const sig = (o: Observation) => JSON.stringify([o.themes, o.note, o.quote, o.severity, o.time, o.anchor]);
export type Batch = { key: string; label: string; ids: number[]; snapshot: Record<number, string>; invalidated?: boolean };
/** A batch is "edited" once any of its Highlights changed or was removed by the researcher. */
export function batchEdited(b: Batch, observations: Observation[]) {
  return !!b.invalidated || b.ids.some((id) => {
    const o = observations.find((x) => x.id === id);
    return !o || sig(o) !== b.snapshot[id];
  });
}

const NEEDS_REVIEW = "Needs review";
const SIMILAR_GROUP = "__similar__";
const isSimilar = (id: string) => id.startsWith(SIMILAR_GROUP);

type Decision = "accepted" | "rejected" | undefined;
type Suggestion = {
  key: string;
  videoId: number;
  time: string;
  quote: string;
  context: string;
  text: string;
  /** null = ambiguous evidence, AI does not guess. */
  theme: string | null;
  contrast?: boolean;
  borderline?: boolean;
  cluster?: string;
  severity?: string;
};
type Provenance = "reviewed" | "batch";

/** Deterministic prototype guardrail. Tweak the minimum or ambiguous labels here.
 * AI-assisted Highlights never count as reliable teaching evidence. */
export const AI_REVIEW_RULE = { minimumHumanExamples: 2, ambiguousThemeLabels: ["?", "unclear", "ambiguous"] };
export function needsSuggestionReview(themes: string[], evidence: Observation[]) {
  const human = evidence.filter((item) => (item.source ?? "human") === "human");
  if (!themes.length) return human.filter((item) => item.note.trim() && item.quote.trim()).length < AI_REVIEW_RULE.minimumHumanExamples;
  return themes.some((theme) =>
    AI_REVIEW_RULE.ambiguousThemeLabels.some((label) => theme.toLowerCase().includes(label)) ||
    human.filter((item) => item.themes.includes(theme) && item.note.trim() && item.quote.trim()).length < AI_REVIEW_RULE.minimumHumanExamples
  );
}

export function BulkAiLayer() {
  const {
    observations,
    setObservations,
    mediaList,
    aiCoverage,
    setAiCoverage,
    bulkAlertDismissed,
    setBulkAlertDismissed,
    bulkFlowOpen,
    setBulkFlowOpen,
    bulkFlowKind,
    openBulkFlow,
    aiSeedUsed,
    setAiSeedUsed,
    workspaceThemes,
    addTheme,
    renameTheme,
  } = useObservations();
  const progress = analysisProgress(observations);
  const initialRunDone = Object.keys(aiCoverage).length > 0;
  const pendingThemes = progress.themes.filter((t) => !aiCoverage[t]);
  const unthemedSeeds = newUnthemedSeeds(observations, aiSeedUsed, initialRunDone);
  const showAlert = progress.eligible && !initialRunDone && !bulkAlertDismissed && !bulkFlowOpen;
  const idRef = useRef(Date.now());
  const [flowSessionOpen, setFlowSessionOpen] = useState(false);

  useEffect(() => {
    if (bulkFlowOpen) setFlowSessionOpen(true);
  }, [bulkFlowOpen]);

  const [batches, setBatches] = useState<(Batch & { closed?: boolean })[]>([]);
  useEffect(() => {
    setBatches((previous) => {
      const changed = previous.some((b) => !b.invalidated && batchEdited(b, observations));
      return changed ? previous.map((b) => {
        if (!b.invalidated && batchEdited(b, observations)) b.invalidated = true;
        return b;
      }) : previous;
    });
  }, [observations]);
  const add = (items: Suggestion[], provenance: Provenance, label?: string) => {
    const created = items.map(
      (c): Observation => ({
        id: ++idRef.current,
        videoId: c.videoId,
        time: `${c.time} - ${c.time}`,
        themes: c.theme ? [c.theme] : [],
        note: c.text,
        quote: c.quote,
        anchor: c.quote,
        severity: c.severity ?? "",
        author: "AI-assisted",
        source: "ai",
      }),
    );
    setObservations((prev) => [...prev, ...created]);
    const batch: Batch = {
      key: `b-${created[0]?.id ?? Date.now()}`,
      label: label ?? "",
      ids: created.map((o) => o.id),
      snapshot: Object.fromEntries(created.map((o) => [o.id, sig(o)])),
    };
    if (label) setBatches((p) => [...p, batch]);
    return batch;
  };

  return (
    <>
      {showAlert && (
        <div
          role="status"
          className="animate-fade-in-up fixed right-12 top-4 z-40 w-[440px] overflow-hidden rounded-lg border border-blue-300 bg-blue-50 p-5 pt-6 shadow-xl shadow-blue-200/60"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-300 ring-4 ring-blue-100">
              <Sparkles className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="pr-6 text-base font-bold text-gray-900">Ready to speed up your analysis?</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                You’ve analyzed <strong className="font-semibold text-gray-900">{progress.analyzedVideos} videos</strong> and created <strong className="font-semibold text-gray-900">{progress.themes.length} Theme{progress.themes.length === 1 ? "" : "s"}</strong>. AI can use your Themes and Highlights to find suggested Highlights across the research.
              </p>
              <p className="mt-2 text-xs font-medium text-gray-500 italic">You decide what gets added.</p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  onClick={() => setBulkAlertDismissed(true)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-white/70 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Not now
                </button>
                <button
                  onClick={() => openBulkFlow("themes")}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-300 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                  Find similar Highlights
                </button>
              </div>
            </div>
            <button aria-label="Not now" onClick={() => setBulkAlertDismissed(true)} className="absolute right-4 top-4 rounded p-1 text-gray-500 hover:bg-white/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      {(bulkFlowOpen || flowSessionOpen) && (
        <BulkFlowModal
          active={bulkFlowOpen}
          kind={bulkFlowKind === "unthemed" ? "unthemed" : initialRunDone ? "theme" : "initial"}
          themes={initialRunDone ? (pendingThemes.length ? pendingThemes : progress.themes) : progress.themes}
          allThemes={workspaceThemes}
          onCreateTheme={addTheme}
          seeds={unthemedSeeds}
          observations={observations}
          mediaName={(id) => {
            const x = mediaList.find((v) => v.id === id);
            return x ? `${x.title} · ${x.participant}` : `Video ${id}`;
          }}
          onAdd={add}
          onUpdate={(id, patch) =>
            setObservations((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
          }
          onRenameTheme={(from, requested) =>
            {
              const to = renameTheme(from, requested);
              setAiCoverage((previous) => {
                if (previous[from] === undefined) return previous;
                const next = { ...previous, [to]: previous[from] };
                delete next[from];
                return next;
              });
              setBatches((previous) => previous.map((batch) => ({
                ...batch,
                label: batch.label === from ? to : batch.label,
              })));
              return to;
            }
          }
          onRemove={(b) => {
            // Safety: never revert a batch once a researcher edited any of its Highlights.
            if (batchEdited(b, observations)) return;
            setObservations((prev) => prev.filter((o) => !b.ids.includes(o.id)));
            setBatches((p) => p.filter((x) => x.key !== b.key));
          }}
          onClose={(finished, themes) => {
            if (finished) {
              if (bulkFlowKind === "unthemed") setAiSeedUsed((p) => [...p, ...unthemedSeeds.map((o) => o.id)]);
              else {
                const now = Date.now();
                setAiCoverage((p) => ({ ...p, ...Object.fromEntries(themes.map((t) => [t, now])) }));
              }
              setBulkAlertDismissed(true);
              setFlowSessionOpen(false);
            }
            setBulkFlowOpen(false);
          }}
        />
      )}
      {!bulkFlowOpen && batches.some((b) => !b.closed) && (
        <div className="fixed bottom-4 left-12 z-40 w-80 space-y-1.5">
          {batches.filter((b) => !b.closed).slice(-3).map((b) => {
            const edited = batchEdited(b, observations);
            return (
              <div key={b.key} className="animate-fade-in-up flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-800">{b.ids.length} added · {b.label}</p>
                  {edited && <p className="text-[11px] text-gray-500">Some Highlights were edited individually.</p>}
                </div>
                {!edited && (
                  <button
                    onClick={() => {
                      setObservations((prev) => prev.filter((o) => !b.ids.includes(o.id)));
                      setBatches((p) => p.filter((x) => x.key !== b.key));
                    }}
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Undo
                  </button>
                )}
                <button aria-label="Dismiss" onClick={() => setBatches((p) => p.map((x) => (x.key === b.key ? { ...x, closed: true } : x)))} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Human Highlights without a Theme created after the first AI run, not yet used as examples. */
function newUnthemedSeeds(observations: Observation[], used: number[], initialRunDone: boolean) {
  if (!initialRunDone) return [];
  return observations.filter(
    (o) => (o.source ?? "human") === "human" && o.themes.length === 0 && !used.includes(o.id),
  );
}

type Step = "pre" | "scanning-sample" | "sample" | "scanning-more" | "groups";
type Kind = "initial" | "theme" | "unthemed";
type GroupState = { batch: Batch; provenance: Provenance; count: number };

function BulkFlowModal({
  active,
  kind,
  themes,
  allThemes,
  seeds,
  observations,
  mediaName,
  onAdd,
  onRemove,
  onUpdate,
  onRenameTheme,
  onCreateTheme,
  onClose,
}: {
  active: boolean;
  kind: Kind;
  themes: string[];
  allThemes: string[];
  seeds: Observation[];
  observations: Observation[];
  mediaName: (id: number) => string;
  onAdd: (items: Suggestion[], provenance: Provenance, label?: string) => Batch;
  onRemove: (b: Batch) => void;
  onUpdate: (id: number, patch: Partial<Observation>) => void;
  onRenameTheme: (from: string, to: string) => string;
  onCreateTheme: (name: string) => string;
  onClose: (finished: boolean, themes: string[]) => void;
}) {
  // The entry CTA already says what happens: start with a short loading state, no confirm screen.
  const [requiresReview] = useState(() => needsSuggestionReview(themes, kind === "unthemed" ? seeds : observations));
  const [step, setStep] = useState<Step>(kind !== "unthemed" ? "pre" : requiresReview ? "scanning-sample" : "scanning-more");
  const [interpretations, setInterpretations] = useState<Record<string, string>>(() => Object.fromEntries(themes.map((t) => {
    const notes = observations.filter((o) => (o.source ?? "human") === "human" && o.themes.includes(t)).map((o) => o.note).filter(Boolean);
    return [t, notes.length ? `Momenti in cui ${notes[0]!.charAt(0).toLowerCase()}${notes[0]!.slice(1)}` : `Momenti della ricerca legati a “${t}”.`];
  })));
  const [items, setItems] = useState<Record<string, Suggestion>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [clipKey, setClipKey] = useState<string | null>(null);
  const [acceptedItems, setAcceptedItems] = useState<Record<string, Batch>>({});
  const actionLock = useRef(new Set<string>());
  const [added, setAdded] = useState<Record<string, GroupState>>({});
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [contrastOpen, setContrastOpen] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState<Record<string, number>>({});
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [effectiveThemes, setEffectiveThemes] = useState(themes);
  const [themeAdjusted, setThemeAdjusted] = useState(false);
  const [sampleOffset, setSampleOffset] = useState(0);
  const [searchThemes, setSearchThemes] = useState<string[] | null>(null);
  const totalRemainingRef = useRef(0);


  // Snapshot of the corpus at open so items added during the flow don't reshuffle results.
  const [pool] = useState(() => {
    const existing = new Set(observations.map((o) => `${o.videoId}|${o.quote.trim()}`));
    return (kind === "unthemed" ? SEMANTIC_CORPUS : CORPUS).filter((c) => !existing.has(`${c.videoId}|${c.quote}`));
  });
  const mainPool = useMemo(() => pool.filter((c) => !c.contrast), [pool]);
  const get = (s: Suggestion) => items[s.key] ?? s;

  /** First pass (initial run only): small mixed sample, plus one ambiguous. */
  const sample = useMemo<Suggestion[]>(() => {
    if (!requiresReview) return [];
    const size = Math.min(4, mainPool.length);
    return [...mainPool.slice(sampleOffset, sampleOffset + size), ...mainPool.slice(0, sampleOffset)]
      .slice(0, size)
      .map((c, i) => {
      const ambiguous = size >= 3 && i === size - 1 && themes.length < size;
      return { ...c, key: `s-${sampleOffset}-${i}`, theme: ambiguous ? null : effectiveThemes[i % effectiveThemes.length] ?? null };
    });
  }, [mainPool, effectiveThemes, requiresReview, sampleOffset, themes.length]);

  const calibratedThemes = useMemo(() => {
    const corrected = sample
      .filter((s) => decisions[s.key] !== "rejected")
      .map((s) => get(s).theme)
      .filter((theme): theme is string => Boolean(theme));
    return [...new Set([...effectiveThemes, ...corrected])];
    // `get` intentionally resolves the current temporary calibration edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample, decisions, items, effectiveThemes]);

  /** Full search: rest of corpus, skipping moments rejected in calibration. */
  const more = useMemo<Suggestion[]>(() => {
    const rejectedQuotes = new Set(sample.filter((s) => decisions[s.key] === "rejected").map((s) => s.quote));
    const activeLens = searchThemes ?? calibratedThemes;
    const sampleQuotes = new Set(sample.map((s) => s.quote));
    const rest = mainPool.filter((c) => !sampleQuotes.has(c.quote) && !rejectedQuotes.has(c.quote));
    if (kind === "unthemed") {
      // Heterogeneous seeds → separate provisional groups; one seed → one coherent group.
      const clusters = [...new Set(rest.map((c) => c.cluster))];
      const keep = seeds.length >= 2 ? clusters : clusters.slice(0, 1);
      return rest.filter((c) => keep.includes(c.cluster)).map((c, i) => ({ ...c, key: `m-${i}`, theme: null }));
    }
    // Bias toward the first Theme so one group is large; every 7th is ambiguous.
    const aligned = sample.filter((candidate) => decisions[candidate.key] !== "rejected").map((candidate, i) => ({ ...get(candidate), key: `aligned-${i}` }));
    return [...aligned, ...rest.map((c, i) => ({
      ...c,
      key: `m-${i}`,
      theme: i % 7 === 6 ? null : activeLens[i % 4 === 3 ? (i % activeLens.length) : 0] ?? null,
    }))];
    // decisions intentionally read once when the search runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainPool, sample, kind, calibratedThemes, searchThemes, step === "scanning-more"]);

  const contrasts = useMemo<Suggestion[]>(
    () => (kind === "unthemed" ? [] : pool.filter((c) => c.contrast).map((c, i) => ({ ...c, key: `c-${i}`, theme: calibratedThemes[0] ?? null }))),
    [pool, kind, calibratedThemes],
  );

  useEffect(() => {
    setItems((prev) => {
      const next = { ...prev };
      const available = step === "scanning-more" || step === "groups"
        ? [...sample, ...more, ...contrasts]
        : sample;
      available.forEach((s) => {
        if (!next[s.key]) next[s.key] = s;
      });
      return next;
    });
  }, [sample, more, contrasts, step]);

  useEffect(() => {
    if (!active) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    return () => { document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && active && onClose(step === "groups" && totalRemainingRef.current === 0, effectiveThemes);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose, step, effectiveThemes]);

  useEffect(() => {
    if (step !== "scanning-sample" && step !== "scanning-more") return;
    const t = window.setTimeout(() => setStep(step === "scanning-sample" ? "sample" : "groups"), 1600);
    return () => window.clearTimeout(t);
  }, [step]);

  /** Theme groups (Themes are the patterns). Grouping uses the AI's original proposal. */
  const groups = useMemo(() => {
    if (kind === "unthemed") {
      const clusters = [...new Set(more.map((c) => c.cluster ?? ""))];
      return clusters.map((c, i) => ({
        id: `${SIMILAR_GROUP}${i}`,
        hint: c,
        items: representativeOrder(more.filter((x) => (x.cluster ?? "") === c)),
      }));
    }
    const map = new Map<string, Suggestion[]>();
    more.forEach((s) => {
      const id = s.theme ?? NEEDS_REVIEW;
      map.set(id, [...(map.get(id) ?? []), s]);
    });
    return [...map.entries()]
      .map(([id, list]) => ({ id, hint: "", items: representativeOrder(list) }))
      .sort((a, b) => (a.id === NEEDS_REVIEW ? 1 : b.id === NEEDS_REVIEW ? -1 : b.items.length - a.items.length));
  }, [more, kind]);

  const groupTheme = (id: string) => (isSimilar(id) || id === NEEDS_REVIEW ? assigned[id] ?? null : id);
  const withTheme = (id: string, s: Suggestion) => {
    return get(s);
  };

  const decide = (key: string, decision: Decision) => {
    setDecisions((previous) => {
      if (decision) return { ...previous, [key]: decision };
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };
  const remainingItems = (list: Suggestion[]) => list.filter((s) => decisions[s.key] !== "rejected" && !acceptedItems[s.key]);
  const invalidateBatch = (key: string) => {
    const item = acceptedItems[key];
    if (!item) return;
    Object.values(added).forEach((g) => {
      if (g.batch.ids.some((id) => item.ids.includes(id))) g.batch.invalidated = true;
    });
  };
  const changeResult = (candidate: Suggestion, patch: Partial<Suggestion>) => {
    const s = get(candidate);
    setItems((p) => ({ ...p, [s.key]: { ...s, ...patch } }));
    const accepted = acceptedItems[s.key];
    if (accepted) {
      invalidateBatch(s.key);
      accepted.ids.forEach((id) => onUpdate(id, {
        ...(patch.text !== undefined ? { note: patch.text } : {}),
        ...(patch.theme !== undefined ? { themes: patch.theme ? [patch.theme] : [] } : {}),
        ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
        author: "AI-assisted",
      }));
    }
  };
  const decideResult = (groupId: string, candidate: Suggestion, decision: Decision) => {
    const key = candidate.key;
    if (actionLock.current.has(key)) return;
    actionLock.current.add(key);
    const previous = acceptedItems[key];
    if (decision === "accepted" && !previous) {
      const batch = onAdd([withTheme(groupId, candidate)], "reviewed");
      setAcceptedItems((p) => ({ ...p, [key]: batch }));
    } else if (decision !== "accepted" && previous) {
      invalidateBatch(key);
      previous.ids.forEach((id) => {
        const o = observations.find((x) => x.id === id);
        if (o) onRemove({ key: `one-${id}`, label: "", ids: [id], snapshot: { [id]: sig(o) } });
      });
      setAcceptedItems((p) => { const next = { ...p }; delete next[key]; return next; });
    }
    decide(key, decision);
    queueMicrotask(() => actionLock.current.delete(key));
  };
  const addGroup = (id: string, list: Suggestion[]) => {
    if (actionLock.current.has(id)) return;
    const remaining = remainingItems(list);
    if (!remaining.length) return;
    actionLock.current.add(id);
    const batch = onAdd(remaining.map((s) => withTheme(id, s)), "batch", groupLabel(id));
    setAdded((p) => ({ ...p, [id]: { batch, provenance: "batch", count: remaining.length } }));
    setAcceptedItems((p) => {
      const next = { ...p };
      remaining.forEach((s, i) => {
        const itemId = batch.ids[i];
        if (itemId === undefined) return;
        const snapshot = batch.snapshot[itemId];
        if (snapshot === undefined) return;
        next[s.key] = { key: `one-${itemId}`, label: "", ids: [itemId], snapshot: { [itemId]: snapshot } };
      });
      return next;
    });
    setDecisions((p) => ({ ...p, ...Object.fromEntries(remaining.map((s) => [s.key, "accepted" as const])) }));
    queueMicrotask(() => actionLock.current.delete(id));
  };
  const acceptAllRemaining = () => {
    groups.forEach((group) => addGroup(group.id, group.items));
  };
  const undoGroup = (id: string) => {
    const g = added[id];
    if (!g || batchEdited(g.batch, observations)) return;
    onRemove(g.batch);
    const keys = Object.keys(acceptedItems).filter((key) => acceptedItems[key]?.ids.some((itemId) => g.batch.ids.includes(itemId)));
    setAcceptedItems((p) => { const next = { ...p }; keys.forEach((k) => delete next[k]); return next; });
    setDecisions((p) => { const next = { ...p }; keys.forEach((k) => delete next[k]); return next; });
    setAdded((p) => { const next = { ...p }; delete next[id]; return next; });
  };

  const calibrationChanged = themeAdjusted || sample.some((s) => decisions[s.key] || (get(s).text !== s.text || get(s).theme !== s.theme));
  const allSamplesRejected = sample.length > 0 && sample.every((s) => decisions[s.key] === "rejected");
  const navigate = useNavigate();
  const autoFinished = useRef(false);
  useEffect(() => {
    // After the corpus search, add AI-found Highlights and land on Themes & insights.
    if (step !== "groups" || autoFinished.current) return;
    autoFinished.current = true;
    acceptAllRemaining();
    onClose(true, effectiveThemes);
    navigate({ to: "/themes-insights" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const findMore = () => {
    if (allSamplesRejected) return;
    // Calibration examples only tune the search lens; they never create workspace Highlights.
    setSearchThemes(calibratedThemes);
    setStep("scanning-more");
  };

  /** Persists globally (workspace + Highlights) and keeps every modal reference in sync. */
  const renameEverywhere = (previous: string, requested: string) => {
    const next = onRenameTheme(previous, requested);
    if (next === previous) return next;
    setThemeAdjusted(true);
    setEffectiveThemes((current) => [...new Set(current.map((theme) => theme === previous ? next : theme))]);
    setSearchThemes((current) => current && [...new Set(current.map((theme) => theme === previous ? next : theme))]);
    setAssigned((current) => Object.fromEntries(Object.entries(current).map(([k, t]) => [k, t === previous ? next : t])));
    setItems((current) => Object.fromEntries(Object.entries(current).map(([key, item]) => [
      key,
      item.theme === previous ? { ...item, theme: next } : item,
    ])));
    return next;
  };
  const themeActions = { onCreate: onCreateTheme, onRename: renameEverywhere };
  const previewFor = (candidate: Suggestion) => clipKey === candidate.key ? (
    <ClipPreview
      s={get(candidate)}
      mediaName={mediaName}
      decision={decisions[candidate.key]}
      reviewable={false}
      onClose={() => setClipKey(null)}
      onDecide={(d) => decide(candidate.key, d)}
    />
  ) : null;

  const card = (s: Suggestion) => (
    <ResultCard
      temporary
      key={s.key}
      s={get(s)}
      decision={decisions[s.key]}
      themes={allThemes}
      themeActions={themeActions}
      mediaName={mediaName}
      onChange={(patch) => setItems((p) => ({ ...p, [s.key]: { ...get(s), ...patch } }))}
      onDecide={(d) => decide(s.key, d)}
      watching={clipKey === s.key}
      preview={previewFor(s)}
      onWatch={() => setClipKey((k) => (k === s.key ? null : s.key))}
    />
  );

  const example = (candidate: Suggestion) => {
    const s = get(candidate);
    return (
    <li key={s.key} className={`rounded-md border bg-background p-3 ${clipKey === s.key ? "ai-context-row ring-1 ring-research-action" : "border-border"}`}>
      <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{mediaName(s.videoId)} · {s.time}</p>
      <p className="mt-1 rounded bg-muted px-2 py-1 text-xs text-foreground">“{s.quote}”</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-medium">Suggested Highlight:</span> {s.text}</p>
      <Button variant="link" size="sm" onClick={() => setClipKey((k) => (k === s.key ? null : s.key))} className="mt-1 px-0 text-xs text-research-action">
        <PlayCircle className="h-3.5 w-3.5" /> {clipKey === s.key ? "Watching" : "Watch clip"}
      </Button>
      </div>
      {previewFor(s)}
    </li>
    );
  };

  const groupLabel = (id: string) => {
    if (!isSimilar(id)) return id;
    const i = Number(id.slice(SIMILAR_GROUP.length)) || 0;
    const hint = groups.find((g) => g.id === id)?.hint;
    return `Provisional group ${String.fromCharCode(65 + i)}${hint ? ` · ${hint}` : ""}`;
  };
  const totalAdded = Object.values(acceptedItems).reduce((n, b) => n + b.ids.filter((id) => observations.some((o) => o.id === id)).length, 0);
  const totalRemaining = groups.reduce((total, group) => total + remainingItems(group.items).length, 0);
  totalRemainingRef.current = totalRemaining;
  const reviewComplete = step === "groups" && totalRemaining === 0;
  const navigation = step === "sample"
    ? [...new Set(sample.map((candidate) => get(candidate).theme ?? NEEDS_REVIEW))].map((id) => ({ id, label: id }))
    : groups.map((group) => ({ id: group.id, label: groupLabel(group.id) }));
  const activeGroup = navigation.some((group) => group.id === selectedGroup) ? selectedGroup : navigation[0]?.id;
  const visibleSamples = sample.filter((candidate) => (get(candidate).theme ?? NEEDS_REVIEW) === activeGroup);
  useEffect(() => {
    if (step !== "sample" && step !== "groups") return;
    const first = step === "sample" ? visibleSamples[0] : groups.find((group) => group.id === activeGroup)?.items[0];
    setClipKey(first?.key ?? null);
    // Open the first contextual clip when navigating, without reopening a manually closed preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeGroup]);

  const scanning = step === "scanning-sample" || step === "scanning-more";
  const close = () => onClose(reviewComplete, effectiveThemes);

  return (
    <div className={`${active ? "flex" : "hidden"} ai-review-overlay fixed inset-0 z-50 items-center justify-center p-4 sm:p-8`} onMouseDown={close}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="ai-review-title" tabIndex={-1}
        className="ai-review-modal flex w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select, input, textarea, video[controls], [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
          const first = controls[0]; const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modalRef.current)) { event.preventDefault(); first?.focus(); }
        }}>
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-research-action/10 text-research-action"><Sparkles className="size-5" /></span>
            <div className="min-w-0">
              <h2 id="ai-review-title" className="text-lg font-semibold">{step === "pre" ? "Pre-analisi dei Temi" : step === "sample" ? "Review suggested Highlights" : step === "groups" ? "AI-found Highlights" : "Find similar Highlights"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{step === "sample" ? "Check a few examples before AI searches the rest of your research." : step === "groups" ? `${totalRemaining} suggested Highlights remaining · ${totalAdded} added` : "Your research guides the search"}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={close} className="shrink-0 text-muted-foreground"><X /></Button>
        </header>

        {step === "pre" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-4 text-sm text-muted-foreground">Controlla come l’AI interpreta ogni Tema. Puoi modificare l’interpretazione prima di avviare la ricerca.</p>
            <ul className="space-y-4">{effectiveThemes.map((t) => {
              const examples = observations.filter((o) => (o.source ?? "human") === "human" && o.themes.includes(t)).slice(0, 3);
              return <li key={t} className="rounded-lg border border-border p-4">
                <span className="inline-flex rounded-full bg-research-action/10 px-2.5 py-1 text-xs font-semibold text-research-action">{t}</span>
                <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor={`interp-${t}`}>Interpretazione del tema</label>
                <textarea id={`interp-${t}`} rows={2} value={interpretations[t] ?? ""} onChange={(e) => setInterpretations((p) => ({ ...p, [t]: e.target.value }))} className="mt-1 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <p className="mt-3 text-xs font-semibold text-muted-foreground">Esempi correlati</p>
                {examples.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">Nessun esempio.</p> : <ul className="mt-1 space-y-2">{examples.map((o) => <li key={o.id} className="rounded-md bg-muted p-2 text-xs"><span className="text-muted-foreground">{mediaName(o.videoId)} · {o.time}</span><p className="mt-1 italic">“{o.quote}”</p></li>)}</ul>}
              </li>;
            })}</ul>
          </div>
        ) : scanning ? (
          <div role="status" aria-live="polite" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-8 py-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-lg bg-research-action/10 text-research-action"><Loader2 className="size-7 animate-spin" /></span>
            <h3 className="text-lg font-semibold">{step === "scanning-sample" ? "Preparing a few suggestions" : "AI is searching for Highlights in your videos"}</h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{step === "scanning-sample" ? "Using your Highlights and Themes to find a few suggested Highlights…" : kind === "initial" ? "Using your Highlights, Themes, and feedback to scan the remaining videos…" : kind === "unthemed" ? "Using your new Human Highlights to find suggested Highlights across the research…" : "Using your Highlights and new Themes to find suggested Highlights across the research…"}</p>
          </div>
        ) : (
          <div className="ai-review-body flex min-h-0 flex-1 overflow-hidden">
            <nav aria-label="Themes" className="ai-review-navigation shrink-0 overflow-y-auto border-r border-border bg-muted p-3">
              <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">Themes</p>
              {navigation.map((group) => <Button key={group.id} variant="ghost" aria-pressed={group.id === activeGroup} onClick={() => setSelectedGroup(group.id)} className={`mb-1 h-auto w-full justify-start whitespace-normal px-3 py-2 text-left text-xs ${group.id === activeGroup ? "bg-background text-research-action" : "text-muted-foreground"}`}>{group.label}</Button>)}
            </nav>
            <main className="ai-review-detail min-w-0 flex-1 overflow-y-auto p-4">
              {step === "sample" && <ul className="space-y-3">{visibleSamples.map(card)}</ul>}
              {step === "sample" && allSamplesRejected && (
                <div role="status" className="mt-5 border-t border-border pt-5">
                  <p className="text-sm font-semibold">AI’s understanding seems off.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Every example was rejected. Refine a Theme or try other examples before continuing.</p>
                  <div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={() => { setSampleOffset((value) => (value + Math.min(4, mainPool.length)) % Math.max(1, mainPool.length)); setDecisions({}); setItems({}); setStep("scanning-sample"); }}>Try again</Button><Button variant="ghost" size="sm" onClick={() => setDecisions({})}>Go back</Button></div>
                </div>
              )}
              {step === "groups" && groups.filter((group) => group.id === activeGroup).map((g) => {
                const done = added[g.id];
                const edited = done ? batchEdited(done.batch, observations) : false;
                const groupContrasts = g.id === groups[0]?.id ? contrasts : [];
                const visible = shown[g.id] ?? 3;
                return <section key={g.id} className="mb-5">
                  <h3 className="mb-2 text-sm font-semibold">{groupLabel(g.id)}</h3>
                  {isSimilar(g.id) && <p className="mb-2 text-xs text-muted-foreground">Provisional · not a Theme until assigned</p>}

                  {done && <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><span role="status" className="flex items-center gap-2 text-sm"><Check className="size-4 text-research-action" />Highlights added</span><Button variant="ghost" size="sm" disabled={edited} onClick={() => undoGroup(g.id)} title={edited ? "Undo unavailable after a Highlight was edited, reassigned or removed." : "Undo batch acceptance"}>Undo batch</Button>{edited && <p className="w-full text-xs text-muted-foreground">Undo unavailable: a Highlight was edited, reassigned or removed.</p>}</div>}
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Representative examples</p>
                  <ul className="space-y-3">{g.items.slice(0, visible).map((candidate) => {
                    const batch = acceptedItems[candidate.key];
                    const saved = batch ? observations.find((item) => batch.ids.includes(item.id)) : undefined;
                    const current = withTheme(g.id, candidate);
                    const suggestion = saved ? { ...current, text: saved.note, theme: saved.themes[0] ?? null, severity: saved.severity } : current;
                    return <ResultCard key={suggestion.key} s={suggestion} preview={previewFor(suggestion)} decision={decisions[suggestion.key]} themes={allThemes} themeActions={themeActions} mediaName={mediaName} watching={clipKey === suggestion.key} onWatch={() => setClipKey((key) => key === suggestion.key ? null : suggestion.key)} onChange={(patch) => changeResult(candidate, patch)} onDecide={(decision) => decideResult(g.id, candidate, decision)} />;
                  })}</ul>
                  {g.items.length > visible && <Button variant="link" size="sm" onClick={() => setShown((previous) => ({ ...previous, [g.id]: visible + 3 }))} className="mt-4 px-0 text-research-action">Show {Math.min(3, g.items.length - visible)} more</Button>}
                  {groupContrasts.length > 0 && <div className="mt-3 border-t border-border pt-4"><Button variant="ghost" size="sm" aria-expanded={Boolean(contrastOpen[g.id])} onClick={() => setContrastOpen((previous) => ({ ...previous, [g.id]: !previous[g.id] }))} className="px-0 text-muted-foreground">{groupContrasts.length} contrasting evidence clips<ChevronDown className={contrastOpen[g.id] ? "rotate-180" : ""} /></Button>{contrastOpen[g.id] && <><p className="mt-2 text-xs text-muted-foreground">For information only — not added to this Theme.</p><ul className="mt-4 space-y-3">{groupContrasts.map(example)}</ul></>}</div>}
                </section>;
              })}
            </main>
          </div>
        )}
        {step === "pre" && <footer className="flex shrink-0 justify-end gap-3 border-t border-border bg-background px-4 py-3"><Button variant="ghost" onClick={close}>Annulla</Button><Button onClick={() => { setSearchThemes(effectiveThemes); setStep("scanning-more"); }} className="ai-review-primary h-9 px-4 text-sm font-semibold">Avvia</Button></footer>}
        {!scanning && step !== "pre" && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{step === "sample" ? calibrationChanged ? "Your changes will guide the full analysis." : `${sample.length} temporary examples · no Highlights added` : `${totalAdded} AI-assisted Highlights added · ${totalRemaining} remaining`}</p>
          <Button disabled={step === "sample" && allSamplesRejected} onClick={step === "sample" ? findMore : totalRemaining > 0 ? acceptAllRemaining : () => onClose(true, effectiveThemes)} className="ai-review-primary h-9 whitespace-normal px-4 text-sm font-semibold">
            {step === "sample" ? "Find more Highlights" : totalRemaining > 0 ? `Accept all remaining ${totalRemaining}` : "Done"}
          </Button>
        </footer>}
      </div>
    </div>
  );
}

/** Direct curation stays in the Theme group; acceptance immediately adds one Highlight. */
type ThemeActions = { onCreate: (name: string) => string; onRename: (from: string, to: string) => string };

const SUGGESTION_SEVERITIES = ["Major issue", "Minor issue", "Positive", "Wish", "Bug"];
function ResultCard({ s, decision, themes, themeActions, mediaName, watching, onWatch, onChange, onDecide, preview, temporary = false }: {
  s: Suggestion; decision: Decision; themes: string[]; themeActions: ThemeActions; mediaName: (id: number) => string;
  watching: boolean; onWatch: () => void; onChange: (p: Partial<Suggestion>) => void; onDecide: (d: Decision) => void; temporary?: boolean;
  preview?: import("react").ReactNode;
}) {
  const rejected = decision === "rejected";
  const severityClass = ["Major issue", "Minor issue", "Positive", "Wish", "Bug"].indexOf(s.severity ?? "");
  return <li className={`ai-evidence-card ai-severity-${severityClass} ${watching ? "ai-context-row ring-1 ring-research-action" : ""} ${rejected ? "opacity-60" : ""}`}>
    <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Theme</span>
      <ThemePicker value={s.theme ?? ""} themes={themes} onChange={(theme) => onChange({ theme: theme || null })} onCreate={themeActions.onCreate} onRename={themeActions.onRename} />
    </div>
    <label className="mt-2 block text-xs font-medium text-muted-foreground">Note
      <textarea aria-label={`Note at ${s.time}`} value={s.text} disabled={rejected} onChange={(event) => onChange({ text: event.target.value })} rows={2} className="mt-1 block w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
    <p className="mt-2 text-xs font-medium text-muted-foreground">Quote</p>
    <p className="ai-evidence-quote mt-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground">“{s.quote}”</p>
    <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">Severity
      <select aria-label={`Severity at ${s.time}`} value={s.severity ?? ""} disabled={rejected} onChange={(event) => onChange({ severity: event.target.value })} className="rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">None</option>{SUGGESTION_SEVERITIES.map((value) => <option key={value}>{value}</option>)}
      </select>
    </label>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
      <span className="text-xs text-muted-foreground">{mediaName(s.videoId)} · {s.time}</span>
      <Button variant="link" size="sm" onClick={onWatch} className="h-8 px-1 text-xs text-research-action"><PlayCircle />{watching ? "Watching" : "Watch clip"}</Button>
    </div>
    <div className="flex flex-wrap items-center justify-end gap-1">
      {decision ? <><span role="status" className="mr-auto text-xs text-muted-foreground">{rejected ? "Rejected" : temporary ? "Example looks right · not saved" : "AI-assisted · Federica"}</span><Button variant="ghost" size="sm" onClick={() => onDecide(undefined)}>Undo</Button></> : <>
        <Button variant="ghost" size="sm" onClick={() => onDecide("rejected")}>Reject</Button>
        <Button variant="outline" size="sm" onClick={() => onDecide("accepted")} className="text-research-action"><Check />Accept</Button>
      </>}
    </div>
    </div>
    {preview}
  </li>;
}

/** Existing Theme, a new one, or a rename — all persisted to the workspace; never invented by AI. */
function ThemePicker({ value, themes, onChange, onCreate, onRename }: {
  value: string; themes: string[]; onChange: (t: string) => void;
  onCreate?: (name: string) => string; onRename?: (from: string, to: string) => string;
}) {
  const [mode, setMode] = useState<"pick" | "create" | "rename">("pick");
  const [draft, setDraft] = useState("");
  if (mode !== "pick")
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = draft.trim();
          if (clean) {
            if (mode === "create") onChange(onCreate ? onCreate(clean) : clean);
            else if (value && onRename) onChange(onRename(value, clean));
          }
          setMode("pick");
        }}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setMode("pick"); } }}
      >
        <input autoFocus aria-label={mode === "create" ? "New Theme name" : "Rename Theme"} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === "create" ? "New Theme name" : "Theme name"} className="w-36 rounded border border-border px-2 py-0.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <Button type="submit" variant="ghost" size="sm" className="text-research-action">{mode === "create" ? "Create" : "Rename"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setMode("pick")}>Cancel</Button>
      </form>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <select
        aria-label="Assign Theme"
        value={value}
        onChange={(e) => (e.target.value === "__new__" ? (setDraft(""), setMode("create")) : onChange(e.target.value))}
        className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Needs review · no Theme</option>
        {[...new Set([...themes, ...(value ? [value] : [])])].map((t) => <option key={t} value={t}>{t}</option>)}
        <option value="__new__">+ Create Theme</option>
      </select>
      {value && onRename && (
        <button type="button" aria-label={`Rename Theme ${value}`} onClick={() => { setDraft(value); setMode("rename"); }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function toSec(t: string) {
  const [m, s] = t.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}
function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Single shared clip player: starts a few seconds before the quote, pauses at segment end. */
function ClipPreview({
  s,
  mediaName,
  decision,
  reviewable = true,
  onClose,
  onDecide,
}: {
  s: Suggestion;
  mediaName: (id: number) => string;
  decision: Decision;
  reviewable?: boolean;
  onClose: () => void;
  onDecide: (d: Decision) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const at = toSec(s.time);
  const start = Math.max(0, at - 3);
  const end = at + 20;
  const [now, setNow] = useState(start);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const seek = () => {
      v.currentTime = start;
      setNow(start);
      v.play().catch(() => {});
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [s.key, start]);

  return (
    <div className="ai-clip-preview mb-3 border-b border-border pb-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">
          {mediaName(s.videoId)} · <span className="text-research-action">{fmt(now)}</span>
          <span className="text-muted-foreground"> (clip {fmt(start)}–{fmt(end)})</span>
        </p>
        <button aria-label="Close clip" onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <video
        ref={ref}
        key={s.videoId}
        src={interviewVideo.url}
        controls
        playsInline
        className="mt-3 aspect-video max-h-72 w-full rounded-md bg-foreground object-contain"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setNow(v.currentTime);
          if (v.currentTime >= end && !v.paused) v.pause();
        }}
      />
      <p className="mt-2 rounded bg-background px-2 py-1 text-xs text-foreground">
        <span className="mr-1 text-[10px] font-medium text-muted-foreground">{s.time}</span>“{s.quote}”
      </p>
      <p className="mt-1 text-[11px] italic leading-relaxed text-muted-foreground">{s.context}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {s.text} · <span className="font-medium">{s.theme ?? NEEDS_REVIEW}</span>
        </span>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => {
              if (ref.current) { ref.current.currentTime = start; ref.current.play().catch(() => {}); }
            }}
            className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
          >
            Replay
          </button>
           {!reviewable ? null : decision ? (
             <>
               <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${decision === "accepted" ? "bg-research-action/10 text-research-action" : "bg-muted text-foreground"}`}>
                 {decision === "accepted" ? "Accepted" : "Rejected"}
               </span>
               <button onClick={() => onDecide(undefined)} className="rounded px-2 py-1 text-[11px] font-medium text-research-action hover:bg-research-action/10">Undo</button>
             </>
           ) : (
             <>
               <button onClick={() => onDecide("rejected")} className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted">Reject</button>
               <button
                 disabled={!s.theme}
                 onClick={() => onDecide("accepted")}
                 className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-research-action hover:bg-emerald-50 disabled:text-gray-300"
               >
                 <Check className="h-3 w-3" /> Accept
               </button>
             </>
           )}
        </div>
      </div>
    </div>
  );
}


/** Shared initial page action; Themes also retains incremental entries and progress. */
export function BulkAiEntry({ initialOnly = false }: { initialOnly?: boolean }) {
  const { observations, aiCoverage, aiSeedUsed, openBulkFlow, resetDemo } = useObservations();
  const p = analysisProgress(observations);
  const pending = p.themes.filter((t) => !aiCoverage[t]);
  const initialRunDone = Object.keys(aiCoverage).length > 0;
  const seeds = newUnthemedSeeds(observations, aiSeedUsed, initialRunDone);
  const btn = "flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50";
  if (initialOnly && (!p.eligible || initialRunDone)) return null;
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground ${initialOnly ? "w-full" : ""}`}>
      {!p.eligible ? (
        <span>
          Manual analysis: {Math.min(p.analyzedVideos, 3)}/3 videos · {p.themes.length} Theme{p.themes.length === 1 ? "" : "s"}
        </span>
      ) : (
        <>
          {!initialRunDone && (
            <Button
              variant="outline"
              onClick={() => openBulkFlow("themes")}
              aria-label="Find similar Highlights"
              aria-describedby="bulk-ai-entry-description"
              className={`h-auto max-w-full justify-start gap-3 whitespace-normal border-research-action/30 bg-research-action/5 px-4 py-3 text-left shadow-none hover:bg-research-action/10 focus-visible:ring-2 focus-visible:ring-research-action focus-visible:ring-offset-2 focus-visible:ring-offset-background ${initialOnly ? "w-full" : ""}`}
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-research-action/10 text-research-action">
                <Sparkles className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Find similar Highlights</span>
                <span id="bulk-ai-entry-description" className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                  Use your existing Highlights and Themes to scan the remaining research.
                </span>
              </span>
            </Button>
          )}
          {!initialOnly && initialRunDone && pending.length > 0 && (
            <button onClick={() => openBulkFlow("themes")} className={btn}>
              <Sparkles className="h-3.5 w-3.5 text-blue-700" />
              {`Find similar Highlights · ${pending.length === 1 ? pending[0] : `${pending.length} new Themes`}`}
            </button>
          )}
          {!initialOnly && seeds.length > 0 && (
            <button
              onClick={() => openBulkFlow("unthemed")}
              title="AI can use these new Highlights to look for similar evidence across the rest of the research."
              className={btn}
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-700" />
              Find similar Highlights · {seeds.length} unthemed Human Highlight{seeds.length === 1 ? "" : "s"}
            </button>
          )}
        </>
      )}
      {!initialOnly && <button onClick={resetDemo} className="underline-offset-2 hover:underline">Reset demo</button>}
    </div>
  );
}
