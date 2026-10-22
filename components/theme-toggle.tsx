"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Frosted two-position control with a lit sliding knob. Position is driven by
 * the `dark` class on <html> so it can never desync from the real theme, and
 * the boot script in the layout paints it before first frame (no flash, no
 * layout shift).
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function setTheme(nextIsDark: boolean) {
    const root = document.documentElement;
    root.classList.toggle("dark", nextIsDark);
    // The explicit toggle is the ONLY thing that can leave Obsidian dark:
    // it records the choice, which the layout's boot script honours later.
    root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
    root.style.colorScheme = nextIsDark ? "dark" : "light";
    setIsDark(nextIsDark);
    try {
      // Versioned key: stale `lamptik-theme=light` from older builds is
      // ignored by the layout boot script, so dark is the real default.
      localStorage.setItem("lamptik_theme_v3", nextIsDark ? "dark" : "light");
    } catch {
      // Storage blocked — the toggle still applies for this page view.
    }
  }

  return (
    <div
      className="relative flex h-9 shrink-0 items-center rounded-full border border-[var(--glass-border)] bg-[var(--field)] p-0.5 shadow-[inset_0_1px_0_0_var(--highlight)]"
      role="group"
      aria-label="Colour theme"
    >
      {/* Sliding knob: left = light, right = dark. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full border border-[var(--line)] bg-[var(--bg-raised)] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out dark:translate-x-full"
      />
      <button
        type="button"
        onClick={() => setTheme(false)}
        aria-pressed={!isDark}
        aria-label="Light theme"
        title="Light theme"
        className="relative z-10 grid size-8 place-items-center rounded-full text-[var(--text-3)] transition-colors duration-200 hover:text-[var(--text)] aria-pressed:text-[var(--accent-text)]"
      >
        <Sun className="size-[15px]" />
      </button>
      <button
        type="button"
        onClick={() => setTheme(true)}
        aria-pressed={isDark}
        aria-label="Dark theme"
        title="Dark theme"
        className="relative z-10 grid size-8 place-items-center rounded-full text-[var(--text-3)] transition-colors duration-200 hover:text-[var(--text)] aria-pressed:text-[var(--accent-text)]"
      >
        <Moon className="size-[15px]" />
      </button>
    </div>
  );
}
