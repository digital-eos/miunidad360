import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#f7f6f2",
          borderLeft: "16px solid #344b50",
          color: "#292d2e",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#344b50",
          }}
        >
          miunidad360 · Cataluña II
        </div>
        <div style={{ fontSize: 76, marginTop: 24, lineHeight: 1.1 }}>
          Elegí tu unidad al instante
        </div>
        <div style={{ fontSize: 32, marginTop: 24, color: "#5f6564", maxWidth: 900 }}>
          Disponibilidad, precio y superficie en tiempo real.
        </div>
      </div>
    ),
    { ...size }
  );
}
