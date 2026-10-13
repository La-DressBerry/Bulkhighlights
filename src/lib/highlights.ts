export const SEVERITY_OPTIONS = ["Major issue", "Minor issue", "Positive", "Wish", "Bug"];

export function severityClass(severity: string) {
  if (!severity) return "text-gray-400";
  if (severity === "Major issue") return "text-red-600";
  if (severity === "Positive") return "text-emerald-600";
  if (severity === "Wish") return "text-blue-600";
  if (severity === "Bug") return "text-violet-600";
  return "text-amber-600";
}

export function severityBorderClass(severity: string) {
  if (!severity) return "border-gray-200";
  if (severity === "Major issue") return "border-red-400";
  if (severity === "Positive") return "border-emerald-400";
  if (severity === "Wish") return "border-blue-400";
  if (severity === "Bug") return "border-violet-400";
  return "border-amber-400";
}

export function severityFillClass(severity: string) {
  if (severity === "Major issue") return "bg-red-500";
  if (severity === "Positive") return "bg-emerald-500";
  if (severity === "Wish") return "bg-blue-500";
  if (severity === "Bug") return "bg-violet-500";
  return "bg-amber-500";
}

export type Observation = {
  id: number;
  time: string;
  themes: string[];
  note: string;
  quote: string;
  severity: string;
  author: string;
};
