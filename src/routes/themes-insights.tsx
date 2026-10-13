import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Clapperboard,
  GripVertical,
  LayoutGrid,
  List,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  SquareArrowOutUpRight,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { BulkAiEntry } from "@/components/BulkAiLayer";
import { ProvenanceBadge, ThemeLensChat } from "@/components/ThemeLensChat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useObservations, type Observation } from "@/lib/observations-store";
import { isAi, UNCATEGORIZED, useThemeLens } from "@/lib/theme-lens";

export const Route = createFileRoute("/themes-insights")({
  head: () => ({
    meta: [
      { title: "Themes and insights — UX Research Platform" },
      {
        name: "description",
        content: "Recurring Themes, test progress and grouped Highlights across all sessions.",
      },
      { property: "og:title", content: "Themes and insights — UX Research Platform" },
      {
        property: "og:description",
        content: "Recurring Themes, test progress and grouped Highlights across all sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThemesInsightsPage,
});

function borderColor(severity: string) {
  if (!severity) return "border-gray-300";
  if (severity === "Major issue") return "border-red-400";
  if (severity === "Positive") return "border-emerald-400";
  if (severity === "Wish") return "border-blue-400";
  if (severity === "Bug") return "border-violet-400";
  return "border-amber-400";
}

function badgeColor(severity: string) {
  if (!severity) return "bg-gray-100 text-gray-600";
  if (severity === "Major issue") return "bg-red-50 text-red-600";
  if (severity === "Positive") return "bg-emerald-50 text-emerald-600";
  if (severity === "Wish") return "bg-blue-50 text-blue-600";
  if (severity === "Bug") return "bg-violet-50 text-violet-600";
  return "bg-amber-50 text-amber-600";
}

// Severity predominante (maggioranza assoluta); null se miste senza maggioranza.
function dominantSeverity(obs: Observation[]): string | null {
  const counts = new Map<string, number>();
  for (const o of obs) {
    const key = o.severity || "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let top: string | null = null;
  let topCount = 0;
  for (const [sev, count] of counts) {
    if (count > topCount) {
      top = sev;
      topCount = count;
    }
  }
  if (!top || topCount <= obs.length / 2) return null;
  return top;
}

function accordionColor(obs: Observation[]) {
  const top = dominantSeverity(obs);
  if (!top) return "border-l-gray-300 bg-white";
  if (top === "Major issue") return "border-l-red-400 bg-red-50/40";
  if (top === "Positive") return "border-l-emerald-400 bg-emerald-50/40";
  if (top === "Wish") return "border-l-blue-400 bg-blue-50/40";
  if (top === "Bug") return "border-l-violet-400 bg-violet-50/40";
  return "border-l-amber-400 bg-amber-50/40";
}

function severityDot(severity: string | null) {
  if (!severity) return "bg-gray-300";
  if (severity === "Major issue") return "bg-red-400";
  if (severity === "Positive") return "bg-emerald-400";
  if (severity === "Wish") return "bg-blue-400";
  if (severity === "Bug") return "bg-violet-400";
  return "bg-amber-400";
}

function severityLabel(severity: string) {
  if (!severity) return "No severity";
  if (severity === "Positive") return "Positive Finding";
  return severity;
}

/** Theme targets for moving Highlights; includes a quick "new Theme" field. */
function MoveTargets({ exclude, onPick }: { exclude?: string; onPick: (theme: string) => void }) {
  const { workspaceThemes } = useObservations();
  const [name, setName] = useState("");
  const targets = workspaceThemes.filter((t) => t !== exclude);
  return (
    <>
      {targets.map((t) => (
        <DropdownMenuItem key={t} onSelect={() => onPick(t)} className="text-xs">
          {t}
        </DropdownMenuItem>
      ))}
      {exclude !== UNCATEGORIZED ? (
        <DropdownMenuItem onSelect={() => onPick(UNCATEGORIZED)} className="text-xs text-gray-500">
          No Theme ({UNCATEGORIZED})
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <form
        className="flex items-center gap-1 px-1.5 py-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onPick(name.trim());
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="New Theme…"
          aria-label="New Theme name"
          className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          aria-label="Create and move"
          disabled={!name.trim()}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>
    </>
  );
}

function ObservationCard({
  obs,
  theme,
  participant,
  selected,
  onToggleSelect,
  onDragStart,
  onDelete,
  onMove,
  onAction,
}: {
  obs: Observation;
  theme: string;
  participant?: string | undefined;
  selected: boolean;
  onToggleSelect: () => void;
  onDragStart: () => void;
  onDelete: () => void;
  onMove: (to: string) => void;
  onAction: (label: string) => void;
}) {
  const extra = Math.max(obs.themes.length - 1, 0);
  const ai = isAi(obs);

  return (
    <article
      className={`flex w-72 shrink-0 flex-col rounded-xl border p-4 ${borderColor(obs.severity)} ${
        ai ? "border-dashed bg-violet-50/30" : "bg-white"
      } ${selected ? "ring-2 ring-slate-800 ring-offset-1" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="checkbox"
            aria-label="Select Highlight"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 shrink-0 rounded border-gray-300"
          />
          <span
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(obs.id));
              onDragStart();
            }}
            title="Drag to another Theme"
            aria-label="Drag to another Theme"
            className="shrink-0 cursor-grab rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <ProvenanceBadge obs={obs} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Highlight actions"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Move to Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <MoveTargets exclude={theme} onPick={onMove} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              className="gap-2 text-xs"
              onSelect={() => onAction("Exported to Jira")}
            >
              <SquareArrowOutUpRight className="h-3.5 w-3.5" /> Add to Jira
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              onSelect={() => onAction("Share link copied")}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-xs text-red-600 focus:bg-red-50 focus:text-red-700"
              onSelect={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {obs.note ? <p className="mb-3 text-xs leading-relaxed text-gray-800">{obs.note}</p> : null}

      {obs.quote ? (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="line-clamp-3 text-xs leading-relaxed text-gray-700">{obs.quote}</p>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {obs.themes.length > 0 ? (
          obs.themes.map((t) => (
            <span
              key={t}
              className={`rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 ${
                t === theme ? "font-medium" : ""
              }`}
            >
              {t}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            {theme}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeColor(obs.severity)}`}
        >
          {severityLabel(obs.severity)}
        </span>
        {extra > 0 ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            +{extra}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <p className="truncate text-[11px] text-gray-400">
          {participant?.trim() || "Anonimo"}
          {ai
            ? ` · accepted by ${obs.author?.replace(/^AI-assisted\s*·?\s*/, "") || "Federica"}`
            : ""}
        </p>
        <button className="shrink-0 text-[11px] font-medium text-gray-500 underline-offset-2 hover:underline">
          Show more
        </button>
      </div>
    </article>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  title,
  value,
  valueClass,
  outOf,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  value: string;
  valueClass?: string;
  outOf: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <p
            className={`mt-2 text-3xl font-semibold tracking-tight ${valueClass ?? "text-gray-900"}`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-400">{outOf}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {children}
    </div>
  );
}

type Provenance = "all" | "human" | "ai";

function ThemeRow({
  theme,
  obs,
  visible,
  view,
  expanded,
  onToggleExpand,
  selected,
  onToggleSelect,
  onSelectTheme,
  dragged,
  dropTarget,
  setDragged,
  setDropTarget,
  onMove,
  onDelete,
  onRenamed,
  onAction,
}: {
  theme: string;
  /** All Highlights of the Theme (used for the interpretation). */
  obs: Observation[];
  /** Highlights shown with the current provenance filter. */
  visible: Observation[];
  view: "list" | "grid";
  expanded: boolean;
  onToggleExpand: () => void;
  selected: string[];
  onToggleSelect: (key: string) => void;
  onSelectTheme: (keys: string[], on: boolean) => void;
  dragged: { id: number; from: string } | null;
  dropTarget: string | null;
  setDragged: (d: { id: number; from: string } | null) => void;
  setDropTarget: (fn: (t: string | null) => string | null) => void;
  onMove: (ids: number[], from: string, to: string) => void;
  onDelete: (ids: number[]) => void;
  onRenamed: (from: string, to: string) => void;
  onAction: (label: string) => void;
}) {
  const { mediaList, renameTheme } = useObservations();
  const lens = useThemeLens(theme, obs);
  const [chatOpen, setChatOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(theme);
  const keyOf = (o: Observation) => `${theme}||${o.id}`;
  const keys = visible.map(keyOf);
  const selCount = keys.filter((k) => selected.includes(k)).length;
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (checkboxRef.current)
      checkboxRef.current.indeterminate = selCount > 0 && selCount < keys.length;
  }, [selCount, keys.length]);

  const positives = obs.filter((o) => o.severity === "Positive").length;
  const users = new Set(obs.map((o) => o.videoId)).size;
  const aiCount = obs.filter(isAi).length;
  const humanCount = obs.length - aiCount;
  const isUncategorized = theme === UNCATEGORIZED;

  const commitRename = () => {
    setRenaming(false);
    const clean = name.trim();
    if (!clean || clean === theme) return setName(theme);
    const final = renameTheme(theme, clean);
    onRenamed(theme, final);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!dragged) return;
        e.preventDefault();
        setDropTarget(() => theme);
      }}
      onDragLeave={() => setDropTarget((t) => (t === theme ? null : t))}
      onDrop={(e) => {
        e.preventDefault();
        if (dragged && dragged.from !== theme) onMove([dragged.id], dragged.from, theme);
        setDragged(null);
        setDropTarget(() => null);
      }}
      className={`rounded-xl border border-l-4 bg-white ${
        isUncategorized ? "border-l-gray-300" : accordionColor(obs)
      } ${dropTarget === theme && dragged ? "ring-2 ring-slate-800" : ""}`}
    >
      <div className="flex w-full items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <input
            ref={checkboxRef}
            type="checkbox"
            aria-label={`Select all Highlights in ${theme}`}
            checked={keys.length > 0 && selCount === keys.length}
            disabled={!keys.length}
            onChange={(e) => onSelectTheme(keys, e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {renaming ? (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitRename();
                  }}
                >
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setName(theme);
                        setRenaming(false);
                      }
                    }}
                    aria-label="Theme name"
                    className="w-64 rounded-md border border-slate-400 px-2 py-0.5 text-sm font-medium outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Save name"
                    onMouseDown={(e) => e.preventDefault()}
                    className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel rename"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setName(theme);
                      setRenaming(false);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    onClick={onToggleExpand}
                    className="text-left text-sm font-medium text-gray-900 hover:underline"
                  >
                    {theme}
                  </button>
                  {!isUncategorized ? (
                    <button
                      aria-label={`Rename ${theme}`}
                      title="Rename Theme"
                      onClick={() => {
                        setName(theme);
                        setRenaming(true);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </>
              )}
              {obs.length ? (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span
                    className="inline-flex items-center gap-0.5"
                    title="Created by the researcher"
                  >
                    <User className="h-3 w-3" /> {humanCount}
                  </span>
                  <span
                    className="inline-flex items-center gap-0.5 text-violet-700"
                    title="Generated by AI"
                  >
                    <Sparkles className="h-3 w-3" /> {aiCount}
                  </span>
                </span>
              ) : null}
            </div>

            {!isUncategorized && obs.length ? (
              <div className="mt-1.5 flex max-w-3xl flex-wrap items-start gap-x-2 gap-y-1">
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-gray-600">
                  {lens.loading && !lens.lens ? (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> Interpreting the Theme from its
                      notes…
                    </span>
                  ) : (
                    <>
                      <Sparkles
                        className="mr-1 inline h-3 w-3 -translate-y-px text-violet-500"
                        aria-hidden="true"
                      />
                      {lens.lens?.interpretation}
                      {lens.lens?.origin === "offline" ? (
                        <span className="ml-1.5 text-[10px] text-gray-400">
                          (draft · AI offline)
                        </span>
                      ) : null}
                      {lens.lens?.confirmed ? (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="h-3 w-3" /> confirmed
                        </span>
                      ) : null}
                      {lens.stale ? (
                        <span className="ml-1.5 text-[10px] text-amber-700">
                          Highlights changed since · review in chat
                        </span>
                      ) : null}
                    </>
                  )}
                </p>
                <button
                  onClick={() => setChatOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100"
                >
                  <MessageSquareText className="h-3 w-3" /> Review with AI
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
          {positives > 0 ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              Positive Findings ({positives})
            </span>
          ) : null}
          <span>/{obs.length} tot.</span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1">Users: {users}</span>
          <button
            aria-label={expanded ? `Collapse ${theme}` : `Expand ${theme}`}
            aria-expanded={expanded}
            onClick={onToggleExpand}
            className="rounded p-1 hover:bg-gray-100"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {expanded ? (
        <div
          className={`border-t bg-slate-50 px-4 ${
            view === "grid"
              ? "grid grid-cols-1 gap-4 py-4 md:grid-cols-2 xl:grid-cols-3"
              : "flex gap-4 overflow-x-auto py-4"
          }`}
        >
          {visible.length ? (
            visible.map((o) => (
              <ObservationCard
                key={keyOf(o)}
                obs={o}
                theme={theme}
                participant={mediaList.find((m) => m.id === o.videoId)?.participant}
                selected={selected.includes(keyOf(o))}
                onToggleSelect={() => onToggleSelect(keyOf(o))}
                onDragStart={() => setDragged({ id: o.id, from: theme })}
                onDelete={() => onDelete([o.id])}
                onMove={(to) => onMove([o.id], theme, to)}
                onAction={onAction}
              />
            ))
          ) : (
            <p className="py-2 text-xs text-gray-500">No Highlights match this filter.</p>
          )}
        </div>
      ) : null}

      {!isUncategorized ? (
        <ThemeLensChat
          theme={theme}
          obs={obs}
          lens={lens}
          open={chatOpen}
          onOpenChange={setChatOpen}
          onMove={onMove}
        />
      ) : null}
    </div>
  );
}

function ThemesInsightsPage() {
  const { observations, mediaList, setObservations, setInsights, workspaceThemes, addTheme } =
    useObservations();
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [provenance, setProvenance] = useState<Provenance>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [undo, setUndo] = useState<{
    label: string;
    items: { obs: Observation; index: number }[];
  } | null>(null);
  const [dragged, setDragged] = useState<{ id: number; from: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 7000);
    return () => clearTimeout(t);
  }, [undo]);

  const toggleSelect = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const selectTheme = (keys: string[], on: boolean) =>
    setSelected((prev) =>
      on ? [...new Set([...prev, ...keys])] : prev.filter((k) => !keys.includes(k)),
    );

  const deleteMany = (ids: number[]) => {
    const drop = new Set(ids);
    const items = observations.flatMap((o, index) => (drop.has(o.id) ? [{ obs: o, index }] : []));
    if (!items.length) return;
    setObservations((prev) => prev.filter((o) => !drop.has(o.id)));
    setInsights((prev) =>
      prev.map((i) => ({ ...i, highlightIds: i.highlightIds.filter((id) => !drop.has(id)) })),
    );
    setSelected((prev) => prev.filter((k) => !drop.has(Number(k.split("||")[1]))));
    setToast(null);
    setUndo({
      label: items.length === 1 ? "Highlight deleted" : `${items.length} Highlights deleted`,
      items,
    });
  };

  const restore = () => {
    if (!undo) return;
    setObservations((prev) => {
      const next = [...prev];
      for (const { obs, index } of [...undo.items].sort((a, b) => a.index - b.index)) {
        if (!next.some((o) => o.id === obs.id)) next.splice(Math.min(index, next.length), 0, obs);
      }
      return next;
    });
    setUndo(null);
  };

  /** Moves Highlights out of `from` into `to`, keeping any other Themes they belong to. */
  const moveMany = (ids: number[], from: string, to: string) => {
    const target = to === UNCATEGORIZED ? UNCATEGORIZED : addTheme(to);
    if (target === from) return;
    setObservations((prev) =>
      prev.map((o) => {
        if (!ids.includes(o.id)) return o;
        const kept = o.themes.filter((t) => t !== from);
        return { ...o, themes: target === UNCATEGORIZED ? kept : [...new Set([...kept, target])] };
      }),
    );
    setSelected((prev) =>
      prev.filter((k) => !(k.startsWith(`${from}||`) && ids.includes(Number(k.split("||")[1])))),
    );
    setToast(`${ids.length === 1 ? "Highlight" : `${ids.length} Highlights`} moved to “${target}”`);
  };

  const moveSelected = (to: string) => {
    const byTheme = new Map<string, number[]>();
    for (const k of selected) {
      const [from = "", id] = k.split("||");
      byTheme.set(from, [...(byTheme.get(from) ?? []), Number(id)]);
    }
    for (const [from, ids] of byTheme) moveMany(ids, from, to);
    setToast(
      `${selected.length === 1 ? "Highlight" : `${selected.length} Highlights`} moved to “${to}”`,
    );
    setSelected([]);
  };

  const onRenamed = (from: string, to: string) => {
    setOpen((o) => (o === from ? to : o));
    setSelected((prev) =>
      prev.map((k) => (k.startsWith(`${from}||`) ? `${to}||${k.slice(from.length + 2)}` : k)),
    );
    setToast(`Theme renamed to “${to}”`);
  };

  const groups = new Map<string, Observation[]>();
  for (const o of observations) {
    if (o.themes.length === 0) {
      groups.set(UNCATEGORIZED, [...(groups.get(UNCATEGORIZED) ?? []), o]);
      continue;
    }
    for (const t of o.themes) {
      groups.set(t, [...(groups.get(t) ?? []), o]);
    }
  }
  // Themes created without Highlights yet still appear, so new Themes are visible everywhere.
  for (const t of workspaceThemes) if (!groups.has(t)) groups.set(t, []);
  const uncategorized = groups.get(UNCATEGORIZED) ?? [];
  const ordered: [string, Observation[]][] = [];
  if (uncategorized.length) ordered.push([UNCATEGORIZED, uncategorized]);
  ordered.push(...[...groups.entries()].filter(([k]) => k !== UNCATEGORIZED));

  const matches = (o: Observation) => provenance === "all" || (provenance === "ai") === isAi(o);
  const aiTotal = observations.filter(isAi).length;

  const analyzedVideos = new Set(observations.map((o) => o.videoId)).size;
  const minorCount = observations.filter((o) => o.severity === "Minor issue").length;
  const dist = (sev: string) =>
    observations.length
      ? (observations.filter((o) => o.severity === sev).length / observations.length) * 100
      : 0;
  const selectedIds = [...new Set(selected.map((k) => Number(k.split("||")[1])))];

  return (
    <DashboardShell>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={Clapperboard}
          iconClass="bg-blue-50 text-blue-600"
          title="Analyzed User Contributions"
          value={`${analyzedVideos} videos`}
          outOf={`out of ${mediaList.length}`}
        />
        <StatCard
          icon={Palette}
          iconClass="bg-violet-50 text-violet-600"
          title="Detected Themes"
          value={`${ordered.filter(([k]) => k !== UNCATEGORIZED).length} recurring themes`}
          outOf={`out of ${ordered.length}`}
        />
        <StatCard
          icon={TrendingUp}
          iconClass="bg-orange-50 text-orange-500"
          title="Test Progress"
          value={`${minorCount} minor issue`}
          valueClass="text-orange-500"
          outOf={`out of ${observations.length}`}
        >
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-blue-900" style={{ width: `${dist("Wish")}%` }} />
            <div className="h-full bg-emerald-500" style={{ width: `${dist("Positive")}%` }} />
            <div className="h-full bg-orange-500" style={{ width: `${dist("Minor issue")}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${dist("Major issue")}%` }} />
            <div className="h-full bg-violet-500" style={{ width: `${dist("Bug")}%` }} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
            {[
              ["Wish", "bg-blue-900"],
              ["Positive", "bg-emerald-500"],
              ["Minor", "bg-orange-500"],
              ["Major", "bg-red-500"],
              ["Bug", "bg-violet-500"],
            ].map(([label, dot]) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </StatCard>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Themes and Highlights</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {observations.length} Highlights across {ordered.length} groups ·{" "}
            {observations.length - aiTotal} by the researcher, {aiTotal} AI-generated
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <BulkAiEntry />
          <div
            role="group"
            aria-label="Filter by provenance"
            className="flex items-center rounded-lg border bg-white p-0.5 text-xs shadow-sm"
          >
            {(
              [
                ["all", "All", null],
                ["human", "Researcher", User],
                ["ai", "AI-generated", Sparkles],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                aria-pressed={provenance === value}
                onClick={() => setProvenance(value)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  provenance === value
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {Icon ? <Icon className="h-3 w-3" /> : null}
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-lg border bg-white p-0.5 shadow-sm">
            <button
              aria-label="Vista elenco"
              onClick={() => setView("list")}
              className={`rounded-md p-1.5 transition-colors ${view === "list" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              aria-label="Vista griglia"
              onClick={() => setView("grid")}
              className={`rounded-md p-1.5 transition-colors ${view === "grid" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-3">
        {ordered.map(([theme, obs]) => (
          <ThemeRow
            key={theme}
            theme={theme}
            obs={obs}
            visible={obs.filter(matches)}
            view={view}
            expanded={open === theme}
            onToggleExpand={() => setOpen(open === theme ? null : theme)}
            selected={selected}
            onToggleSelect={toggleSelect}
            onSelectTheme={selectTheme}
            dragged={dragged}
            dropTarget={dropTarget}
            setDragged={setDragged}
            setDropTarget={setDropTarget}
            onMove={moveMany}
            onDelete={deleteMany}
            onRenamed={onRenamed}
            onAction={setToast}
          />
        ))}
      </div>

      {selected.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-40 flex px-12">
          <div className="pointer-events-auto flex flex-wrap items-center gap-6 rounded-3xl bg-slate-900 px-8 py-5 text-white shadow-xl">
            <div className="text-sm">
              <p className="text-base font-medium">Selected Highlights: {selectedIds.length}</p>
              <p className="text-white/80">
                Selected Themes: {new Set(selected.map((k) => k.split("||")[0])).size}
              </p>
            </div>
            <button
              onClick={() => setSelected([])}
              className="text-sm text-white/90 hover:text-white"
            >
              Cancel
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-white/30 px-4 py-2.5 text-sm font-medium hover:bg-white/10">
                <ArrowRightLeft className="h-4 w-4" /> Move to Theme
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-60">
                <DropdownMenuLabel className="text-xs">
                  Move selected Highlights to
                </DropdownMenuLabel>
                <MoveTargets onPick={moveSelected} />
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => deleteMany(selectedIds)}
              className="flex items-center gap-1.5 rounded-full border border-red-300/50 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <button
              onClick={() => {
                setToast("Insight creato");
                setSelected([]);
              }}
              className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Craft insight
            </button>
          </div>
        </div>
      ) : null}

      {undo ? (
        <div
          role="status"
          className="fixed bottom-8 right-12 z-50 flex items-center gap-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          {undo.label}
          <button onClick={restore} className="font-medium text-emerald-300 hover:underline">
            Undo
          </button>
        </div>
      ) : toast ? (
        <div
          role="status"
          className="fixed bottom-8 right-12 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </DashboardShell>
  );
}
