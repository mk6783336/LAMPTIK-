import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/** Installable web app ("app + webapp"): PWA manifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LAMP TIK — TikTok Video Downloader",
    short_name: siteConfig.name,
    description:
      "Download TikTok, Instagram & Facebook videos without a watermark in HD, plus YouTube HD & MP3 in App Mode.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
