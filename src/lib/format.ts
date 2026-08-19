export function money(value: number | string | null | undefined, currency = "RWF") {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

export function qty(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.0+$/, "");
}

export function shortDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function dateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}