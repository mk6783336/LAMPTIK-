import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** PWA / iOS home-screen icon, generated at build time. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 32,
            backgroundImage:
              "linear-gradient(150deg, #22D3EE 0%, #3B82F6 52%, #6366F1 100%)",
            color: "#FFFFFF",
            fontSize: 88,
            fontWeight: 700,
          }}
        >
          ⚡
        </div>
      </div>
    ),
    size,
  );
}
