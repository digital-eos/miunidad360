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
        backgroundColor: "#0a0a0b",
        backgroundImage:
          "radial-gradient(circle at 75% 25%, rgba(240,166,59,0.25), transparent 55%)",
        color: "#f4f2ec",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#f0a63b",
        }}
      >
        Digital EOS
      </div>
      <div style={{ fontSize: 88, marginTop: 24, lineHeight: 1.1 }}>MiUnidad360</div>
      <div style={{ fontSize: 34, marginTop: 24, color: "#9b9890", maxWidth: 900 }}>
        Vendé tus unidades antes de construirlas
      </div>
    </div>,
    { ...size }
  );
}
