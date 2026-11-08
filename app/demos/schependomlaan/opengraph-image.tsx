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
          backgroundColor: "#f7f5f0",
          backgroundImage: "radial-gradient(circle at 75% 25%, rgba(240,166,59,0.18), transparent 55%)",
          color: "#1c1c1c",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#9c5f08",
          }}
        >
          MiUnidad360 · Modelo BIM
        </div>
        <div style={{ fontSize: 70, marginTop: 24, lineHeight: 1.1 }}>
          Unidades, avance de obra y corte
        </div>
        <div style={{ fontSize: 32, marginTop: 24, color: "#6e6a62", maxWidth: 900 }}>
          Un modelo BIM real, explorado capa por capa de construcción.
        </div>
      </div>
    ),
    { ...size },
  );
}
