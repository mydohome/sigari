// Classi Tailwind condivise dai componenti nuovi, uguali a quelle usate nei modali di v2.
export const inputClass =
  "w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]";
export const labelClass = "text-xs font-medium text-[#8c7e75] block mb-1";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#f5ebd9] bg-[#281f1a] hover:bg-[#342721] border border-[#443328] rounded-xl transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
export const cardClass = "p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] shadow-sm";

export function formatEuro(valore?: number | null): string {
  if (valore === undefined || valore === null) return "€ 0,00";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(valore);
}

export function formatDurata(minuti: number): string {
  const m = Math.round(minuti);
  if (m < 60) return `${m} min`;
  const ore = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `${ore}h ${resto}m` : `${ore}h`;
}
