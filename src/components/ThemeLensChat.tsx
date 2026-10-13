import { useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { chatTheme } from "@/lib/ai-themes.functions";
import { useObservations, type ChatMessage, type Observation } from "@/lib/observations-store";
import {
  feedbackText,
  isAi,
  quoteVerdict,
  UNCATEGORIZED,
  type useThemeLens,
} from "@/lib/theme-lens";

type Lens = ReturnType<typeof useThemeLens>;

export function ProvenanceBadge({ obs, compact = false }: { obs: Observation; compact?: boolean }) {
  return isAi(obs) ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-200">
      <Sparkles className="h-3 w-3" />
      {compact ? "AI" : "AI-generated"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200">
      <User className="h-3 w-3" />
      {compact ? "Human" : `Researcher · ${obs.author || "—"}`}
    </span>
  );
}

function QuoteReview({
  obs,
  theme,
  otherThemes,
  onMove,
  onDiscuss,
}: {
  obs: Observation;
  theme: string;
  otherThemes: string[];
  onMove: (id: number, to: string) => void;
  onDiscuss: (obs: Observation) => void;
}) {
  const { themeFeedback, addFeedback } = useObservations();
  const verdict = quoteVerdict(themeFeedback, theme, obs.id);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState(UNCATEGORIZED);

  const submitReject = () => {
    const r = reason.trim() || undefined;
    if (target === UNCATEGORIZED) {
      addFeedback({
        theme,
        kind: "reject-quote",
        highlightId: obs.id,
        quote: obs.quote,
        reason: r,
      });
    } else {
      addFeedback({
        theme,
        kind: "reassign-quote",
        highlightId: obs.id,
        quote: obs.quote,
        to: target,
        reason: r,
      });
    }
    onMove(obs.id, target);
    setRejecting(false);
  };

  return (
    <li
      className={`rounded-lg border bg-white p-3 ${isAi(obs) ? "border-dashed border-violet-300" : "border-gray-200"} ${
        verdict === "confirmed" ? "ring-1 ring-emerald-300" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <ProvenanceBadge obs={obs} />
        {verdict === "confirmed" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Belongs
          </span>
        ) : null}
      </div>
      {obs.quote ? (
        <p className="text-xs italic leading-relaxed text-gray-800">“{obs.quote}”</p>
      ) : null}
      {obs.note ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{obs.note}</p>
      ) : null}

      {rejecting ? (
        <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-2.5">
          <label
            className="block text-[11px] font-medium text-gray-700"
            htmlFor={`reason-${obs.id}`}
          >
            Why doesn't it belong?{" "}
            <span className="font-normal text-gray-400">(optional, helps the AI)</span>
          </label>
          <textarea
            id={`reason-${obs.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="E.g. it's about trust, not navigation"
            className="w-full resize-none rounded-md border border-gray-200 bg-white p-2 text-xs outline-none focus:border-slate-400"
          />
          <label
            className="block text-[11px] font-medium text-gray-700"
            htmlFor={`target-${obs.id}`}
          >
            Move it to
          </label>
          <select
            id={`target-${obs.id}`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs"
          >
            <option value={UNCATEGORIZED}>No Theme (remove from “{theme}”)</option>
            {otherThemes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setRejecting(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={submitReject}>
              Save feedback
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() =>
              addFeedback({ theme, kind: "confirm-quote", highlightId: obs.id, quote: obs.quote })
            }
            disabled={verdict === "confirmed"}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <ThumbsUp className="h-3 w-3" /> Belongs
          </button>
          <button
            onClick={() => setRejecting(true)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-red-50 hover:text-red-700"
          >
            <ThumbsDown className="h-3 w-3" /> Doesn't belong
          </button>
          <button
            onClick={() => onDiscuss(obs)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100"
          >
            <MessageSquareText className="h-3 w-3" /> Discuss
          </button>
        </div>
      )}
    </li>
  );
}

export function ThemeLensChat({
  theme,
  obs,
  lens,
  open,
  onOpenChange,
  onMove,
}: {
  theme: string;
  obs: Observation[];
  lens: Lens;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMove: (ids: number[], from: string, to: string) => void;
}) {
  const { workspaceThemes, themeFeedback, addFeedback, setThemeLens, themeChats, setThemeChats } =
    useObservations();
  const messages = themeChats[theme] ?? [];
  const feedback = themeFeedback.filter((f) => f.theme === theme);
  const otherThemes = workspaceThemes.filter((t) => t !== theme);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showOthers, setShowOthers] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const current = lens.lens;
  const coherent = new Set(current?.coherentIds ?? obs.map((o) => o.id));
  const picked = obs.filter((o) => coherent.has(o.id));
  const others = obs.filter((o) => !coherent.has(o.id));

  const setInterpretation = (text: string) => {
    setThemeLens((l) => ({
      ...l,
      [theme]: {
        interpretation: text,
        coherentIds: current?.coherentIds ?? [],
        sig: lens.sig,
        origin: "researcher",
        confirmed: true,
      },
    }));
    addFeedback({ theme, kind: "edit-interpretation", reason: text });
  };

  const push = (m: ChatMessage) =>
    setThemeChats((c) => ({ ...c, [theme]: [...(c[theme] ?? []), m] }));

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const history = [...messages, { role: "user" as const, text }];
    push({ role: "user", text });
    addFeedback({ theme, kind: "note", reason: text });
    setSending(true);
    try {
      const res = await chatTheme({
        data: {
          theme,
          interpretation: current?.interpretation ?? "",
          otherThemes,
          feedback: [...feedback.map(feedbackText), `Commento: ${text}`],
          messages: history.slice(-20).map(({ role, text: t }) => ({ role, text: t })),
          highlights: obs.map((o) => ({
            id: o.id,
            note: o.note,
            quote: o.quote,
            source: isAi(o) ? ("ai" as const) : ("human" as const),
            status: quoteVerdict(themeFeedback, theme, o.id) ?? undefined,
          })),
        },
      });
      push({ role: "assistant", text: res.reply, proposal: res.interpretation ?? undefined });
    } catch {
      push({
        role: "assistant",
        text: "AI is offline right now: I saved your message as feedback on this Theme's lens. You can still edit the interpretation and review the quotes above.",
      });
    } finally {
      setSending(false);
    }
  };

  const discuss = (o: Observation) => {
    setInput(`About the quote “${o.quote.slice(0, 80)}${o.quote.length > 80 ? "…" : ""}”: `);
    inputRef.current?.focus();
  };

  const moveOne = (id: number, to: string) => onMove([id], theme, to);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-600" /> {theme}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Check how the AI reads this Theme before it applies it to the rest of the corpus. Every
            confirmation or correction is saved as feedback.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section aria-labelledby="lens-interpretation">
            <h3
              id="lens-interpretation"
              className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              Interpretation
            </h3>
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
              {editing ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    aria-label="Theme interpretation"
                    className="w-full resize-none rounded-md border border-gray-200 bg-white p-2 text-xs outline-none focus:border-slate-400"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!draft.trim()}
                      onClick={() => {
                        setInterpretation(draft.trim());
                        setEditing(false);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {lens.loading && !current
                      ? "Reading the notes of this Theme…"
                      : (current?.interpretation ?? "—")}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {current?.confirmed ? (
                      <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Confirmed
                      </span>
                    ) : (
                      <button
                        disabled={!current}
                        onClick={() => {
                          setThemeLens((l) =>
                            l[theme] ? { ...l, [theme]: { ...l[theme], confirmed: true } } : l,
                          );
                          addFeedback({ theme, kind: "confirm-interpretation" });
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                      >
                        <ThumbsUp className="h-3 w-3" /> Looks right
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDraft(current?.interpretation ?? "");
                        setEditing(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3 w-3" /> Rewrite
                    </button>
                    <button
                      onClick={() => void lens.regenerate()}
                      disabled={lens.loading}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-white disabled:opacity-50"
                    >
                      {lens.loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Regenerate
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="lens-quotes">
            <h3
              id="lens-quotes"
              className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              Quotes the AI considers coherent ({picked.length})
            </h3>
            <p className="mb-2 text-[11px] text-gray-500">
              Confirm them, or tell the AI why one doesn't fit and where it belongs.
            </p>
            {picked.length ? (
              <ul className="space-y-2">
                {picked.map((o) => (
                  <QuoteReview
                    key={o.id}
                    obs={o}
                    theme={theme}
                    otherThemes={otherThemes}
                    onMove={moveOne}
                    onDiscuss={discuss}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-xs text-gray-500">
                No Highlights in this Theme yet.
              </p>
            )}
            {others.length ? (
              <div className="mt-3">
                <button
                  onClick={() => setShowOthers((v) => !v)}
                  className="text-[11px] font-medium text-gray-500 hover:underline"
                >
                  {showOthers ? "Hide" : "Show"} {others.length} Highlight
                  {others.length === 1 ? "" : "s"} the AI did not pick
                </button>
                {showOthers ? (
                  <ul className="mt-2 space-y-2">
                    {others.map((o) => (
                      <QuoteReview
                        key={o.id}
                        obs={o}
                        theme={theme}
                        otherThemes={otherThemes}
                        onMove={moveOne}
                        onDiscuss={discuss}
                      />
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          <section aria-labelledby="lens-chat">
            <h3
              id="lens-chat"
              className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              Conversation
            </h3>
            {messages.length === 0 ? (
              <p className="text-xs text-gray-500">
                Ask why a quote was picked, correct the meaning of the Theme, or explain what it
                should not include.
              </p>
            ) : (
              <ul className="space-y-2" aria-live="polite">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        m.role === "user" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.proposal ? (
                        <div className="mt-2 rounded-lg bg-white p-2 text-gray-800 ring-1 ring-violet-200">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                            Proposed interpretation
                          </p>
                          <p className="mt-1">{m.proposal}</p>
                          <button
                            onClick={() => setInterpretation(m.proposal ?? "")}
                            disabled={current?.interpretation === m.proposal}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                          >
                            <Check className="h-3 w-3" />
                            {current?.interpretation === m.proposal
                              ? "In use"
                              : "Use this interpretation"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
                {sending ? (
                  <li className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                  </li>
                ) : null}
              </ul>
            )}
            <div ref={endRef} />
          </section>

          {feedback.length ? (
            <details className="rounded-lg border bg-gray-50 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-gray-700">
                {feedback.length} feedback saved · guides the next AI pass on the corpus
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-gray-600">
                {feedback.map((f) => (
                  <li key={f.id}>{feedbackText(f)}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2 border-t bg-white px-5 py-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            aria-label="Message about this Theme"
            placeholder="E.g. this Theme is about missing feedback, not about navigation"
            className="min-h-0 flex-1 resize-none rounded-lg border border-gray-200 p-2 text-xs outline-none focus:border-slate-400"
          />
          {input ? (
            <button
              type="button"
              aria-label="Clear message"
              onClick={() => setInput("")}
              className="mb-1 rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <Button type="submit" size="sm" disabled={!input.trim() || sending} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
