import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
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
          fontSize: 28,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#344b50",
        }}
      >
        Digital EOS
      </div>
      <div style={{ fontSize: 88, marginTop: 24, lineHeight: 1.1 }}>miunidad360</div>
      <div style={{ fontSize: 34, marginTop: 24, color: "#5f6564", maxWidth: 900 }}>
        Vendé tus unidades en pozo con un recorrido 3D interactivo.
      </div>
    </div>,
    { ...size }
  );
}
