import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — download TikTok videos without a watermark`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated OG image in the obsidian-glass aesthetic — cyan/violet light
 * mesh, a lit gradient tile, and one high-contrast claim. No stock template,
 * no external assets.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#050505",
          backgroundImage:
            "linear-gradient(140deg, rgba(34,211,238,0.20) 0%, rgba(5,5,5,0) 46%), linear-gradient(320deg, rgba(139,92,246,0.26) 0%, rgba(5,5,5,0) 52%)",
          color: "#F6F7FB",
          position: "relative",
        }}
      >
        {/* Hairline grid — the same structural layer as the site. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            opacity: 0.7,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage:
                "linear-gradient(150deg, #22D3EE 0%, #3B82F6 52%, #6366F1 100%)",
              color: "#FFFFFF",
              fontSize: 30,
            }}
          >
            ⚡
          </div>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 5,
              fontWeight: 600,
              color: "#F6F7FB",
            }}
          >
            LAMP TIK
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              backgroundColor: "rgba(255,255,255,0.05)",
              fontSize: 20,
              letterSpacing: 3,
              color: "#A4ADBE",
              alignSelf: "flex-start",
            }}
          >
            FREE · NO APP · NO WATERMARK
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -2.5,
            }}
          >
            <span>TikTok videos.</span>
            <span style={{ color: "#67E8F9" }}>Without the watermark.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#A4ADBE",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              HD MP4
            </span>
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              MP3 audio
            </span>
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              H.264
            </span>
          </div>
          <span style={{ fontFamily: "monospace", fontSize: 18, color: "#6D7585" }}>
            LAMPTIK.ONLINE
          </span>
        </div>
      </div>
    ),
    size,
  );
}
