"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { promptAppInstall } from "@/components/install-pwa";
import { triggerDownloadMonetization } from "@/lib/monetization";
import { androidApp } from "@/lib/site";

/**
 * Header install CTA — the SnapTik-style "📲 Install App" button.
 *
 * The old control said "Open downloader" while the visitor was already on the
 * downloader, which is a dead end. This one always does something useful:
 *
 *   • Android + Chrome      → the native PWA install prompt, straight into the
 *                             app shell with no store round-trip.
 *   • Android, no prompt    → downloads the signed APK (`/api/apk`).
 *   • Desktop / iOS         → opens /app-download, where the APK button and the
 *                             iOS Add-to-Home-Screen guide live.
 */
export function InstallAppButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    const isAndroid =
      typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");

    try {
      // Captured in InstallPwa; resolves false when the browser has no prompt
      // (iOS Safari, desktop Firefox, or a dismissed install).
      const accepted = await promptAppInstall();
      if (accepted) return;

      if (isAndroid) {
        triggerDownloadMonetization();
        const anchor = document.createElement("a");
        anchor.href = "/api/apk";
        anchor.download = androidApp.downloadName;
        anchor.rel = "noopener";
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      router.push("/app-download");
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Install the LAMP TIK app (v${androidApp.version})`}
      className="btn btn-primary h-9 shrink-0 gap-1.5 px-3 text-sm font-semibold sm:px-3.5"
    >
      <span aria-hidden="true" className="text-[15px] leading-none">
        📲
      </span>
      <span className="whitespace-nowrap">
        Install<span className="hidden sm:inline">&nbsp;App</span>
      </span>
    </button>
  );
}
