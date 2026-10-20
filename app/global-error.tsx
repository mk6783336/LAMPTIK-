"use client";

/**
 * Root fallback: this replaces the whole document, including the layout, so
 * it cannot rely on globals.css or on any component. Inline styles keep it
 * on-brand (obsidian + cyan) and functional when everything else failed to
 * load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#050505",
          color: "#F6F7FB",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#A4ADBE",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "#22d3ee",
                boxShadow: "0 0 10px rgba(34,211,238,0.7)",
              }}
            />
            fatal error
          </span>

          <h1
            style={{
              marginTop: 20,
              fontSize: 34,
              lineHeight: 1.06,
              letterSpacing: "-0.035em",
              fontWeight: 600,
            }}
          >
            The app couldn’t start.
          </h1>
          <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7, color: "#A4ADBE" }}>
            This is on us, not your device. A reload usually clears it — if it
            doesn’t, the status page and support inbox are below.
          </p>

          {error?.digest ? (
            <p
              style={{
                marginTop: 16,
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "#6D7585",
              }}
            >
              digest {error.digest}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                border: "none",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                backgroundImage:
                  "linear-gradient(100deg, #06b6d4 0%, #2f6bff 52%, #4f46e5 100%)",
              }}
            >
              Try again
            </button>
            {/* A plain button, not a link: this fallback renders outside the
                router, so it navigates with a full document load. */}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                color: "#F6F7FB",
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
