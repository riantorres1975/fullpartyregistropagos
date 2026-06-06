import { ImageResponse } from "next/og";

// Ícono para "Agregar a inicio" en iOS. Next lo inyecta como apple-touch-icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg,#6d28d9 0%,#db2777 100%)",
        }}
      >
        <div
          style={{
            width: 100,
            height: 72,
            background: "#ffffff",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          <div style={{ marginTop: 16, width: "100%", height: 16, background: "#6d28d9" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
