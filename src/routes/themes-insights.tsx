import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  Clapperboard,
  GripVertical,
  LayoutGrid,
  List,
  MoreHorizontal,
  Palette,
  Share2,
  Sparkles,
  SquareArrowOutUpRight,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { BulkAiEntry } from "@/components/BulkAiLayer";
import { useObservations, type Observation } from "@/lib/observations-store";


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

const UNCATEGORIZED = "Uncategorized";

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

function ObservationCard({
  obs,
  theme,
  participant,
  selected,
  onToggleSelect,
  onDragStart,
  onDelete,
  onAction,
}: {
  obs: Observation;
  theme: string;
  participant?: string | undefined;
  selected: boolean;
  onToggleSelect: () => void;
  onDragStart: () => void;
  onDelete: () => void;
  onAction: (label: string) => void;
}) {
  const extra = Math.max(obs.themes.length - 1, 0);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <article
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-white p-4 ${borderColor(
        obs.severity,
      )} ${selected ? "ring-2 ring-slate-800 ring-offset-1" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label="Seleziona osservazione"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(obs.id));
              onDragStart();
            }}
            title="Trascina in un altro tema"
            aria-label="Trascina in un altro tema"
            className="cursor-grab rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        </div>
        <div ref={menuRef} className="relative">
          <button
            aria-label="Azioni osservazione"
            onClick={() => setMenu((v) => !v)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu ? (
            <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-lg border bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setMenu(false);
                  onAction("Esportato su Jira");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                <SquareArrowOutUpRight className="h-3.5 w-3.5" /> Aggiungi su Jira
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  onAction("Link condiviso copiato");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="h-3.5 w-3.5" /> Condividi
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Elimina
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {obs.note ? (
        <p className="mb-3 text-xs leading-relaxed text-gray-800">{obs.note}</p>
      ) : null}

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
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[11px] text-gray-400">{participant?.trim() || "Anonimo"}</p>
          {obs.source === "ai" ? (
            <span className="text-[10px] text-gray-400">{obs.author?.startsWith("AI-assisted") ? obs.author : "AI-assisted"}</span>
          ) : null}
        </div>
        <button className="text-[11px] font-medium text-gray-500 underline-offset-2 hover:underline">
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueClass ?? "text-gray-900"}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-400">{outOf}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {children}
    </div>
  );
}

function ThemesInsightsPage() {
  const { observations, mediaList, setObservations, workspaceThemes } = useObservations();
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [dragged, setDragged] = useState<{ id: number | string; from: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleSelect = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const deleteObs = (id: number | string) => {
    setObservations((prev) => prev.filter((o) => o.id !== id));
    setToast("Osservazione eliminata");
  };

  const moveToTheme = (targetTheme: string) => {
    if (!dragged) return;
    const { id, from } = dragged;
    setDragged(null);
    setDropTarget(null);
    if (from === targetTheme) return;
    setObservations((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        // Spostando l'osservazione in un altro accordion, essa assume
        // esattamente il tema di destinazione e abbandona il precedente.
        const nextThemes = targetTheme === UNCATEGORIZED ? [] : [targetTheme];
        return { ...o, themes: nextThemes };
      }),
    );
    setToast(`Spostata in "${targetTheme}"`);
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

  const analyzedVideos = new Set(observations.map((o) => o.videoId)).size;
  const minorCount = observations.filter((o) => o.severity === "Minor issue").length;
  const dist = (sev: string) =>
    observations.length
      ? (observations.filter((o) => o.severity === sev).length / observations.length) * 100
      : 0;

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
            {observations.length} Highlights across {ordered.length} groups
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <BulkAiEntry />
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
        {ordered.map(([theme, obs]) => {
          const expanded = open === theme;
          const positives = obs.filter((o) => o.severity === "Positive").length;
          const users = new Set(obs.map((o) => o.author)).size;
          return (
            <div
              key={theme}
              onDragOver={(e) => {
                if (!dragged) return;
                e.preventDefault();
                setDropTarget(theme);
              }}
              onDragLeave={() => setDropTarget((t) => (t === theme ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                moveToTheme(theme);
              }}
              className={`rounded-xl border border-l-4 bg-white ${
                theme === UNCATEGORIZED ? "border-l-gray-300" : accordionColor(obs)
              } ${dropTarget === theme && dragged ? "ring-2 ring-slate-800" : ""}`}
            >
              <button
                onClick={() => setOpen(expanded ? null : theme)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span onClick={(e) => e.stopPropagation()} className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                  </span>
                  <span className="text-sm font-medium text-gray-900">{theme}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {positives > 0 ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">
                      Positive Findings ({positives})
                    </span>
                  ) : null}
                  <span>/{obs.length} tot.</span>
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                    Users: {users}
                    <ChevronDown className="h-3 w-3" />
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {expanded ? (
                <div
                  className={`border-t bg-slate-50 px-4 ${
                    view === "grid"
                      ? "grid grid-cols-1 gap-4 py-4 md:grid-cols-2 xl:grid-cols-3"
                      : "flex gap-4 overflow-x-auto py-4"
                  }`}
                >
                  {obs.map((o) => (
                    <ObservationCard
                      key={`${theme}||${o.id}`}
                      obs={o}
                      theme={theme}
                      participant={mediaList.find((m) => m.id === o.videoId)?.participant}
                      selected={selected.includes(`${theme}||${o.id}`)}
                      onToggleSelect={() => toggleSelect(`${theme}||${o.id}`)}
                      onDragStart={() => setDragged({ id: o.id, from: theme })}
                      onDelete={() => deleteObs(o.id)}
                      onAction={(label) => setToast(label)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-40 flex px-12">
          <div className="pointer-events-auto flex items-center gap-8 rounded-3xl bg-slate-900 px-8 py-5 text-white shadow-xl">
            <div className="text-sm">
              <p className="text-base font-medium">Selected Observations: {selected.length}</p>
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

      {toast ? (
        <div className="fixed bottom-8 right-12 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </DashboardShell>
  );
}

