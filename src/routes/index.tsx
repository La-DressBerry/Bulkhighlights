import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Research workspace — UX Research Platform" },
      { name: "description", content: "Open your research workspace to analyze videos, create Highlights and organize Themes." },
      { property: "og:title", content: "Research workspace — UX Research Platform" },
      { property: "og:description", content: "Open your research workspace to analyze videos, create Highlights and organize Themes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/media-list" });
  },
});
