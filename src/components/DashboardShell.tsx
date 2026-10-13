import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pencil, Upload } from "lucide-react";

export function DashboardShell({ children }: { children: ReactNode }) {
  const tab =
    "border-b-2 px-1 pb-3 text-sm font-medium transition-colors";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-12 pt-5">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Testino200n</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Processi interni - Tool per interviste</h1>
              <button
                aria-label="Rinomina"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-gray-800">
              <Upload className="h-3.5 w-3.5" />
              Upload media
            </button>
          </div>
          <nav className="mt-5 flex items-center gap-6">
            <Link
              to="/media-list"
              className={tab}
              activeProps={{ className: "border-black text-gray-900" }}
              inactiveProps={{
                className: "border-transparent text-gray-500 hover:text-gray-800",
              }}
            >
              Media list
            </Link>
            <Link
              to="/themes-insights"
              className={tab}
              activeProps={{ className: "border-black text-gray-900" }}
              inactiveProps={{
                className: "border-transparent text-gray-500 hover:text-gray-800",
              }}
            >
              Themes and insights
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-12 py-6">{children}</main>
    </div>
  );
}
