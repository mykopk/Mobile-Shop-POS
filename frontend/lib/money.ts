export function formatPKR(amount: number | string | null | undefined) {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  const hasFraction = Math.round(n) !== n;
  return `Rs ${n.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`;
}
