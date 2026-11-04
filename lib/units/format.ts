export function formatUsdPrice(amount: number): string {
  return `USD ${new Intl.NumberFormat("es-AR").format(amount)}`;
}

export function formatArea(areaM2: number | string): string {
  const value = typeof areaM2 === "string" ? Number.parseFloat(areaM2) : areaM2;
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)} m²`;
}
