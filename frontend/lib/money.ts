function parseAmount(amount: number | string | null | undefined) {
  return typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
}

function numberFormat(n: number) {
  const hasFraction = Math.round(n) !== n;
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

export function formatMoney(amount: number | string | null | undefined, symbol = "Rs") {
  return `${symbol} ${numberFormat(parseAmount(amount))}`;
}

export function formatPKR(amount: number | string | null | undefined) {
  return formatMoney(amount, "Rs");
}

function groupInt(s: string) {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatAmountInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    parts[1] = parts.slice(1).join("");
  }
  let int = parts[0].replace(/^0+(?=\d)/, "");
  if (parts[0] === "") int = "";
  const frac = parts[1] !== undefined ? parts[1].slice(0, 2) : "";
  const grouped = int === "" ? "" : groupInt(int);
  return frac ? `${grouped}.${frac}` : grouped;
}

export function formatMoneyCompact(amount: number | string | null | undefined, symbol = "Rs") {
  const n = parseAmount(amount);
  const abs = Math.abs(n);
  const trimmed = (v: number) => {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  };
  if (abs >= 1_000_000) return `${symbol} ${trimmed(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${symbol} ${trimmed(n / 1_000)}k`;
  return `${symbol} ${numberFormat(n)}`;
}
