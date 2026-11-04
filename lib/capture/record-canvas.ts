export type RecordBranding = {
  tagline: string;
};

export type RecordOptions = {
  sourceCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  durationMs: number;
  fps?: number;
  branding?: RecordBranding | null;
  onProgress?: (fraction: number) => void;
};

export type RecordResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
};

const MIME_CANDIDATES: { mimeType: string; extension: string }[] = [
  { mimeType: "video/mp4;codecs=h264", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

function pickMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder !== "undefined") {
    for (const candidate of MIME_CANDIDATES) {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

function drawBranding(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tagline: string,
) {
  const barHeight = Math.round(height * 0.1);
  const y = height - barHeight;
  const gradient = ctx.createLinearGradient(0, y, 0, height);
  gradient.addColorStop(0, "rgba(10,10,11,0)");
  gradient.addColorStop(0.4, "rgba(10,10,11,0.82)");
  gradient.addColorStop(1, "rgba(10,10,11,0.94)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, width, barHeight);

  const padding = Math.round(width * 0.07);
  const titleSize = Math.round(barHeight * 0.34);
  const taglineSize = Math.round(titleSize * 0.6);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#f0a63b";
  ctx.font = `700 ${titleSize}px system-ui, sans-serif`;
  ctx.fillText("MiUnidad360", padding, height - barHeight * 0.52);

  ctx.fillStyle = "#f4f2ec";
  ctx.font = `400 ${taglineSize}px system-ui, sans-serif`;
  ctx.fillText(tagline, padding, height - barHeight * 0.16);
}

/**
 * Re-draws `sourceCanvas` onto an offscreen compositing canvas at the exact
 * export resolution (so the output size is independent of devicePixelRatio
 * or on-screen CSS scaling), optionally burning in the logo + tagline, and
 * records it with MediaRecorder.
 */
export async function recordCanvasSequence(opts: RecordOptions): Promise<RecordResult> {
  const { sourceCanvas, width, height, durationMs, fps = 30, branding, onProgress } = opts;

  if (typeof MediaRecorder === "undefined") {
    throw new Error("Este navegador no puede grabar video (MediaRecorder no disponible).");
  }

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const maybeCtx = compositeCanvas.getContext("2d");
  if (!maybeCtx) throw new Error("No se pudo crear el canvas de composición.");
  const ctx = maybeCtx;

  if (typeof compositeCanvas.captureStream !== "function") {
    throw new Error("Este navegador no soporta grabar el canvas (captureStream).");
  }

  const { mimeType, extension } = pickMimeType();
  const stream = compositeCanvas.captureStream(fps);

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  } catch {
    recorder = new MediaRecorder(stream);
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const start = performance.now();
  let rafId = 0;

  function drawFrame() {
    const elapsed = performance.now() - start;
    ctx.fillStyle = "#0a0a0b";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      0,
      0,
      width,
      height,
    );

    if (branding) drawBranding(ctx, width, height, branding.tagline);

    onProgress?.(Math.min(1, elapsed / durationMs));

    if (elapsed < durationMs) {
      rafId = requestAnimationFrame(drawFrame);
    }
  }

  return new Promise<RecordResult>((resolve, reject) => {
    recorder.addEventListener("error", () => {
      cancelAnimationFrame(rafId);
      reject(new Error("Falló la grabación del video."));
    });
    recorder.addEventListener("stop", () => {
      cancelAnimationFrame(rafId);
      resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, extension });
    });

    recorder.start();
    rafId = requestAnimationFrame(drawFrame);
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, durationMs + 150);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
