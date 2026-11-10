export function DatasetCredit() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-background/95 to-transparent px-3 pb-2 pt-6">
      <p className="pointer-events-auto max-w-lg text-center text-[11px] text-foreground-subtle">
        Modelo BIM: dataset «Schependomlaan» — ROOT bv, Hendriks Bouw en Ontwikkeling, TU
        Eindhoven ·{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto underline decoration-dotted hover:text-foreground"
        >
          CC BY 4.0
        </a>
      </p>
    </div>
  );
}
