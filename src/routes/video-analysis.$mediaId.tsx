import { summarizeQuote } from "@/lib/ai-note.functions";
import { summarizeSession, type SummaryResult } from "@/lib/ai-summary.functions";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronDown,
  Pencil,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  Pin,
  
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Search,
  RefreshCw,
  Copy,
  Share2,
  Tag,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";
import interviewVideo from "@/assets/registrazione-schermo-ottimizzata.mp4.asset.json";
import { AddToInsightModal } from "@/components/AddToInsightModal";
import { Button } from "@/components/ui/button";
import {
  INITIAL_OBSERVATIONS,
  useObservations,
  type Observation,
} from "@/lib/observations-store";

export const Route = createFileRoute("/video-analysis/$mediaId")({
  head: () => ({
    meta: [
      { title: "UX Research Platform — Video Analysis" },
      {
        name: "description",
        content:
          "Analyze user research sessions with transcripts, AI summaries, and highlight reels.",
      },
      { property: "og:title", content: "UX Research Platform — Video Analysis" },
      {
        property: "og:description",
        content:
          "Analyze user research sessions with transcripts, AI summaries, and highlight reels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const QUOTE_TEXT = "nessuno mi sta dicendo che non ho compilato nulla";

const THEME_OPTIONS = ["Ricerca esplorativa", "Roadmap", "Processo interno"];
const SEVERITY_OPTIONS = ["Major issue", "Minor issue", "Positive", "Wish", "Bug"];
const MIN_SEL = 3;

function severityClass(severity: string) {
  if (!severity) return "text-gray-400";
  if (severity === "Major issue") return "text-red-600";
  if (severity === "Positive") return "text-emerald-600";
  if (severity === "Wish") return "text-blue-600";
  if (severity === "Bug") return "text-violet-600";
  return "text-amber-600";
}

function severityBorderClass(severity: string) {
  if (!severity) return "border-gray-200";
  if (severity === "Major issue") return "border-red-400";
  if (severity === "Positive") return "border-emerald-400";
  if (severity === "Wish") return "border-blue-400";
  if (severity === "Bug") return "border-violet-400";
  return "border-amber-400";
}

function severityStrongBorderClass(severity: string) {
  if (!severity) return "border-gray-300";
  if (severity === "Major issue") return "border-red-500";
  if (severity === "Positive") return "border-emerald-500";
  if (severity === "Wish") return "border-blue-500";
  if (severity === "Bug") return "border-violet-500";
  return "border-amber-500";
}

function severityFillClass(severity: string) {
  if (!severity) return "bg-gray-400";
  if (severity === "Major issue") return "bg-red-500";
  if (severity === "Positive") return "bg-emerald-500";
  if (severity === "Wish") return "bg-blue-500";
  if (severity === "Bug") return "bg-violet-500";
  return "bg-amber-500";
}

function severityRadioLabelClass(severity: string) {
  if (severity === "Major issue") return "text-red-500";
  if (severity === "Positive") return "text-green-500";
  if (severity === "Wish") return "text-blue-500";
  if (severity === "Bug") return "text-violet-500";
  return "text-yellow-500";
}




const SUGGESTION_TEMPLATES = [
  (q: string) =>
    `Need: procedere senza interpretare. Problema in “${q}”: il passaggio genera esitazione.`,
  (q: string) =>
    `Need: informazioni immediate nel punto d’uso. Problema in “${q}”: il tester le cerca altrove.`,
  (q: string) =>
    `Need: capire subito cosa succede dopo. Problema in “${q}”: manca un feedback esplicito.`,
];

/* ---- text offset helpers (stable across DOM re-wrapping) ---- */
function walkText(root: Node) {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
}

function fullText(root: Node) {
  const w = walkText(root);
  let s = "";
  let n: Node | null;
  while ((n = w.nextNode())) s += n.textContent ?? "";
  return s;
}

function textOffset(root: Node, node: Node, offset: number) {
  if (node.nodeType !== Node.TEXT_NODE) {
    // approximate: offset counted in child nodes
    let total = 0;
    const w = walkText(root);
    let n: Node | null;
    while ((n = w.nextNode())) {
      if (node.contains(n)) return total;
      total += (n.textContent ?? "").length;
    }
    return total;
  }
  let total = 0;
  const w = walkText(root);
  let n: Node | null;
  while ((n = w.nextNode())) {
    if (n === node) return total + offset;
    total += (n.textContent ?? "").length;
  }
  return total;
}

function rangeFromOffsets(root: Node, start: number, end: number) {
  const range = document.createRange();
  const w = walkText(root);
  let total = 0;
  let started = false;
  let n: Text | null;
  while ((n = w.nextNode() as Text | null)) {
    const len = n.length;
    if (!started && start < total + len) {
      range.setStart(n, start - total);
      started = true;
    }
    if (started && end <= total + len) {
      range.setEnd(n, end - total);
      return range;
    }
    total += len;
  }
  return null;
}

function trimOffsets(text: string, start: number, end: number) {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s] ?? "")) s++;
  while (e > s && /\s/.test(text[e - 1] ?? "")) e--;
  return [s, e] as const;
}


function buildSuggestion(quote: string, variant: number) {
  const maxQuote = 40;
  const short = quote.length > maxQuote ? `${quote.slice(0, maxQuote).trim()}…` : quote;
  const fn = SUGGESTION_TEMPLATES[variant % SUGGESTION_TEMPLATES.length]!;
  const raw = fn(short);
  return raw.length > 100 ? `${raw.slice(0, 97).trim()}…` : raw;
}

async function fetchAiNote(quote: string, variant: number) {
  try {
    const r = await summarizeQuote({ data: { quote, variant } });
    return r.note || buildSuggestion(quote, variant);
  } catch {
    return buildSuggestion(quote, variant);
  }
}

function timeStartSeconds(time: string) {
  const start = time.split(" - ")[0] ?? "00:00";
  const parts = start.split(":").map(Number);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3)
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return 0;
}

function AutoTextarea({
  value,
  minRows = 1,
  className = "",
  inputRef,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  minRows?: number;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = window.getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight || "16") || 16;
    const extra =
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderTopWidth) +
      parseFloat(cs.borderBottomWidth);
    const min = lineHeight * minRows + extra;
    el.style.height = `${Math.max(el.scrollHeight, min)}px`;
  }, [value, minRows]);
  return (
    <textarea
      ref={(element) => {
        ref.current = element;
        if (inputRef) inputRef.current = element;
      }}
      value={value}
      rows={minRows}
      className={`resize-none overflow-hidden ${className}`}
      {...props}
    />
  );
}

function Index() {
  const [phase, setPhase] = useState<"idle" | "editing" | "saved">("idle");
  // ---- AI executive summary ----
  const [execSummary, setExecSummary] = useState<SummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryVariant, setSummaryVariant] = useState(0);
  const [citeTip, setCiteTip] = useState<number | null>(null);
  const citeTimerRef = useRef<number | null>(null);
  const loadSummary = async (v: number) => {
    const root = transcriptRef.current;
    if (!root || summaryLoading) return;
    const blocks = Array.from(root.querySelectorAll("p.mb-1")).map((meta) => ({
      time: meta.querySelectorAll("span")[1]?.textContent?.trim() ?? "",
      text: (meta.nextElementSibling?.textContent ?? "").replace(/\s+/g, " ").trim(),
    })).filter((b) => b.time && b.text);
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setExecSummary(await summarizeSession({ data: { blocks, variant: v } }));
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Errore AI");
    } finally {
      setSummaryLoading(false);
    }
  };
  useEffect(() => {
    void loadSummary(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goToCitation = (quoteText: string) => {
    const root = transcriptRef.current;
    if (!root) return;
    const norm = (s: string) => s.replace(/\s+/g, " ");
    for (const meta of Array.from(root.querySelectorAll("p.mb-1"))) {
      const p = meta.nextElementSibling;
      if (!(p instanceof HTMLParagraphElement)) continue;
      const idx = norm(p.textContent ?? "").indexOf(quoteText);
      if (idx < 0) continue;
      const range = rangeFromOffsets(p, idx, idx + quoteText.length);
      if (!range) return;
      const rect = range.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      root.scrollBy({ top: rect.top - box.top - box.height / 3, behavior: "smooth" });
      const H = (globalThis as { Highlight?: new (r: Range) => unknown }).Highlight;
      const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
      if (H && reg) {
        reg.set("cite", new H(range));
        if (citeTimerRef.current) clearTimeout(citeTimerRef.current);
        citeTimerRef.current = window.setTimeout(() => reg.delete("cite"), 2500);
      }
      return;
    }
  };
  const [note, setNote] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [variant, setVariant] = useState(0);
  const [quote, setQuote] = useState(QUOTE_TEXT);
  const [themes, setThemes] = useState<string[]>([]);
  const [localThemeOptions, setThemeOptions] = useState<string[]>(THEME_OPTIONS);
  const { workspaceThemes: sharedThemes } = useObservations();
  const themeOptions = useMemo(
    () => [...localThemeOptions, ...sharedThemes.filter((t) => !localThemeOptions.some((x) => x.trim().toLowerCase() === t.trim().toLowerCase()))],
    [localThemeOptions, sharedThemes],
  );
  const [themeQuery, setThemeQuery] = useState("");
  const [severity, setSeverity] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [themeListOpen, setThemeListOpen] = useState(false);
  const [showSeverity, setShowSeverity] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [toast, setToast] = useState(false);
  const { mediaId } = Route.useParams();
  const videoId = Number(mediaId) || 1;
  const { observations, setObservations: setItems, mediaList } = useObservations();
  const media = mediaList.find((m) => m.id === videoId);
  const items = observations.filter((o) => o.videoId === videoId);
  const [sevFilter, setSevFilter] = useState<string[]>([]);
  const [themeFilter, setThemeFilter] = useState<string[]>([]);
  const [themeFilterOpen, setThemeFilterOpen] = useState(false);
  const themeFilterRef = useRef<HTMLDivElement>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [savedFlashId, setSavedFlashId] = useState<number | null>(null);
  const savedFlashTimerRef = useRef<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [insightSnack, setInsightSnack] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<{
    item: Observation;
    index: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selTime, setSelTime] = useState("00:45");
  const [draftSlot, setDraftSlot] = useState<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement | null>(null);
  const markSpansRef = useRef<HTMLElement[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const spanRefs = useRef(new Map<number, HTMLElement>());
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Pick<Observation, "themes" | "note" | "quote" | "severity" | "anchor"> | null>(null);
  const [discardEditOpen, setDiscardEditOpen] = useState(false);
  const editButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const editNoteRef = useRef<HTMLTextAreaElement | null>(null);
  const discardDialogRef = useRef<HTMLDialogElement | null>(null);
  const [openThemeCardId, setOpenThemeCardId] = useState<number | null>(null);
  const [openSevCardId, setOpenSevCardId] = useState<number | null>(null);
  const [editThemeQuery, setEditThemeQuery] = useState("");
  const offsetsRef = useRef<{ start: number; end: number } | null>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  const editOffsetsRef = useRef<{ start: number; end: number } | null>(null);
  const editDragRef = useRef<"start" | "end" | null>(null);
  const [editHandles, setEditHandles] = useState<
    { x: number; y: number; h: number }[] | null
  >(null);
  const [handles, setHandles] = useState<
    { x: number; y: number; h: number }[] | null
  >(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [aiNoteReady, setAiNoteReady] = useState(false);
  const [generatingNote, setGeneratingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const aiNoteTimerRef = useRef<number | null>(null);
  const [userTyped, setUserTyped] = useState(false);
  const userTypedRef = useRef(false);
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const [previewSuggestion, setPreviewSuggestion] = useState<string | null>(
    null,
  );
  const [previousNote, setPreviousNote] = useState("");
  const [aiUndoToast, setAiUndoToast] = useState(false);
  const aiUndoTimerRef = useRef<number | null>(null);

  const generateAiNote = async (
    nextVariant: number,
    overwrite: boolean,
    forcedText?: string,
  ) => {
    if (overwrite) setPreviousNote(note);
    let s = forcedText;
    if (s === undefined) {
      setAiNoteReady(false);
      setGeneratingNote(true);
      s = await fetchAiNote(quote, nextVariant);
    }
    setVariant(nextVariant);
    setSuggestion(s);
    setNote(s);
    setUserTyped(false);
    userTypedRef.current = false;
    setGeneratingNote(false);
    setAiNoteReady(true);
    setShowAiConfirm(false);
    setPreviewSuggestion(null);
    if (overwrite) {
      setAiUndoToast(true);
      if (aiUndoTimerRef.current) clearTimeout(aiUndoTimerRef.current);
      aiUndoTimerRef.current = window.setTimeout(
        () => setAiUndoToast(false),
        5000,
      );
    }
  };

  const undoAiOverwrite = () => {
    setNote(previousNote);
    setUserTyped(true);
    userTypedRef.current = true;
    setAiNoteReady(false);
    setAiUndoToast(false);
    if (aiUndoTimerRef.current) clearTimeout(aiUndoTimerRef.current);
  };
  // Live tagging (video player)
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hoverMarker, setHoverMarker] = useState<number | null>(null);

  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveEnd, setLiveEnd] = useState<string | null>(null);


  const resetDraft = () => {
    setNote("");
    setSuggestion("");
    setVariant(0);
    setQuote(QUOTE_TEXT);
    setThemes([]);
    setThemeQuery("");
    setSeverity(null);
    setShowThemePicker(false);
    setThemeListOpen(false);
    setShowSeverity(false);
    setAiNoteReady(false);
    setGeneratingNote(false);
    setUserTyped(false);
    userTypedRef.current = false;
    setShowAiConfirm(false);
    setPreviewSuggestion(null);
    setPreviousNote("");
    setAiUndoToast(false);
    if (aiUndoTimerRef.current) clearTimeout(aiUndoTimerRef.current);
    if (aiNoteTimerRef.current) {
      clearTimeout(aiNoteTimerRef.current);
      aiNoteTimerRef.current = null;
    }
  };

  const toggleTheme = (t: string) =>
    setThemes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const createTheme = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setThemeOptions((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setThemes((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setThemeQuery("");
  };

  const markClass = (sev: string | null, saved = false) =>
    saved
      ? `cursor-pointer transition-colors duration-700 rounded-sm bg-gray-100 [box-decoration-break:clone] border-b-2 ${severityBorderClass(sev ?? "").replace("border-l-", "border-b-")}`
      : sev
        ? `rounded-sm [box-decoration-break:clone] border-b-2 bg-yellow-100 ${severityBorderClass(sev).replace("border-l-", "border-b-")}`
        : "rounded-sm bg-yellow-200 [box-decoration-break:clone]";

  const handlesFromSpans = (spans: HTMLElement[]) => {
    const live = spans.filter((s) => s.isConnected);
    if (!live.length) return null;
    const fr = Array.from(live[0]!.getClientRects());
    const lr = Array.from(live[live.length - 1]!.getClientRects());
    if (!fr.length || !lr.length) return null;
    const first = fr[0]!;
    const last = lr[lr.length - 1]!;
    return [
      { x: first.left, y: first.top, h: first.height },
      { x: last.right, y: last.top, h: last.height },
    ] as [{ x: number; y: number; h: number }, { x: number; y: number; h: number }];
  };

  const updateHandles = () => {
    setHandles(handlesFromSpans(markSpansRef.current));
  };

  const unwrapSpans = (spans: HTMLElement[]) => {
    spans.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      span.replaceWith(document.createTextNode(span.textContent ?? ""));
      (parent as Element).normalize?.();
    });
  };

  const spansFor = (id: number): HTMLElement[] => {
    const root = transcriptRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(`[data-highlight-id="${id}"]`));
  };

  const unmark = () => {
    const spans = markSpansRef.current;
    markSpansRef.current = [];
    markRef.current = null;
    offsetsRef.current = null;
    setHandles(null);
    unwrapSpans(spans);
  };

  // split a range into one segment per spoken paragraph (labels excluded)
  const paragraphSegments = (root: HTMLElement, start: number, end: number) => {
    const text = fullText(root);
    const bodies = Array.from(root.querySelectorAll("p")).filter(
      (p) => !p.classList.contains("mb-1") && !p.closest("[data-draft-slot]") && !p.closest("[role=dialog]"),
    );
    const segs: [number, number][] = [];
    for (const p of bodies) {
      const ps = textOffset(root, p, 0);
      const pe = ps + (p.textContent ?? "").length;
      const s = Math.max(start, ps);
      const e = Math.min(end, pe);
      if (e <= s) continue;
      const [ts, te] = trimOffsets(text, s, e);
      if (te > ts) segs.push([ts, te]);
    }
    return segs;
  };

  // wrap each segment in its own span; returns spans in document order
  const wrapSegments = (root: HTMLElement, segs: [number, number][], className: string, id?: number) => {
    const spans: HTMLElement[] = [];
    for (let i = segs.length - 1; i >= 0; i--) {
      const [s, e] = segs[i]!;
      const range = rangeFromOffsets(root, s, e);
      if (!range) continue;
      const span = document.createElement("span");
      span.className = className;
      if (id != null) span.dataset["highlightId"] = String(id);
      try {
        range.surroundContents(span);
      } catch {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      spans.unshift(span);
    }
    return spans;
  };

  const joinSpans = (spans: HTMLElement[], sep = " ") =>
    spans.map((s) => (s.textContent ?? "").trim()).filter(Boolean).join(sep);

  const applyMark = (start: number, end: number, sev: string | null) => {
    const root = transcriptRef.current;
    if (!root) return null;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    unwrapSpans(markSpansRef.current);
    markSpansRef.current = [];
    markRef.current = null;
    const segs = paragraphSegments(root, lo, hi);
    const total = segs.reduce((n, [s, e]) => n + (e - s), 0);
    if (!segs.length || total < MIN_SEL) return null;
    const spans = wrapSegments(root, segs, markClass(sev));
    if (!spans.length) return null;
    markSpansRef.current = spans;
    markRef.current = spans[0]!;
    offsetsRef.current = { start: segs[0]![0], end: segs[segs.length - 1]![1] };
    updateHandles();
    return joinSpans(spans);
  };

  const handleMouseUp = () => {
    if (phase === "editing" || dragRef.current || editDragRef.current) return;
    const root = transcriptRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
    if (sel.toString().trim().length < 3) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    const start = textOffset(root, range.startContainer, range.startOffset);
    const end = textOffset(root, range.endContainer, range.endOffset);
    sel.removeAllRanges();

    const text = applyMark(start, end, null);
    if (!text) return;

    const block = markRef.current?.closest("div");
    const label = block?.querySelector("p")?.textContent ?? "";
    const stamp = label.match(/\d{2}:\d{2}/)?.[0];
    setSelTime(stamp ?? "09:57");

    const H = 520;
    const top =
      rect.bottom + 8 + H > window.innerHeight
        ? Math.max(8, rect.top - H - 8)
        : rect.bottom + 8;
    setPos({
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 380)),
    });
    resetDraft();
    setQuote(text);
    setAiNoteReady(false);
    setGeneratingNote(true);
    if (aiNoteTimerRef.current) clearTimeout(aiNoteTimerRef.current);
    const aiPromise = fetchAiNote(text, 0);
    aiNoteTimerRef.current = window.setTimeout(async () => {
      const s = await aiPromise;
      if (!userTypedRef.current) {
        setSuggestion(s);
        setNote(s);
        setAiNoteReady(true);
      }
      setGeneratingNote(false);
      aiNoteTimerRef.current = null;
    }, 2000);
    setPhase("editing");
  };

  const startDrag = (which: "start" | "end") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = which;
  };


  // ---- Live tagging on the video player ----
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const clearLive = () => {
    setLiveMode(false);
    setRecording(false);
    setLiveEnd(null);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const startLive = () => {
    if (phase === "editing" && !liveMode) return;
    const v = videoRef.current;
    const t = v?.currentTime ?? 0;
    unmark();
    resetDraft();
    setQuote("");
    setSelTime(fmtTime(t));
    setLiveEnd(null);
    setLiveMode(true);
    setRecording(true);
    if (v?.paused) void v.play();
    const r = barRef.current?.getBoundingClientRect();
    const H = 520;
    const W = 360;
    // place the popover to the right of the control bar CTA so Start/End stay visible
    const top = r
      ? Math.max(8, Math.min(r.top, window.innerHeight - H - 8))
      : 80;
    const left = r
      ? Math.max(8, Math.min(r.right + 8, window.innerWidth - W - 8))
      : 80;
    setPos({ top, left });
    setPhase("editing");
  };

  const endLive = () => {
    const v = videoRef.current;
    setLiveEnd(fmtTime(v?.currentTime ?? 0));
    setRecording(false);
    v?.pause();
    // capture the real transcript text spoken at the start time and underline it
    let captured = "";
    const root = transcriptRef.current;
    if (root) {
      const target = timeStartSeconds(selTime);
      let body: HTMLParagraphElement | null = null;
      root.querySelectorAll("p.mb-1").forEach((meta) => {
        const label = meta.querySelectorAll("span")[1]?.textContent?.trim() ?? "";
        if (!/^\d{2}:\d{2}$/.test(label)) return;
        if (body && timeStartSeconds(label) > target) return;
        const next = meta.nextElementSibling;
        if (next instanceof HTMLParagraphElement) body = next;
      });
      const p = body as HTMLParagraphElement | null;
      if (p) {
        const full = p.textContent ?? "";
        const start = textOffset(root, p, 0);
        let len = full.length;
        if (len > 160) {
          const cut = full.lastIndexOf(".", 160);
          len = cut > 20 ? cut + 1 : 160;
        }
        captured = applyMark(start, start + len, severity) ?? "";
      }
    }
    setQuote(captured);
    setAiNoteReady(false);
    setGeneratingNote(true);
    if (aiNoteTimerRef.current) clearTimeout(aiNoteTimerRef.current);
    const aiPromise = fetchAiNote(captured, 0);
    aiNoteTimerRef.current = window.setTimeout(async () => {
      const s = await aiPromise;
      if (!userTypedRef.current) {
        setSuggestion(s);
        setNote(s);
        setAiNoteReady(true);
      }
      setGeneratingNote(false);
      aiNoteTimerRef.current = null;
    }, 2000);
  };

  const requestClose = () => {
    if (note.trim() && note !== suggestion) {
      setShowDiscard(true);
    } else {
      unmark();
      clearLive();
      setPhase("idle");
      resetDraft();
    }
  };

  const discard = () => {
    setShowDiscard(false);
    unmark();
    clearLive();
    setPhase("idle");
    resetDraft();
  };

  // anchor a live (video) highlight to the transcript block at that timestamp
  const anchorByTime = (id: number, sev: string, time: string) => {
    const root = transcriptRef.current;
    if (!root) return;
    const target = timeStartSeconds(time);
    let best: HTMLParagraphElement | null = null;
    root.querySelectorAll("p.mb-1").forEach((meta) => {
      const label = meta.querySelectorAll("span")[1]?.textContent?.trim() ?? "";
      if (!/^\d{2}:\d{2}$/.test(label)) return;
      if (timeStartSeconds(label) > target) return;
      const body = meta.nextElementSibling;
      if (body instanceof HTMLParagraphElement) best = body;
    });
    const body: HTMLParagraphElement | null = best;
    if (!body) return;
    const span = document.createElement("span");
    span.className = markClass(sev, true);
    span.dataset["highlightId"] = String(id);
    const range = document.createRange();
    range.selectNodeContents(body);
    try {
      range.surroundContents(span);
    } catch {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    spanRefs.current.set(id, span);
  };

  const save = () => {
    if (isSaving) return;
    setIsSaving(true);
    window.setTimeout(() => {
      const id = Date.now();
      const sev = severity ?? "";
      const newItem = {
        id,
        videoId: videoId,
        time: `${selTime} - ${liveEnd ?? selTime}`,
        themes,
        note: note.trim(),
        quote,
        severity: sev,
        severityClass: severityClass(sev),
        author: "Federica",
        source: "human" as const,
        anchor: joinSpans(markSpansRef.current.filter((s) => s.isConnected), "\n") || quote.trim(),
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        next.sort((a, b) => timeStartSeconds(a.time) - timeStartSeconds(b.time));
        return next;
      });
      setJustAdded(id);
      const draftSpans = markSpansRef.current.filter((s) => s.isConnected);
      const span = draftSpans[0];
      if (span) {
        draftSpans.forEach((s) => {
          s.className = markClass(sev, true);
          s.dataset["highlightId"] = String(id);
        });
        spanRefs.current.set(id, span);
        markRef.current = null;
        markSpansRef.current = [];
        offsetsRef.current = null;
        setHandles(null);
        setPhase("idle");
        resetDraft();
      } else if (liveMode) {
        anchorByTime(id, sev, selTime);
        setPhase("idle");
        resetDraft();
      } else {
        setPhase("saved");
      }
      clearLive();
      setShowThemePicker(false);
      setToast(true);
      setIsSaving(false);
      window.setTimeout(() => {
        scrollToSpan(id);
        scrollToCard(id);
      }, 60);
    }, 280);
  };




  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (justAdded == null) return;
    const t = setTimeout(() => setJustAdded(null), 1200);
    return () => clearTimeout(t);
  }, [justAdded]);

  // clear the "Salvato" flash timer on unmount
  useEffect(
    () => () => {
      if (savedFlashTimerRef.current !== null)
        window.clearTimeout(savedFlashTimerRef.current);
    },
    [],
  );


  // close card dropdown when clicking outside
  useEffect(() => {
    if (menuOpenId == null) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpenId]);

  // auto-dismiss delete toast (permanently discards the deleted item)
  useEffect(() => {
    if (!deleted) return;
    const t = setTimeout(() => setDeleted(null), 6000);
    return () => clearTimeout(t);
  }, [deleted]);

  useEffect(() => {
    if (!insightSnack) return;
    const t = setTimeout(() => setInsightSnack(null), 5000);
    return () => clearTimeout(t);
  }, [insightSnack]);


  const deleteItem = (id: number) => {
    setMenuOpenId(null);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    const index = items.findIndex((x) => x.id === id);
    if (index === -1) return;
    setDeleted({ item: items[index]!, index });
    setItems((prev) => prev.filter((x) => x.id !== id));
    spanRefs.current.delete(id);
    unwrapSpans(spansFor(id));
    if (activeCardId === id) setActiveCardId(null);
  };

  // Interaction A: transcript highlight -> sidebar card
  const scrollToCard = (id: number) => {
    const card = cardRefs.current.get(id);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveCardId(id);
  };

  // Interaction B: sidebar card -> transcript highlight
  const flashSpan = (span: HTMLElement) => {
    span.classList.remove("bg-gray-100");
    span.classList.add("bg-yellow-300");
    window.setTimeout(() => {
      span.classList.remove("bg-yellow-300");
      span.classList.add("bg-gray-100");
    }, 900);
  };

  const scrollToSpan = (id: number) => {
    const spans = spansFor(id);
    if (!spans.length) return;
    spans[0]!.scrollIntoView({ behavior: "smooth", block: "center" });
    spans.forEach(flashSpan);
  };

  // ----- inline edit mode for saved cards -----
  type CardItem = Observation;

  const spanOffsets = (id: number) => {
    const root = transcriptRef.current;
    const spans = spansFor(id);
    if (!root || !spans.length) return null;
    const last = spans[spans.length - 1]!;
    const start = textOffset(root, spans[0]!, 0);
    const lastStart = textOffset(root, last, 0);
    return { start, end: lastStart + (last.textContent ?? "").length };
  };

  const editingIdRef = useRef<number | null>(null);
  editingIdRef.current = editingCardId;

  const updateEditHandles = () => {
    const id = editingIdRef.current;
    setEditHandles(id != null ? handlesFromSpans(spansFor(id)) : null);
  };

  const exitEdit = () => {
    const id = editingIdRef.current;
    if (id == null) return;
    spansFor(id).forEach((s) => s.classList.remove("ring-2", "ring-blue-300"));
    editDragRef.current = null;
    editOffsetsRef.current = null;
    editingIdRef.current = null;
    setEditingCardId(null);
    setEditHandles(null);
  };

  // re-wrap a saved highlight at new offsets (handle dragging in edit mode)
  const remarkSaved = (
    id: number,
    start: number,
    end: number,
    sev: string,
  ) => {
    const root = transcriptRef.current;
    if (!root) return null;
    const segs = paragraphSegments(root, Math.min(start, end), Math.max(start, end));
    const total = segs.reduce((n, [s, e]) => n + (e - s), 0);
    if (!segs.length || total < MIN_SEL) return null;
    unwrapSpans(spansFor(id));
    const spans = wrapSegments(root, segs, `${markClass(sev, true)} ring-2 ring-blue-300`, id);
    if (!spans.length) return null;
    spanRefs.current.set(id, spans[0]!);
    editOffsetsRef.current = { start: segs[0]![0], end: segs[segs.length - 1]![1] };
    return { quote: joinSpans(spans), anchor: joinSpans(spans, "\n") };
  };

  const commitItem = (id: number, patch: Partial<CardItem>) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              ...patch,
              ...(patch.severity !== undefined
                ? { severityClass: severityClass(patch.severity) }
                : {}),
            }
          : x,
      ),
    );
    setSavedFlashId(id);
    if (savedFlashTimerRef.current !== null)
      window.clearTimeout(savedFlashTimerRef.current);
    savedFlashTimerRef.current = window.setTimeout(() => {
      setSavedFlashId(null);
      savedFlashTimerRef.current = null;
    }, 2000);
    if (patch.severity !== undefined) {
      spansFor(id).forEach((span) => {
        span.className = `${markClass(patch.severity ?? "", true)}${
          editingIdRef.current === id ? " ring-2 ring-blue-300" : ""
        }`;
      });
    }
  };

  const beginCardEdit = (h: CardItem) => {
    if (editingIdRef.current === h.id) return;
    setMenuOpenId(null);
    editingIdRef.current = h.id;
    setEditingCardId(h.id);
    setEditDraft({
      themes: [...h.themes],
      note: h.note,
      quote: h.quote,
      severity: h.severity,
      anchor: h.anchor ?? h.quote,
    });
    const spans = spansFor(h.id);
    if (spans.length) {
      spans.forEach((s) => s.classList.add("ring-2", "ring-blue-300"));
      editOffsetsRef.current = spanOffsets(h.id);
      updateEditHandles();
      window.setTimeout(() => updateEditHandles(), 400);
    } else {
      editOffsetsRef.current = null;
      setEditHandles(null);
    }
    window.setTimeout(() => editNoteRef.current?.focus(), 0);
  };

  const originalEditingItem = editingCardId == null
    ? null
    : items.find((item) => item.id === editingCardId) ?? null;
  const editIsDirty = Boolean(
    originalEditingItem && editDraft &&
      (originalEditingItem.note !== editDraft.note ||
        originalEditingItem.quote !== editDraft.quote ||
        originalEditingItem.severity !== editDraft.severity ||
        originalEditingItem.anchor !== editDraft.anchor ||
        originalEditingItem.themes.join("\u0000") !== editDraft.themes.join("\u0000")),
  );

  const restoreTranscriptFromItem = (item: CardItem) => {
    const root = transcriptRef.current;
    if (!root) return;
    unwrapSpans(spansFor(item.id));
    const raw = (item.anchor || item.quote || "").trim();
    if (!raw) return;
    const text = fullText(root).replace(/\u00a0/g, " ").toLowerCase();
    const segs: [number, number][] = [];
    let from = 0;
    for (const piece of raw.split("\n").map((part) => part.trim()).filter(Boolean)) {
      const index = text.indexOf(piece.toLowerCase(), from);
      if (index === -1) return;
      segs.push([index, index + piece.length]);
      from = index + piece.length;
    }
    const restored = wrapSegments(root, segs, markClass(item.severity, true), item.id);
    if (restored[0]) spanRefs.current.set(item.id, restored[0]);
  };

  const finishCardEdit = (restoreFocus = true) => {
    const id = editingIdRef.current;
    const original = id == null ? null : items.find((item) => item.id === id);
    if (original) restoreTranscriptFromItem(original);
    exitEdit();
    setEditDraft(null);
    setOpenThemeCardId(null);
    setOpenSevCardId(null);
    if (restoreFocus && id != null) {
      window.setTimeout(() => editButtonRefs.current.get(id)?.focus(), 0);
    }
  };

  const requestCancelCardEdit = () => {
    if (editIsDirty) setDiscardEditOpen(true);
    else finishCardEdit();
  };

  useEffect(() => {
    const dialog = discardDialogRef.current;
    if (!dialog) return;
    if (discardEditOpen && !dialog.open) dialog.showModal();
    if (!discardEditOpen && dialog.open) dialog.close();
  }, [discardEditOpen]);

  const saveCardEdit = () => {
    const id = editingIdRef.current;
    if (id == null || !editDraft) return;
    commitItem(id, editDraft);
    spansFor(id).forEach((span) => {
      span.className = markClass(editDraft.severity, true);
    });
    exitEdit();
    setEditDraft(null);
    setOpenThemeCardId(null);
    setOpenSevCardId(null);
    window.setTimeout(() => editButtonRefs.current.get(id)?.focus(), 0);
  };

  useEffect(() => {
    if (editingCardId == null) {
      setEditHandles(null);
      return;
    }
    updateEditHandles();
  }, [editingCardId]);

  // Guard unsaved edits on outside click or Escape.
  useEffect(() => {
    if (editingCardId == null) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const id = editingIdRef.current;
      if (id == null) return;
      if (t.closest?.("[data-sel-handle]")) return;
      if (t.closest?.(`[data-highlight-id="${id}"]`)) return;
      if (cardRefs.current.get(id)?.contains(t)) return;
      if (t.closest?.("[role=menu],[data-theme-picker],[data-sev-picker]")) return;
      if (editIsDirty) setDiscardEditOpen(true);
      else finishCardEdit();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (editIsDirty) setDiscardEditOpen(true);
        else finishCardEdit();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [editingCardId, editIsDirty]);

  // close theme / severity pickers on outside click
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-theme-picker]")) {
        setShowThemePicker(false);
        setThemeListOpen(false);
        setThemeQuery("");
        setOpenThemeCardId(null);
        setEditThemeQuery("");
      }
      if (!t.closest("[data-sev-picker]")) {
        setShowSeverity(false);
        setOpenSevCardId(null);
      }
    };
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);

  useEffect(() => {
    if (editingCardId == null) return;
    const on = () => updateEditHandles();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [editingCardId]);

  // drag the handles to change the quote bounds while editing a saved card
  useEffect(() => {
    if (editingCardId == null) return;
    const onMove = (e: MouseEvent) => {
      const which = editDragRef.current;
      const root = transcriptRef.current;
      const cur = editOffsetsRef.current;
      if (!which || !root || !cur) return;
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
      };
      let node: Node | null = null;
      let off = 0;
      const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (r) {
        node = r.startContainer;
        off = r.startOffset;
      } else {
        const cp = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
        if (cp) {
          node = cp.offsetNode;
          off = cp.offset;
        }
      }
      if (!node || !root.contains(node)) return;
      const at = textOffset(root, node, off);
      const clamped = at;
      const next =
        which === "start"
          ? { start: Math.min(clamped, cur.end - MIN_SEL), end: cur.end }
          : { start: cur.start, end: Math.max(clamped, cur.start + MIN_SEL) };
      if (next.start === cur.start && next.end === cur.end) return;
      const sev = editDraft?.severity ?? "";
      const res = remarkSaved(editingCardId, next.start, next.end, sev);
      if (res) {
        setEditDraft((draft) => draft ? { ...draft, quote: res.quote, anchor: res.anchor } : draft);
        updateEditHandles();
      }
    };
    const onUp = () => {
      editDragRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [editingCardId, editDraft?.severity]);


  // redraw every saved highlight of this video in the transcript on mount
  useEffect(() => {
    const root = transcriptRef.current;
    if (!root) return;
    spanRefs.current.clear();
    root.querySelectorAll("[data-highlight-id]").forEach((s) => {
      const parent = s.parentNode;
      s.replaceWith(document.createTextNode(s.textContent ?? ""));
      (parent as Element | null)?.normalize?.();
    });
    items.forEach((item) => {
      const raw = (item.anchor || item.quote || "").trim();
      if (!raw || spanRefs.current.has(item.id)) return;
      const pieces = raw.split("\n").map((p) => p.trim()).filter(Boolean);
      const text = fullText(root).replace(/\u00a0/g, " ").toLowerCase();
      const segs: [number, number][] = [];
      let from = 0;
      for (const piece of pieces) {
        const idx = text.indexOf(piece.toLowerCase(), from);
        if (idx === -1) return;
        segs.push([idx, idx + piece.length]);
        from = idx + piece.length;
      }
      const spans = wrapSegments(root, segs, markClass(item.severity, true), item.id);
      if (spans[0]) spanRefs.current.set(item.id, spans[0]);
    });
  }, []);


  useEffect(() => {
    if (activeCardId == null) return;
    const t = setTimeout(() => setActiveCardId(null), 1000);
    return () => clearTimeout(t);
  }, [activeCardId]);

  const undoDelete = () => {
    if (!deleted) return;
    const { item, index } = deleted;
    setItems((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
    setDeleted(null);
  };

  useEffect(() => {
    if (phase === "editing" && markRef.current) {
      markSpansRef.current.forEach((s) => (s.className = markClass(severity)));
      updateHandles();
    }
  }, [severity, phase]);

  // keep handles glued to the span while scrolling/resizing
  useEffect(() => {
    if (phase !== "editing" || !markRef.current) return;
    const on = () => updateHandles();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [phase]);

  // dragging the selection handles adjusts the quote bounds
  useEffect(() => {
    if (phase !== "editing") return;
    const onMove = (e: MouseEvent) => {
      const which = dragRef.current;
      const root = transcriptRef.current;
      const cur = offsetsRef.current;
      if (!which || !root || !cur) return;
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
      };
      let node: Node | null = null;
      let off = 0;
      const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (r) {
        node = r.startContainer;
        off = r.startOffset;
      } else {
        const cp = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
        if (cp) {
          node = cp.offsetNode;
          off = cp.offset;
        }
      }
      if (!node || !root.contains(node)) return;
      const at = textOffset(root, node, off);
      const clamped = at;
      const next =
        which === "start"
          ? { start: Math.min(clamped, cur.end - MIN_SEL), end: cur.end }
          : { start: cur.start, end: Math.max(clamped, cur.start + MIN_SEL) };
      if (next.start === cur.start && next.end === cur.end) return;
      const text = applyMark(next.start, next.end, severity);
      if (text) setQuote(text);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [phase, severity]);



  useEffect(() => {
    if (phase !== "editing" || showDiscard) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("[data-sel-handle]")) return;
      if (t.closest?.("[data-live-ctl]")) return;
      if (markSpansRef.current.some((s) => s.contains(t))) return;
      if (popRef.current && !popRef.current.contains(t)) {
        requestClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  });

  // bring the draft card into view when it appears in the sidebar
  useEffect(() => {
    if (!draftSlot) return;
    draftSlot.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [draftSlot]);

  useEffect(() => {
    if (!themeFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        themeFilterRef.current &&
        !themeFilterRef.current.contains(e.target as Node)
      )
        setThemeFilterOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [themeFilterOpen]);

  const savedSeverity = severity ?? "";

  // ---- Sidebar filters ----
  const sevCounts = [
    {
      label: "Observation",
      count: items.filter((h) => !h.severity).length,
    },
    ...SEVERITY_OPTIONS.map((s) => ({
      label: s,
      count: items.filter((h) => h.severity === s).length,
    })),
  ];
  const allThemes = Array.from(
    new Set(items.flatMap((h) => h.themes)),
  ).sort((a, b) => a.localeCompare(b));
  const themeCount = (t: string) =>
    items.filter((h) => h.themes.includes(t)).length;
  const visibleItems = items.filter(
    (h) =>
      (sevFilter.length === 0 || sevFilter.includes(h.severity)) &&
      (themeFilter.length === 0 ||
        h.themes.some((t) => themeFilter.includes(t))),
  );
  const toggleSevFilter = (s: string) =>
    setSevFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const showDraft = phase === "editing";
  const toggleThemeFilter = (t: string) =>
    setThemeFilter((p) =>
      p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
    );


  return (
    <div className="flex h-screen flex-col bg-slate-50 font-sans text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Link
            to="/media-list"
            aria-label="Torna alla media list"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold">
              {media ? `${media.title} · ${media.participant}` : "Titolo video"}
            </h1>
            <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
            Use Case
          </button>
          <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
            1
          </button>
          <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
            2
          </button>
          <button className="rounded-md border p-1.5 text-gray-500 hover:bg-gray-50">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main body */}
      <main className="mx-12 flex min-h-0 flex-1 gap-4 p-4">
        {/* Left column */}
        <section className="flex h-full w-3/5 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
          {/* Video area */}
          <div
            ref={playerRef}
            className="relative flex h-[45%] min-h-0 items-center justify-center bg-black"
          >
            <video
              ref={videoRef}
              src={interviewVideo.url}
              preload="metadata"
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setCurTime(v.currentTime);
                if (v.duration) setProgress((v.currentTime / v.duration) * 100);
              }}
              className="h-full w-full cursor-pointer object-contain"
            />
          </div>

          {/* Player control bar */}
          <div
            ref={barRef}
            data-live-ctl
            className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                onClick={togglePlay}
                aria-label={playing ? "Pausa" : "Play"}
                className="rounded-full border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <div
                onClick={(e) => {
                  const v = videoRef.current;
                  if (!v || !v.duration) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
                }}
                className="relative h-3 min-w-0 flex-1 cursor-pointer"
              >
                <div className="absolute top-1 left-0 h-1 w-full rounded-full bg-gray-200" />
                <div
                  className="absolute top-1 left-0 h-1 rounded-full bg-gray-500"
                  style={{ width: `${progress}%` }}
                />
                {duration > 0 &&
                  items.map((h) => {
                    const pct = Math.min(
                      100,
                      Math.max(0, (timeStartSeconds(h.time) / duration) * 100),
                    );
                    const hasThemes = (h.themes ?? []).length > 0;
                    return (
                      <div
                        key={`mk-${h.id}`}
                        className="absolute top-0 z-10 -translate-x-1/2"
                        style={{ left: `${pct}%` }}
                        onMouseEnter={() => setHoverMarker(h.id)}
                        onMouseLeave={() => setHoverMarker(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const v = videoRef.current;
                          if (v) v.currentTime = timeStartSeconds(h.time);
                        }}
                      >
                        <div
                          className={`h-3 w-[3px] rounded-full ${severityFillClass(h.severity)} ${!h.severity ? "bg-gray-400" : ""}`}
                        />
                        {hoverMarker === h.id && hasThemes && (
                          <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap">
                            <div className="flex gap-1">
                              {(h.themes ?? []).map((t: string) => (
                                <span
                                  key={t}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityBorderClass(h.severity)} ${severityClass(h.severity)} bg-white`}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <span className="shrink-0 font-mono text-[11px] text-gray-500">
                {fmtTime(curTime)} / {fmtTime(duration)}
              </span>
            </div>
            {recording ? (
              <button
                onClick={endLive}
                className="flex shrink-0 animate-pulse items-center gap-1.5 rounded-md border-2 border-red-500 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Square className="h-3 w-3 fill-red-500 text-red-500" />
                End highlight
              </button>
            ) : (
              <button
                onClick={startLive}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Pin className="h-3.5 w-3.5" />
                Start highlight
              </button>
            )}
          </div>




          {/* Transcript */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-3 border-b px-4 pt-3 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Transcript</h2>
                <div className="flex items-center gap-1 text-gray-400">
                  <button className="rounded p-1 hover:bg-gray-100 hover:text-gray-600">
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button className="rounded p-1 hover:bg-gray-100 hover:text-gray-600">
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transcript…"
                    className="w-full rounded-md border bg-white py-1.5 pr-3 pl-8 text-xs outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-blue-600">
                  <button className="hover:underline">Translate</button>
                  <button className="hover:underline">Show Sentiment</button>
                </div>
              </div>
            </div>

            <div
              ref={transcriptRef}
              onMouseUp={handleMouseUp}
              onClick={(e) => {
                const target = (e.target as HTMLElement).closest?.(
                  "[data-highlight-id]",
                ) as HTMLElement | null;
                if (!target) return;
                const id = Number(target.dataset["highlightId"]);
                if (Number.isNaN(id)) return;
                scrollToCard(id);
              }}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-700 selection:bg-yellow-200"
            >
              {videoId === 1 ? (
              <>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>00:00</span>
                </p>
                <p>Particolari esigenze o problematiche nel carrello. Nel carrello e problematiche nel togliere un prodotto dal carrello, nel carrello. Ok. Ok.</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>01:00</span>
                </p>
                <p>Add a user task. Ok. Ok. Quindi mi trovo un’altra schermata totalmente. Ok. Qua, ok, il mio primo user task. Diamogli un titolo. Ok. Potrebbe essere, appunto come dicevo prima, aggiunta di un prodotto al carrello. Ok.</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>01:40</span>
                </p>
                <p>Non mi piace il fatto che sia di questo colore. Cioè, non mi risalta tanto, soprattutto il, diciamo, il titolo della sezione istruzioni per l’utente. Cioè mi risalta molto di più questa parte qua e non lo so, mi fa un po’ strano.</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>02:20</span>
                </p>
                <p>Ok. Mi aspetto che cliccando si edita da solo. Ok, capisco che devo andare a cliccare edit, ma lo trovavo più immediato cliccando, e mi fa strano in realtà vederlo già precompilato perché non l’ho scritto io e sembra che l’ho scritto io, non so come spiegarlo.</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>03:05</span>
                </p>
                <p>Cioè, se faccio edit, a parte che, cioè, boh, cambia la posizione dei bottoni. Cioè, da qua mi sposta qua e non lo so, mi fa un po’… non mi piace molto, ecco.</p>
              </div>
              <div className="relative">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>03:30</span>
                </p>
                <p>
                  Non tanto il fatto che sia precompilato, ma se io per errore
                  vado qua, cioè{" "}
                  {QUOTE_TEXT}
                  .
                </p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>04:00</span>
                </p>
                <p>Ok, andiamo a scrivere nel dettaglio il task: aggiungi al tuo carrello un tavolo di cristallo. Cerca e aggiungi al tuo carrello un tavolo di cristallo per la tua nuova casa. Ok. E posso anche aggiungere il test link, ok, che però è facoltativo. Ok.</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="text-gray-500">Partecipante</span>
                  <span>05:00</span>
                </p>
                <p>Mi sembra un po’ ingombrante questa parte qua, soprattutto a livello di alcuni testi. Ok, capisco che sono delle tips.</p>
              </div>
              </>
            ) : (
              <>
                <div>
                  <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <span className="text-gray-500">Partecipante</span>
                    <span>00:00</span>
                  </p>
                  <p>In questa sessione il partecipante esplora la schermata principale e commenta ad alta voce ciò che vede, soffermandosi sui primi elementi della pagina.</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <span className="text-gray-500">Partecipante</span>
                    <span>01:30</span>
                  </p>
                  <p>Qui il partecipante prova a completare il task assegnato, esita su un passaggio e descrive cosa si aspettava di trovare in quel punto.</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <span className="text-gray-500">Partecipante</span>
                    <span>03:00</span>
                  </p>
                  <p>Nella parte finale il partecipante riassume l'esperienza, segnalando cosa gli è piaciuto e cosa gli ha creato confusione.</p>
                </div>
              </>
            )}
            </div>
          </div>
                {phase === "editing" &&
                  (() => {
                    const panel = (
                  <div
                    ref={popRef}
                    className="animate-fade-in-up w-full rounded-lg border border-blue-300 bg-white p-3 text-left shadow-sm ring-2 ring-blue-100"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2 border-b pb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        Nuovo highlight · {selTime}
                        {liveEnd ? ` - ${liveEnd}` : ""}
                      </span>
                      {recording && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                          REC
                        </span>
                      )}
                    </div>


                    {/* Tema */}
                    <div className="mb-3" data-theme-picker>
                      {showThemePicker ? (
                        <div className="relative">
                          <div
                            onClick={() => setThemeListOpen(true)}
                            className="flex min-h-9 cursor-text flex-wrap items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
                          >
                            {themes.map((t) => (
                              <span
                                key={t}
                                className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                              >
                                {t}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTheme(t);
                                  }}
                                  className="text-gray-400 hover:text-gray-700"
                                  aria-label={`Rimuovi ${t}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <input
                              autoFocus
                              value={themeQuery}
                              onChange={(e) => {
                                setThemeQuery(e.target.value);
                                setThemeListOpen(true);
                              }}
                              onFocus={() => setThemeListOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  createTheme(themeQuery);
                                }
                                if (e.key === "Escape") {
                                  setShowThemePicker(false);
                                  setThemeListOpen(false);
                                }
                              }}
                              placeholder={
                                themes.length ? "" : "Cerca o crea un tema…"
                              }
                              className="min-w-20 flex-1 bg-transparent py-0.5 text-xs outline-none placeholder:text-gray-400"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setThemeListOpen((v) => !v);
                              }}
                              className="ml-auto text-gray-400 hover:text-gray-600"
                              aria-label="Mostra temi"
                            >
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition ${themeListOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </div>
                          {themeListOpen && (
                            <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-32 overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
                              {themeOptions
                                .filter((t) =>
                                  t
                                    .toLowerCase()
                                    .includes(themeQuery.trim().toLowerCase()),
                                )
                                .map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => toggleTheme(t)}
                                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-gray-50"
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                                        themes.includes(t)
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-gray-300"
                                      }`}
                                    >
                                      {themes.includes(t) ? "✓" : ""}
                                    </span>
                                    {t}
                                  </button>
                                ))}
                              {themeQuery.trim() &&
                                !themeOptions.some(
                                  (t) =>
                                    t.toLowerCase() ===
                                    themeQuery.trim().toLowerCase(),
                                ) && (
                                  <button
                                    onClick={() => createTheme(themeQuery)}
                                    className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50"
                                  >
                                    Crea «{themeQuery.trim()}»
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      ) : themes.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {themes.map((t) => (
                            <span
                              key={t}
                              className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600"
                            >
                              {t}
                              <button
                                onClick={() => toggleTheme(t)}
                                className="text-gray-400 hover:text-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              setThemeQuery("");
                              setShowThemePicker(true);
                              setThemeListOpen(true);
                            }}
                            className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setThemeQuery("");
                            setShowThemePicker(true);
                            setThemeListOpen(true);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          <Tag className="h-3.5 w-3.5 text-gray-400" />
                          Add themes
                        </button>
                      )}
                    </div>
                    <div
                      className={
                        aiNoteReady ? "animate-fade-in-up" : ""
                      }
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">
                          Nota
                        </label>
                        {generatingNote && (
                          <span className="flex items-center gap-1 text-[11px] italic text-gray-500 animate-pulse">
                            L’AI sta generando una nota
                            <span className="inline-flex gap-0.5">
                              <span className="animate-bounce [animation-delay:0ms]">.</span>
                              <span className="animate-bounce [animation-delay:150ms]">.</span>
                              <span className="animate-bounce [animation-delay:300ms]">.</span>
                            </span>
                          </span>
                        )}
                        {aiNoteReady && (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              Suggerito da AI
                            </span>
                            <button
                              onClick={() => generateAiNote(variant + 1, false)}
                              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Rigenera
                            </button>
                          </div>
                        )}
                        {!aiNoteReady && !generatingNote && userTyped && (
                          <div className="relative">
                            <button
                              onClick={async () => {
                                if (note.trim()) {
                                  setGeneratingNote(true);
                                  const p = await fetchAiNote(quote, 0);
                                  setGeneratingNote(false);
                                  setPreviewSuggestion(p);
                                  setShowAiConfirm(true);
                                } else generateAiNote(0, false);
                              }}
                              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                            >
                              <Sparkles className="h-3 w-3" />
                              Genera
                            </button>
                            {showAiConfirm && previewSuggestion !== null && (
                              <div className="absolute right-0 top-6 z-20 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg animate-fade-in-up">
                                <p className="mb-1.5 text-[11px] font-semibold text-gray-700">
                                  Nota suggerita dall’AI
                                </p>
                                <p className="mb-2 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-700">
                                  {previewSuggestion}
                                </p>
                                <p className="mb-2 text-[11px] text-gray-500">
                                  Il testo che hai scritto verrà sostituito.
                                </p>
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setShowAiConfirm(false);
                                      setPreviewSuggestion(null);
                                    }}
                                    className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100"
                                  >
                                    Annulla
                                  </button>
                                  <button
                                    onClick={() =>
                                      generateAiNote(0, true, previewSuggestion)
                                    }
                                    className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                                  >
                                    Sovrascrivi
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <AutoTextarea
                        value={note}
                        onChange={(e) => {
                          setNote(e.target.value);
                          setUserTyped(true);
                          userTypedRef.current = true;
                          setAiNoteReady(false);
                          setShowAiConfirm(false);
                          setPreviewSuggestion(null);
                          setGeneratingNote(false);
                          if (aiNoteTimerRef.current) {
                            clearTimeout(aiNoteTimerRef.current);
                            aiNoteTimerRef.current = null;
                          }
                        }}
                        minRows={2}
                        placeholder="Nota - con suggerimento di testo"
                        className={`w-full rounded-md border p-2 text-xs outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors duration-500 ${
                          aiNoteReady
                            ? "border-blue-300 bg-blue-50/30"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                    <div className="mb-3" />

                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Quote*
                    </label>
                    <AutoTextarea
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      placeholder={
                        recording ? "Capturing transcript…" : undefined
                      }
                      minRows={1}
                      className="mb-3 w-full rounded-md border border-gray-200 bg-gray-100 p-2 text-xs text-gray-600 outline-none placeholder:text-gray-400 placeholder:italic focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />



                    {/* Severity */}
                    <div className="mb-4" data-sev-picker>
                      {showSeverity ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {SEVERITY_OPTIONS.map((s) => {
                            const active = severity === s;
                            return (
                              <button
                                key={s}
                                role="radio"
                                aria-checked={active}
                                onClick={() => {
                                  setSeverity(active ? null : s);
                                  setShowSeverity(false);
                                }}
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                                  active
                                    ? `${severityStrongBorderClass(s)} ${severityClass(s)} bg-white`
                                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <span
                                  className={`flex h-3 w-3 items-center justify-center rounded-full border ${active ? severityStrongBorderClass(s) : "border-gray-300"}`}
                                >
                                  {active && (
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${severityFillClass(s)}`}
                                    />
                                  )}
                                </span>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      ) : severity ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${severityStrongBorderClass(severity)} ${severityClass(severity)}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${severityFillClass(severity)}`}
                          />
                          {severity}
                          <button
                            onClick={() => setSeverity(null)}
                            className="text-gray-400 hover:text-gray-700"
                            aria-label="Rimuovi severity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowSeverity(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
                          Add severity
                        </button>
                      )}
                    </div>


                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={requestClose}
                        disabled={isSaving}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={save}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-transform duration-200 hover:bg-blue-700 ${isSaving ? "scale-95 opacity-90" : ""}`}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Salvataggio…
                          </>
                        ) : (
                          "Add highlight"
                        )}
                      </button>
                    </div>
                  </div>
                    );
                    return draftSlot ? createPortal(panel, draftSlot) : null;
                  })()}


        </section>

        {/* Right column */}
        <aside className="w-2/5 overflow-y-auto rounded-xl border bg-white shadow-sm">
          {/* Top section (scrolls away) */}
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{media?.participant ?? "Nome partecipante"}</h2>
              <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold">Executive summary</h3>
              {summaryLoading && !execSummary ? (
                <div className="space-y-2" aria-label="Generazione del riassunto">
                  <p className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    L'AI sta analizzando il video…
                  </p>
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-11/12 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                </div>
              ) : summaryError && !execSummary ? (
                <p className="text-sm text-gray-500">
                  {summaryError}{" "}
                  <button
                    onClick={() => void loadSummary(summaryVariant)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Riprova
                  </button>
                </p>
              ) : execSummary ? (
                <>
                  <p
                    className={`text-sm leading-relaxed text-gray-700 transition-opacity ${summaryLoading ? "opacity-50" : ""}`}
                  >
                    {(() => {
                      let n = 0;
                      return execSummary.summary.map((s, i) => {
                        const c = s.citation;
                        const num = c ? ++n : 0;
                        return (
                          <span key={i}>
                            {s.text.replace(/\s*[.]\s*$/, "")}
                            {c && (
                              <span
                                className="relative inline-block"
                                onMouseEnter={() => setCiteTip(i)}
                                onMouseLeave={() => setCiteTip(null)}
                              >
                                <button
                                  onClick={() => goToCitation(c.quote)}
                                  aria-label={`Vai alla citazione ${num}`}
                                  className="mx-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 align-middle text-[10px] font-semibold text-blue-700 hover:bg-blue-600 hover:text-white"
                                >
                                  {num}
                                </button>
                                {citeTip === i && (
                                  <span className="absolute bottom-full left-1/2 z-30 w-64 -translate-x-1/2 pb-2">
                                    <button
                                      onClick={() => goToCitation(c.quote)}
                                      className="animate-fade-in-up block w-full rounded-lg border bg-white p-2.5 text-left shadow-lg hover:border-blue-300"
                                    >
                                      <span className="mb-1 block text-[10px] font-semibold text-gray-400">
                                        Partecipante · {c.time}
                                      </span>
                                      <span className="block rounded-md bg-gray-100 px-2 py-1.5 text-xs leading-snug text-gray-700">
                                        “{c.quote}”
                                      </span>
                                      <span className="mt-1.5 block text-[10px] font-medium text-blue-600">
                                        Vai al transcript
                                      </span>
                                    </button>
                                  </span>
                                )}
                              </span>
                            )}
                            {". "}
                          </span>
                        );
                      });
                    })()}
                  </p>
                  {execSummary.themes.length > 0 && (
                    <div>
                      <p className="mb-1 text-sm font-semibold">Temi predominanti</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                        {execSummary.themes.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-1 text-gray-500">
              {[RefreshCw, Copy, Share2, ThumbsUp, ThumbsDown].map(
                (Icon, i) => (
                  <button
                    key={i}
                    disabled={i === 0 && summaryLoading}
                    onClick={
                      i === 0
                        ? () => {
                            const v = summaryVariant + 1;
                            setSummaryVariant(v);
                            void loadSummary(v);
                          }
                        : undefined
                    }
                    aria-label={i === 0 ? "Rigenera riassunto" : undefined}
                    className="rounded-md p-2 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  >
                    <Icon className={`h-4 w-4 ${i === 0 && summaryLoading ? "animate-spin" : ""}`} />
                  </button>
                ),
              )}
            </div>
          </div>

          <hr />

          {/* Sticky filters */}
          <div className="sticky top-0 z-10 border-b bg-white px-4 pt-4 pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">
                Highlights: {items.length}
              </h3>
              <button className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100">
                <Sparkles className="h-3 w-3" />
                Let AI detect highlights
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sevCounts
                .filter(({ count }) => count > 0)
                .map(({ label, count }) => {
                  const sevKey = label === "Observation" ? "" : label;
                  const on = sevFilter.includes(sevKey);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleSevFilter(sevKey)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        on
                          ? `bg-gray-900 text-white ${severityStrongBorderClass(sevKey)}`
                          : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${severityFillClass(sevKey)}`}
                      />
                      {label}
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-semibold ${
                          on ? "bg-white/20" : "bg-white text-gray-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

              {themeFilter.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleThemeFilter(t)}
                  className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {t}
                  <X className="h-3 w-3" />
                </button>
              ))}

              <div className="relative" ref={themeFilterRef}>
                <button
                  type="button"
                  aria-label="Filtra per tema"
                  onClick={() => setThemeFilterOpen((v) => !v)}
                  className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border transition-colors ${
                    themeFilterOpen || themeFilter.length
                      ? "border-blue-300 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                </button>
                {themeFilterOpen && (
                  <div className="absolute right-0 z-50 mt-1 max-h-56 w-56 overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                    <p className="px-2 py-1 text-[11px] font-semibold text-gray-400">
                      Filtra per tema
                    </p>
                    {allThemes.length === 0 && (
                      <p className="px-2 py-2 text-xs text-gray-400">
                        Nessun tema disponibile
                      </p>
                    )}
                    {allThemes.map((t) => (
                      <label
                        key={t}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={themeFilter.includes(t)}
                          onChange={() => toggleThemeFilter(t)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                        />
                        <span className="flex-1 truncate">{t}</span>
                        <span className="text-[10px] text-gray-400">
                          {themeCount(t)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {(sevFilter.length > 0 || themeFilter.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSevFilter([]);
                    setThemeFilter([]);
                  }}
                  className="text-xs font-medium text-gray-500 underline-offset-2 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

          </div>

          {/* Highlights list */}
          <div className="flex flex-col p-4">
            {showDraft && (
              <div
                ref={(el) => setDraftSlot(el)}
                style={{ order: timeStartSeconds(selTime) }}
                className="mb-3"
              />
            )}
            {items.length === 0 && !showDraft ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
                  <Tag className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-gray-900">
                  Create your first highlight
                </h3>
                <p className="mb-5 max-w-xs text-xs leading-relaxed text-gray-500">
                  <mark className="rounded-sm bg-amber-100 px-1 text-gray-900">
                    Select text from the transcript
                  </mark>{" "}
                  or use “Start highlight” on the player to capture a key
                  moment.
                </p>
                <div className="mb-5 flex w-full items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[11px] text-gray-400">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Let AI detect highlights
                </button>
                <p className="mt-3 text-[11px] text-gray-400 italic">
                  Beta feature optimized for unmoderated tests.
                </p>
              </div>
            ) : visibleItems.length === 0 && !showDraft ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-6 py-8 text-center text-xs text-gray-500">
                Nessun highlight corrisponde ai filtri selezionati.
              </div>
            ) : (
              visibleItems.map((h) => {
              const isEditing = editingCardId === h.id;
              const cardValue = isEditing && editDraft ? editDraft : h;
              return (
              <article
                key={h.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(h.id, el);
                  else cardRefs.current.delete(h.id);
                }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button, input, a"))
                    return;
                  scrollToSpan(h.id);
                }}
                style={{ order: timeStartSeconds(h.time) }}
                className={`mb-3 cursor-pointer rounded-lg border p-3 transition-colors duration-1000 ${
                  activeCardId === h.id
                    ? "border-l-4 border-blue-500 bg-blue-50"
                    : `${severityBorderClass(h.severity)} ${
                        justAdded === h.id ? "bg-green-50" : "bg-white"
                      }`
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Seleziona highlight ${h.time}`}
                      checked={selectedIds.includes(h.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(h.id)
                            ? prev.filter((x) => x !== h.id)
                            : [...prev, h.id],
                        )
                      }
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                    />
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      {h.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    {savedFlashId === h.id && (
                      <span role="status" aria-live="polite" className="flex animate-fade-in-up items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                        <Check className="h-3 w-3" />
                        Saved
                      </span>
                    )}
                    <button aria-label="Share Highlight" className="rounded p-1 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative">
                      <button
                        aria-label="Highlight actions"
                        onClick={() =>
                          setMenuOpenId((prev) => (prev === h.id ? null : h.id))
                        }
                        className="rounded p-1 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      {menuOpenId === h.id && (
                        <div
                          ref={menuRef}
                          className="animate-popover absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                        >
                          <button
                            onClick={() => setMenuOpenId(null)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Add to insight
                          </button>
                          <button
                            onClick={() => setMenuOpenId(null)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export to jira
                          </button>
                          <button
                            onClick={() => deleteItem(h.id)}
                            className="w-full bg-red-500 px-3 py-2 text-left text-sm text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isEditing ? (
                <div>
                {/* Theme */}
                <div className="mb-3" data-theme-picker>
                  {openThemeCardId === h.id ? (
                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                        {cardValue.themes.map((t) => (
                          <span
                            key={t}
                            className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600"
                          >
                            {t}
                            <button
                              aria-label={`Remove Theme ${t}`}
                              onClick={() =>
                                setEditDraft((draft) => draft ? {
                                  ...draft,
                                  themes: draft.themes.filter((x) => x !== t),
                                } : draft)
                              }
                              className="text-gray-400 hover:text-gray-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          autoFocus
                          value={editThemeQuery}
                          onChange={(e) => setEditThemeQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setOpenThemeCardId(null);
                              setEditThemeQuery("");
                            }
                          }}
                          placeholder={cardValue.themes.length ? "" : "Cerca o crea un tema…"}
                          className="min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
                        />
                      </div>
                      <div className="absolute right-0 left-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                        {themeOptions
                          .filter((t) =>
                            t
                              .toLowerCase()
                              .includes(editThemeQuery.trim().toLowerCase()),
                          )
                          .map((t) => (
                            <button
                              key={t}
                              onClick={() =>
                                setEditDraft((draft) => draft ? {
                                  ...draft,
                                  themes: draft.themes.includes(t)
                                    ? draft.themes.filter((x) => x !== t)
                                    : [...draft.themes, t],
                                } : draft)
                              }
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                            >
                              <span
                                className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                                  cardValue.themes.includes(t)
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-300"
                                }`}
                              >
                                {cardValue.themes.includes(t) ? "✓" : ""}
                              </span>
                              {t}
                            </button>
                          ))}
                        {editThemeQuery.trim() &&
                          !themeOptions.some(
                            (t) =>
                              t.toLowerCase() ===
                              editThemeQuery.trim().toLowerCase(),
                          ) && (
                            <button
                              onClick={() => {
                                const t = editThemeQuery.trim();
                                setThemeOptions((prev) =>
                                  prev.includes(t) ? prev : [...prev, t],
                                );
                                setEditDraft((draft) => draft ? {
                                  ...draft,
                                  themes: draft.themes.includes(t)
                                    ? draft.themes
                                    : [...draft.themes, t],
                                } : draft);
                                setEditThemeQuery("");
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Crea «{editThemeQuery.trim()}»
                            </button>
                          )}
                      </div>
                    </div>
                  ) : cardValue.themes.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cardValue.themes.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600"
                        >
                          {t}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          setEditThemeQuery("");
                          setOpenThemeCardId(h.id);
                        }}
                        className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditThemeQuery("");
                        setOpenThemeCardId(h.id);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      Add themes
                    </button>
                  )}
                </div>
                {/* Note */}
                <AutoTextarea
                  inputRef={editNoteRef}
                  aria-label="Note"
                  value={cardValue.note}
                  onChange={(e) => setEditDraft((draft) => draft ? { ...draft, note: e.target.value } : draft)}
                  minRows={1}
                  placeholder="Aggiungi una nota…"
                  className="mb-2 w-full rounded-md border border-transparent bg-transparent p-1.5 text-sm leading-relaxed text-gray-700 outline-none transition hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />

                {/* Quote */}
                <AutoTextarea
                  aria-label="Quote"
                  value={cardValue.quote}
                  onChange={(e) => setEditDraft((draft) => draft ? { ...draft, quote: e.target.value } : draft)}
                  minRows={1}
                  className="mb-2 w-full rounded-md border border-gray-200 bg-gray-100 p-2 text-sm leading-relaxed text-gray-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />


                {/* Severity */}
                <div className="mb-2" data-sev-picker>
                  {openSevCardId === h.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {SEVERITY_OPTIONS.map((s) => {
                        const active = cardValue.severity === s;
                        return (
                          <button
                            key={s}
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              setEditDraft((draft) => draft ? { ...draft, severity: active ? "" : s } : draft);
                              setOpenSevCardId(null);
                            }}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                              active
                                ? `${severityStrongBorderClass(s)} ${severityClass(s)} bg-white`
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`flex h-3 w-3 items-center justify-center rounded-full border ${active ? severityStrongBorderClass(s) : "border-gray-300"}`}
                            >
                              {active && (
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${severityFillClass(s)}`}
                                />
                              )}
                            </span>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  ) : cardValue.severity ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${severityStrongBorderClass(cardValue.severity)} ${severityClass(cardValue.severity)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${severityFillClass(cardValue.severity)}`}
                      />
                      {cardValue.severity}
                      <button
                        onClick={() => setEditDraft((draft) => draft ? { ...draft, severity: "" } : draft)}
                        className="text-gray-400 hover:text-gray-700"
                        aria-label="Rimuovi severity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenSevCardId(h.id);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
                      Add severity
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={requestCancelCardEdit}>Cancel</Button>
                  <Button type="button" size="sm" onClick={saveCardEdit}>Save changes</Button>
                </div>
                </div>
                ) : (
                <div>
                  {h.themes.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Themes">
                      {h.themes.map((theme) => (
                        <span key={theme} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">{theme}</span>
                      ))}
                    </div>
                  )}
                  {h.note && <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{h.note}</p>}
                  <blockquote className="mb-2 rounded-md border border-gray-200 bg-gray-100 p-2 text-sm leading-relaxed text-gray-600">{h.quote}</blockquote>
                  {h.severity && (
                    <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${severityStrongBorderClass(h.severity)} ${severityClass(h.severity)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${severityFillClass(h.severity)}`} />
                      {h.severity}
                    </span>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="text-xs text-gray-400 italic">
                      {(h.source ?? "human") === "ai" ? "AI-assisted · Federica" : h.author}
                    </span>
                    <Button
                      ref={(el) => {
                        if (el) editButtonRefs.current.set(h.id, el);
                        else editButtonRefs.current.delete(h.id);
                      }}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => beginCardEdit(h)}
                    >
                      <Pencil /> Edit
                    </Button>
                  </div>
                </div>
                )}
              </article>
            )})
            )}
          </div>
        </aside>
      </main>

      {/* Discard modal */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <p className="mb-5 text-sm leading-relaxed text-gray-700">
              Discard highlight? Highlights are only saved when clicking “Add
              highlight”.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDiscard(false)}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Keep editing
              </button>
              <button
                onClick={discard}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <dialog
        ref={discardDialogRef}
        aria-labelledby="discard-edit-title"
        aria-describedby="discard-edit-description"
        onCancel={(event) => {
          event.preventDefault();
          setDiscardEditOpen(false);
          window.setTimeout(() => editNoteRef.current?.focus(), 0);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/60"
      >
          <div className="space-y-1.5">
            <h2 id="discard-edit-title" className="text-lg font-semibold">Discard changes?</h2>
            <p id="discard-edit-description" className="text-sm text-gray-500">
              Your unsaved changes to this Highlight will be lost.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDiscardEditOpen(false);
                window.setTimeout(() => editNoteRef.current?.focus(), 0);
              }}
              autoFocus
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDiscardEditOpen(false);
                finishCardEdit();
              }}
            >
              Discard
            </Button>
          </div>
      </dialog>

      {/* Selection drag handles */}
      {phase === "editing" &&
        handles?.map((h, i) => (
          <div
            key={i}
            data-sel-handle={i === 0 ? "start" : "end"}
            onMouseDown={startDrag(i === 0 ? "start" : "end")}
            style={{ top: h.y - 6, left: h.x - 9, height: h.h + 12 }}
            className="fixed z-50 flex w-[18px] cursor-ew-resize items-center justify-center"
          >
            <span className="h-full w-0.5 rounded-full bg-blue-500" />
            <span
              className={`absolute h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow ${
                i === 0 ? "-top-1.5" : "-bottom-1.5"
              }`}
            />
          </div>
        ))}

      {/* Edit-mode drag handles on the anchored transcript highlight */}
      {editingCardId != null &&
        editHandles?.map((h, i) => (
          <div
            key={`edit-${i}`}
            data-sel-handle={i === 0 ? "start" : "end"}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editDragRef.current = i === 0 ? "start" : "end";
            }}
            style={{ top: h.y - 6, left: h.x - 9, height: h.h + 12 }}
            className="fixed z-50 flex w-[18px] cursor-ew-resize items-center justify-center"
          >
            <span className="h-full w-0.5 rounded-full bg-blue-500" />
            <span
              className={`absolute h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow ${
                i === 0 ? "-top-1.5" : "-bottom-1.5"
              }`}
            />
          </div>
        ))}




      {/* Floating selection bar */}
      {selectedIds.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-40 flex justify-center px-12">
          <div className="pointer-events-auto flex items-center gap-8 rounded-3xl bg-slate-900 px-8 py-5 text-white shadow-xl">
            <p className="text-base font-medium">
              Highlights selected: {selectedIds.length}
            </p>
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-white/90 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => setInsightModalOpen(true)}
              className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Craft insight
            </button>
          </div>
        </div>
      )}

      <AddToInsightModal
        open={insightModalOpen}
        selectedIds={selectedIds}
        onClose={() => setInsightModalOpen(false)}
        onDone={(title) => {
          setInsightModalOpen(false);
          setSelectedIds([]);
          setInsightSnack(title);
        }}
      />

      {insightSnack && (
        <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 animate-toast items-center gap-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5 fill-emerald-600 text-emerald-50" />
            Added to “{insightSnack}”
          </span>
          <Link
            to="/themes-insights"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
          >
            Vedi insight
          </Link>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 flex animate-toast items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          Highlight salvata. Puoi modificarla in qualsiasi momento!
        </div>
      )}

      {/* AI overwrite toast with Undo */}
      {aiUndoToast && (
        <div className="fixed bottom-4 right-4 z-50 flex animate-toast items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-xs font-medium text-white shadow-lg">
          Nota sostituita dal suggerimento AI.
          <button
            onClick={undoAiOverwrite}
            className="font-bold text-white underline underline-offset-2 hover:text-gray-200"
          >
            Annulla
          </button>
        </div>
      )}

      {/* Delete toast with Undo */}
      {deleted && (
        <div className="fixed bottom-4 right-4 z-50 flex animate-toast items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-xs font-medium text-white shadow-lg">
          Highlight eliminato.
          <button
            onClick={undoDelete}
            className="font-bold text-white underline underline-offset-2 hover:text-gray-200"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
}
