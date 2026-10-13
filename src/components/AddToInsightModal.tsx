import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { useObservations } from "@/lib/observations-store";

type Props = {
  open: boolean;
  selectedIds: number[];
  onClose: () => void;
  onDone: (title: string) => void;
};

export function AddToInsightModal({ open, selectedIds, onClose, onDone }: Props) {
  const { insights, setInsights } = useObservations();
  const [step, setStep] = useState<"pick" | "create">("pick");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    if (open) {
      setStep("pick");
      setQuery("");
      setTitle("");
      setSubtitle("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const n = selectedIds.length;
  const filtered = insights.filter((i) =>
    i.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const addTo = (id: number) => {
    const target = insights.find((i) => i.id === id);
    if (!target) return;
    setInsights((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, highlightIds: Array.from(new Set([...i.highlightIds, ...selectedIds])) }
          : i,
      ),
    );
    onDone(target.title);
  };

  const create = () => {
    const t = title.trim();
    if (!t) return;
    setInsights((prev) => [
      ...prev,
      { id: Date.now(), title: t, subtitle: subtitle.trim(), highlightIds: [...selectedIds] },
    ]);
    onDone(t);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in-up"
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-5 top-5 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X className="h-5 w-5" />
        </button>

        {step === "pick" ? (
          <>
            <div className="px-8 pb-6 pt-8">
              <h2 className="text-2xl font-bold text-gray-900">Add to Insight</h2>
              <p className="mt-1 text-sm text-gray-500">{n} highlights selected</p>
              <button
                onClick={() => setStep("create")}
                className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Plus className="h-5 w-5 text-gray-800" />
                </span>
                <span className="flex-1 text-base font-semibold text-gray-900">
                  Create new Insight
                </span>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="min-h-[220px] flex-1 overflow-y-auto border-t border-gray-200 bg-gray-50 px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Or select a pre-existing Insight
                </h3>
                <label className="flex w-56 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find Insight"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </label>
              </div>
              <div className="mt-4 space-y-3">
                {filtered.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => addTo(i.id)}
                    className="flex w-full items-center rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-gray-300 hover:shadow-sm"
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{i.title}</span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {i.highlightIds.length} linked highlights
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">
                    {insights.length === 0
                      ? "Nessun insight ancora creato."
                      : "Nessun insight corrisponde alla ricerca."}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="px-8 pb-8 pt-6">
            <button
              onClick={() => setStep("pick")}
              aria-label="Indietro"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="mt-5 text-2xl font-bold text-gray-900">Create new Insight</h2>
            <label className="mt-6 block text-sm font-medium text-gray-500">
              Title<span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            />
            <label className="mt-5 block text-sm font-medium text-gray-500">Subtitle</label>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            />
            <p className="mt-4 text-sm text-gray-500">
              {n} highlights will be linked to this insight.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={create}
                disabled={!title.trim()}
                className="rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={onClose}
                className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
