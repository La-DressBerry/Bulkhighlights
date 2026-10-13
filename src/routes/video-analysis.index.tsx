import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/video-analysis/")({
  head: () => ({
    meta: [
      { title: "Open video analysis — UX Research Platform" },
      { name: "description", content: "Open a research video to inspect its transcript and create Highlights." },
      { property: "og:title", content: "Open video analysis — UX Research Platform" },
      { property: "og:description", content: "Open a research video to inspect its transcript and create Highlights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/video-analysis/$mediaId", params: { mediaId: "1" } });
  },
});
