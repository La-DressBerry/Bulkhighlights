import { Tag, Pencil, Share2, MoreHorizontal } from "lucide-react";
import {
  severityBorderClass,
  severityClass,
  type Observation,
} from "@/lib/highlights";

export function HighlightCard({ obs }: { obs: Observation }) {
  return (
    <div
      className={`rounded-lg border-l-4 border border-gray-200 bg-white p-3 ${severityBorderClass(
        obs.severity,
      )}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Tag className="h-3.5 w-3.5" />
          <span>{obs.time}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Pencil className="h-3.5 w-3.5" />
          <Share2 className="h-3.5 w-3.5" />
          <MoreHorizontal className="h-3.5 w-3.5" />
        </div>
      </div>

      {obs.note ? <p className="mb-2 text-sm text-gray-800">{obs.note}</p> : null}

      {obs.quote ? (
        <p className="mb-2 rounded-md bg-gray-50 p-2 text-xs italic text-gray-600">
          {obs.quote}
        </p>
      ) : null}

      {obs.themes.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {obs.themes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs">
        {obs.severity ? (
          <span className={`font-medium ${severityClass(obs.severity)}`}>
            {obs.severity}
          </span>
        ) : (
          <span />
        )}
        <span className="italic text-gray-400">{obs.author}</span>
      </div>
    </div>
  );
}
