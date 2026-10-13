import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Play } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { BulkAiEntry } from "@/components/BulkAiLayer";
import { severityClass } from "@/lib/highlights";
import { useObservations } from "@/lib/observations-store";

export const Route = createFileRoute("/media-list")({
  head: () => ({
    meta: [
      { title: "Media list — UX Research Platform" },
      {
        name: "description",
        content: "All uploaded research sessions with duration, test date and severity badges.",
      },
      { property: "og:title", content: "Media list — UX Research Platform" },
      {
        property: "og:description",
        content: "All uploaded research sessions with duration, test date and severity badges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MediaListPage,
});

function MediaListPage() {
  const navigate = useNavigate();
  const { mediaList, observations } = useObservations();

  const totals = observations.reduce<Record<string, number>>((acc, o) => {
    const key = o.severity || "Observation";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardShell>
      <div className="mb-4 empty:hidden"><BulkAiEntry initialOnly /></div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {mediaList.length} media uploaded
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
          Unknown device {mediaList.length}
        </span>
        {Object.entries(totals).map(([label, count]) => (
          <span
            key={label}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
          >
            {label} {count}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs font-medium text-gray-500">
          <span>Device: Unknown device ({mediaList.length})</span>
          <div className="flex items-center gap-8">
            <span className="w-16 text-right">Duration</span>
            <span className="w-24 text-right">Test date</span>
            <span className="w-12 text-right">Actions</span>
          </div>
        </div>

        {mediaList.map((m) => {
          const own = observations.filter((o) => o.videoId === m.id);
          const counts = own.reduce<Record<string, number>>((acc, o) => {
            const key = o.severity || "Observation";
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate({ to: "/video-analysis/$mediaId", params: { mediaId: String(m.id) } })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigate({ to: "/video-analysis/$mediaId", params: { mediaId: String(m.id) } });
              }}
              className="flex cursor-pointer items-center justify-between border-b px-4 py-3 last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-20 items-center justify-center rounded-md bg-black text-white/70">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">Participant: {m.participant}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(counts).map(([label, count]) => (
                      <span
                        key={label}
                        className={`rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium ${
                          label === "Observation" ? "text-gray-500" : severityClass(label)
                        }`}
                      >
                        {label} {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8 text-xs text-gray-600">
                <span className="w-16 text-right">{m.duration}</span>
                <span className="w-24 text-right">{m.date}</span>
                <span className="flex w-12 justify-end">
                  <button
                    aria-label="Azioni"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
