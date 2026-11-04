export function SceneFallback() {
  return (
    <div className="absolute inset-0 bg-grid">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(240,166,59,0.16), transparent 55%), linear-gradient(to bottom, transparent, var(--background) 92%)",
        }}
      />
    </div>
  );
}
