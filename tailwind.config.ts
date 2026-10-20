import type { Config } from "tailwindcss";

/**
 * LAMP TIK design system — "obsidian glass".
 * Deep #050505 canvas, cyan→violet light mesh, translucent glass surfaces,
 * one neon gradient action colour. Type does the hierarchy; colour does the
 * signal. No gradient soup, no decorative chrome.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          text: "var(--accent-text)",
          soft: "var(--accent-soft)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          text: "var(--violet-text)",
          soft: "var(--violet-soft)",
        },
        magenta: { DEFAULT: "#FE0979", text: "var(--magenta-text)" },
        ok: "var(--ok)",
        warn: "var(--warn)",
        err: "var(--err)",
      },
      fontFamily: {
        // One self-hosted variable font (Inter). System stacks for display
        // variants — zero extra woff2 downloads, zero render blocking.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        label: "0.16em",
        tightest: "-0.045em",
        headline: "-0.035em",
      },
      borderRadius: {
        panel: "24px",
        card: "20px",
        control: "14px",
        pill: "999px",
      },
      boxShadow: {
        panel:
          "inset 0 1px 0 0 var(--highlight), 0 32px 80px -48px var(--shadow)",
        glass:
          "0 1px 0 0 var(--highlight) inset, 0 24px 64px -40px rgba(0,0,0,0.9)",
        glow: "0 12px 40px -14px var(--glow-cyan)",
        "glow-violet": "0 12px 40px -14px var(--glow-violet)",
        focus: "0 0 0 3px var(--accent-soft)",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(340%)" },
        },
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        // Platform-detection badge: breathes the current accent's glow.
        glow: {
          "0%, 100%": { boxShadow: "0 0 14px -5px var(--tool-glow)" },
          "50%": { boxShadow: "0 0 26px -2px var(--tool-glow)" },
        },
        // Slow mesh drift — transform only, compositor-friendly.
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-2.5%,0) scale(1.06)" },
        },
        // Button sheen: one pass on hover, never on a loop.
        sheen: {
          from: { transform: "translateX(-160%) skewX(-12deg)" },
          to: { transform: "translateX(320%) skewX(-12deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        sweep: "sweep 1.15s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        blink: "blink 1.1s steps(1) infinite",
        rise: "rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        pulse: "pulse 2.4s ease-in-out infinite",
        glow: "glow 2.6s ease-in-out infinite",
        aurora: "aurora 22s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
