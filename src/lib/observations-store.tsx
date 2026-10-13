import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type Media = {
  id: number;
  title: string;
  participant: string;
  duration: string;
  date: string;
};

export type Observation = {
  id: number;
  videoId: number;
  /** transcript timestamp range, e.g. "00:00 - 01:45" */
  time: string;
  themes: string[];
  note: string;
  quote: string;
  severity: string;
  severityClass?: string;
  author: string;
  anchor?: string;
  /** "human" = created by the researcher; "ai" = accepted AI suggestion. Missing = human. */
  source?: "human" | "ai";
};

export const MEDIA_LIST: Media[] = [
  { id: 1, title: "TN12.mp4", participant: "Matteo", duration: "05:37", date: "Jun 09, 26" },
  { id: 2, title: "TN13.mp4", participant: "Giulia", duration: "07:12", date: "Jun 09, 26" },
  { id: 3, title: "TN14.mp4", participant: "Giulia", duration: "04:48", date: "Jun 10, 26" },
  { id: 4, title: "TN15.mp4", participant: "Giulia", duration: "06:05", date: "Jun 11, 26" },
];

/** Demo seed: 2 of 3 videos already manually analyzed, 1 Theme already in use. */
export const INITIAL_OBSERVATIONS: Observation[] = [
  {
    id: 9001, videoId: 2, time: "01:30 - 01:30", themes: ["Processo interno"],
    note: "Il tester esita su un passaggio del task: si aspettava un elemento diverso.",
    quote: "esita su un passaggio e descrive cosa si aspettava di trovare in quel punto",
    anchor: "esita su un passaggio e descrive cosa si aspettava di trovare in quel punto",
    severity: "Minor issue", severityClass: "", author: "Federica", source: "human",
  },
  {
    id: 9002, videoId: 3, time: "03:00 - 03:00", themes: ["Processo interno"],
    note: "Il tester segnala confusione nel riepilogo finale dell'esperienza.",
    quote: "segnalando cosa gli è piaciuto e cosa gli ha creato confusione",
    anchor: "segnalando cosa gli è piaciuto e cosa gli ha creato confusione",
    severity: "Major issue", severityClass: "", author: "Federica", source: "human",
  },
];

export const ANALYSIS_TARGET = 3;

export function analysisProgress(obs: Observation[]) {
  const human = obs.filter((o) => (o.source ?? "human") === "human");
  const videos = new Set(human.map((o) => o.videoId));
  const themes = new Set(human.flatMap((o) => o.themes));
  return {
    analyzedVideos: videos.size,
    analyzedVideoIds: [...videos],
    themes: [...themes],
    eligible: videos.size >= ANALYSIS_TARGET && themes.size >= 1,
  };
}

/** AI reading of a Theme ("lens"), generated from its Highlights' notes. */
export type ThemeLens = {
  interpretation: string;
  /** Signature of the Highlights the interpretation was generated from. */
  sig: string;
  /** Highlight ids the AI considers most coherent with the Theme. */
  coherentIds: number[];
  /** "ai" = generated, "offline" = local draft without AI, "researcher" = written or confirmed by the researcher. */
  origin: "ai" | "offline" | "researcher";
  confirmed?: boolean;
};

/** Researcher feedback collected in the Theme chat; it guides the next AI pass on the corpus. */
export type ThemeFeedback = {
  id: number;
  theme: string;
  kind: "confirm-interpretation" | "edit-interpretation" | "confirm-quote" | "reject-quote" | "reassign-quote" | "note";
  highlightId?: number | undefined;
  quote?: string | undefined;
  to?: string | undefined;
  reason?: string | undefined;
  at: number;
};

export type ChatMessage = { role: "user" | "assistant"; text: string; proposal?: string | undefined };

export type Insight = {
  id: number;
  title: string;
  subtitle: string;
  highlightIds: number[];
};

type Ctx = {
  mediaList: Media[];
  observations: Observation[];
  setObservations: Dispatch<SetStateAction<Observation[]>>;
  insights: Insight[];
  setInsights: Dispatch<SetStateAction<Insight[]>>;
  /** Per-Theme AI coverage: theme -> timestamp of the last bulk run that covered it. */
  aiCoverage: Record<string, number>;
  setAiCoverage: Dispatch<SetStateAction<Record<string, number>>>;
  bulkAlertDismissed: boolean;
  setBulkAlertDismissed: (v: boolean) => void;
  bulkFlowOpen: boolean;
  setBulkFlowOpen: (v: boolean) => void;
  /** Which search the bulk flow runs: Theme-based, or from new unthemed Human Highlights. */
  bulkFlowKind: "themes" | "unthemed";
  openBulkFlow: (kind: "themes" | "unthemed") => void;
  /** Human Highlight ids already used as examples for an unthemed similarity search. */
  aiSeedUsed: number[];
  setAiSeedUsed: Dispatch<SetStateAction<number[]>>;
  resetDemo: () => void;
  /** Workspace Theme registry: Themes created by the researcher even before any Highlight uses them. */
  workspaceThemes: string[];
  /** Adds a Theme (deduplicated case-insensitively) and returns the canonical label. */
  addTheme: (name: string) => string;
  /** Renames a Theme everywhere; merges into an existing label when it already exists. Returns the final label. */
  renameTheme: (from: string, to: string) => string;
  themeLens: Record<string, ThemeLens>;
  setThemeLens: Dispatch<SetStateAction<Record<string, ThemeLens>>>;
  themeFeedback: ThemeFeedback[];
  addFeedback: (f: Omit<ThemeFeedback, "id" | "at">) => void;
  themeChats: Record<string, ChatMessage[]>;
  setThemeChats: Dispatch<SetStateAction<Record<string, ChatMessage[]>>>;
};

let feedbackSeq = 1;
const moveKey = <T,>(rec: Record<string, T>, from: string, to: string) => {
  if (!(from in rec) || from === to) return rec;
  const { [from]: v, ...rest } = rec;
  return to in rest ? rest : { ...rest, [to]: v as T };
};

export const themeKey = (t: string) => t.trim().toLowerCase();
export function findTheme(themes: string[], name: string) {
  return themes.find((t) => themeKey(t) === themeKey(name));
}

// Keep one context identity across hot reloads so the provider and consumers always match.
const g = globalThis as { __observationsCtx?: ReturnType<typeof createContext<Ctx | null>> };
const ObservationsContext = (g.__observationsCtx ??= createContext<Ctx | null>(null));

export function ObservationsProvider({ children }: { children: ReactNode }) {
  const [observations, setObservations] = useState<Observation[]>(INITIAL_OBSERVATIONS);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiCoverage, setAiCoverage] = useState<Record<string, number>>({});
  const [bulkAlertDismissed, setBulkAlertDismissed] = useState(false);
  const [bulkFlowOpen, setBulkFlowOpen] = useState(false);
  const [bulkFlowKind, setBulkFlowKind] = useState<"themes" | "unthemed">("themes");
  const [aiSeedUsed, setAiSeedUsed] = useState<number[]>([]);
  const [registry, setRegistry] = useState<string[]>([]);
  const [themeLens, setThemeLens] = useState<Record<string, ThemeLens>>({});
  const [themeFeedback, setThemeFeedback] = useState<ThemeFeedback[]>([]);
  const [themeChats, setThemeChats] = useState<Record<string, ChatMessage[]>>({});
  const addFeedback = (f: Omit<ThemeFeedback, "id" | "at">) =>
    setThemeFeedback((prev) => [...prev, { ...f, id: feedbackSeq++, at: Date.now() }]);
  const workspaceThemes = useMemo(() => {
    const out: string[] = [];
    [...registry, ...observations.flatMap((o) => o.themes)].forEach((t) => { if (!findTheme(out, t)) out.push(t); });
    return out;
  }, [registry, observations]);
  const addTheme = (name: string) => {
    const clean = name.trim();
    const existing = findTheme(workspaceThemes, clean);
    if (existing) return existing;
    setRegistry((r) => (findTheme(r, clean) ? r : [...r, clean]));
    return clean;
  };
  const renameTheme = (from: string, to: string) => {
    const clean = to.trim();
    if (!clean) return from;
    const other = workspaceThemes.find((t) => t !== from && themeKey(t) === themeKey(clean));
    const final = other ?? clean;
    setRegistry((r) => {
      const next = r.map((t) => (t === from ? final : t));
      return next.filter((t, i) => next.findIndex((x) => themeKey(x) === themeKey(t)) === i).concat(findTheme(next, final) ? [] : [final]);
    });
    setObservations((prev) => prev.map((o) => o.themes.includes(from)
      ? { ...o, themes: [...new Set(o.themes.map((t) => (t === from ? final : t)))] }
      : o));
    setThemeLens((l) => moveKey(l, from, final));
    setThemeChats((c) => moveKey(c, from, final));
    setThemeFeedback((fb) => fb.map((f) => ({
      ...f,
      theme: f.theme === from ? final : f.theme,
      to: f.to === from ? final : f.to,
    })));
    return final;
  };
  const value = useMemo(
    () => ({
      mediaList: MEDIA_LIST, observations, setObservations, insights, setInsights,
      aiCoverage, setAiCoverage, bulkAlertDismissed, setBulkAlertDismissed,
      bulkFlowOpen, setBulkFlowOpen, bulkFlowKind, aiSeedUsed, setAiSeedUsed,
      openBulkFlow: (kind: "themes" | "unthemed") => {
        setBulkFlowKind(kind);
        setBulkFlowOpen(true);
      },
      resetDemo: () => {
        setObservations(INITIAL_OBSERVATIONS);
        setInsights([]);
        setAiCoverage({});
        setBulkAlertDismissed(false);
        setBulkFlowOpen(false);
        setAiSeedUsed([]);
        setRegistry([]);
        setThemeLens({});
        setThemeFeedback([]);
        setThemeChats({});
      },
      workspaceThemes, addTheme, renameTheme,
      themeLens, setThemeLens, themeFeedback, addFeedback, themeChats, setThemeChats,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceThemes, observations, insights, aiCoverage, bulkAlertDismissed, bulkFlowOpen, bulkFlowKind, aiSeedUsed, themeLens, themeFeedback, themeChats],
  );
  return (
    <ObservationsContext.Provider value={value}>{children}</ObservationsContext.Provider>
  );
}

export function useObservations() {
  const ctx = useContext(ObservationsContext);
  if (!ctx) throw new Error("useObservations must be used inside ObservationsProvider");
  return ctx;
}
