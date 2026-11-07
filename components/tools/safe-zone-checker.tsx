"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageUp, Layers } from "lucide-react";

/**
 * 9:16 safe-zone overlay.
 *
 * The bands come from the apps' own chrome measured on a 1080×1920 frame: the
 * right action rail, the bottom caption/music block and the top search bar.
 * They are defined as percentages so the preview can be any size, and printed
 * in pixels so the numbers are usable in an editor.
 *
 * The image is read with `URL.createObjectURL` — nothing is uploaded and no
 * request leaves the page.
 */

interface Zone {
  id: string;
  label: string;
  left: string;
  top: string;
  width: string;
  height: string;
  px: string;
}

interface PlatformPreset {
  id: string;
  label: string;
  zones: readonly Zone[];
}

const PLATFORMS: readonly PlatformPreset[] = [
  {
    id: "tiktok",
    label: "TikTok",
    zones: [
      { id: "right", label: "Action rail", left: "80%", top: "28%", width: "20%", height: "32%", px: "216 × 614 px" },
      { id: "bottom", label: "Caption, music, nav", left: "0%", top: "80%", width: "100%", height: "20%", px: "1080 × 384 px" },
      { id: "top", label: "Search & tabs", left: "0%", top: "0%", width: "100%", height: "10%", px: "1080 × 192 px" },
    ],
  },
  {
    id: "reels",
    label: "Instagram Reels",
    zones: [
      { id: "right", label: "Action rail", left: "78%", top: "24%", width: "22%", height: "36%", px: "238 × 691 px" },
      { id: "bottom", label: "Caption & audio", left: "0%", top: "76%", width: "100%", height: "24%", px: "1080 × 461 px" },
      { id: "top", label: "Top bar", left: "0%", top: "0%", width: "100%", height: "12%", px: "1080 × 230 px" },
    ],
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    zones: [
      { id: "right", label: "Action rail", left: "80%", top: "30%", width: "20%", height: "30%", px: "216 × 576 px" },
      { id: "bottom", label: "Title & channel row", left: "0%", top: "82%", width: "100%", height: "18%", px: "1080 × 346 px" },
      { id: "top", label: "Search & camera", left: "0%", top: "0%", width: "100%", height: "10%", px: "1080 × 192 px" },
    ],
  },
];

export function SafeZoneChecker() {
  const [platformId, setPlatformId] = useState("tiktok");
  const [hiddenZones, setHiddenZones] = useState<readonly string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const preset = useMemo(
    () => PLATFORMS.find((entry) => entry.id === platformId) ?? PLATFORMS[0],
    [platformId],
  );

  useEffect(() => {
    // Revoke the previous blob when a new file replaces it.
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Choose a PNG or JPG still from your edit.");
      return;
    }
    setError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageUrl(url);
    setSource(file.name);
  }

  function toggleZone(id: string) {
    setHiddenZones((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Layers aria-hidden="true" className="size-4 text-[var(--accent-text)]" />
        <p className="text-sm font-semibold tracking-tight">Safe-zone preview</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PLATFORMS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === platformId}
            onClick={() => setPlatformId(entry.id)}
            className={
              entry.id === platformId
                ? "btn btn-primary h-8 px-3 text-xs font-semibold"
                : "btn btn-ghost h-8 px-3 text-xs"
            }
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text-2)] transition-colors hover:border-[var(--glass-border-hover)]">
            <ImageUp aria-hidden="true" className="size-4" />
            {source ? "Replace frame" : "Load a frame (stays local)"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>

          <div className="mt-3">
            <span className="micro text-xs text-[var(--text-3)]">Or paste an image URL</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://…/cover.jpg"
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (!value) return;
                if (!/^https?:\/\//i.test(value)) {
                  setError("Image URLs must start with http:// or https://.");
                  return;
                }
                setError(null);
                setImageUrl(value);
                setSource(value.replace(/^https?:\/\//, "").slice(0, 32));
              }}
              className="mt-1.5 h-11 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <ul className="mt-3 space-y-1.5">
            {preset.zones.map((zone) => {
              const shown = !hiddenZones.includes(zone.id);
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    aria-pressed={shown}
                    onClick={() => toggleZone(zone.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1.5 text-left"
                  >
                    <span className="text-xs font-medium text-[var(--text)]">{zone.label}</span>
                    <span className="font-mono text-[11px] text-[var(--text-3)]">{zone.px}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {error ? (
            <p role="alert" className="mt-2 text-xs text-[var(--danger,#f87171)]">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-3)]">
              Bands are covered by the app&apos;s own interface on a real phone.
            </p>
          )}
        </div>

        <div className="mx-auto w-full max-w-[240px]">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--field)]">
            {imageUrl ? (
              // A blob/URL preview, not page content: next/image cannot optimise
              // an object URL, and the image is never sent anywhere.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Frame preview with safe-zone overlay"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center px-3 text-center">
                <p className="text-xs leading-relaxed text-[var(--text-3)]">
                  Load a frame to see where each app hides your text.
                </p>
              </div>
            )}

            {preset.zones
              .filter((zone) => !hiddenZones.includes(zone.id))
              .map((zone) => (
                <div
                  key={zone.id}
                  className="pointer-events-none absolute flex items-start justify-center border border-red-400/70 bg-red-500/25 p-1"
                  style={{ left: zone.left, top: zone.top, width: zone.width, height: zone.height }}
                >
                  <span className="rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold leading-none text-red-100">
                    {zone.label}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-[var(--text-3)]">
            1080 × 1920 · {preset.label}
          </p>
        </div>
      </div>
    </div>
  );
}
