import { getCompanyCurrency } from "./company";

const CURRENCY_META: Record<string, { symbol: string; unit: string; fraction: string }> = {
  PKR: { symbol: "Rs", unit: "Rupees", fraction: "Paisa" },
  USD: { symbol: "$", unit: "Dollars", fraction: "Cents" },
  AED: { symbol: "AED", unit: "Dirhams", fraction: "Fils" },
  SAR: { symbol: "SAR", unit: "Riyals", fraction: "Halalas" },
  GBP: { symbol: "£", unit: "Pounds", fraction: "Pence" },
  EUR: { symbol: "€", unit: "Euros", fraction: "Cents" },
};

const ONES = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS[tens] : `${TENS[tens]} ${ONES[ones]}`;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds > 0 ? `${ONES[hundreds]} Hundred` : "";
  const tail = rest > 0 ? twoDigits(rest) : "";
  return [head, tail].filter(Boolean).join(" ");
}

export function currencySymbol(currency: string): string {
  return CURRENCY_META[currency]?.symbol ?? currency;
}

export function currencyMeta(currency: string) {
  return CURRENCY_META[currency];
}

export function numberToWords(n: number): string {
  if (!isFinite(n)) return "";
  if (n === 0) return "Zero";
  const negative = n < 0;
  const abs = Math.abs(Math.floor(n));
  if (abs === 0) return "Zero";

  const words: string[] = [];
  const crore = Math.floor(abs / 10_000_000);
  const lakh = Math.floor((abs % 10_000_000) / 100_000);
  const thousand = Math.floor((abs % 100_000) / 1_000);
  const rest = abs % 1_000;

  if (crore > 0) words.push(`${twoDigits(crore)} Crore`);
  if (lakh > 0) words.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) words.push(`${twoDigits(thousand)} Thousand`);
  if (rest > 0) words.push(threeDigits(rest));

  const result = words.join(" ");
  return negative ? `Minus ${result}` : result;
}

export function amountToWords(amount: number | string, currency?: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = isFinite(num) ? Math.abs(num) : 0;
  const meta = currency ? CURRENCY_META[currency] : undefined;
  const unit = meta?.unit ?? "Rupees";
  const fraction = meta?.fraction ?? "Paisa";

  const whole = Math.floor(safe);
  const paisa = Math.round((safe - whole) * 100);

  const wholeWords = whole > 0 ? `${numberToWords(whole)} ${unit}` : "";
  const fractionWords = paisa > 0 ? `${numberToWords(paisa)} ${fraction}` : "";
  const joined = [wholeWords, fractionWords].filter(Boolean).join(" and ");

  return `${joined || `Zero ${unit}`} Only`;
}

export function formatAmount(amount: number | string, currency?: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const code = currency ?? "PKR";
  const symbol = currencySymbol(code);
  const hasFraction = Math.round(num) !== num;
  const formatted = num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
  return `${symbol} ${formatted}`;
}

export type MoneyInfo = {
  amount: number;
  currency: string;
  symbol: string;
  unit: string;
  fraction: string;
  formatted: string;
  words: string;
  wholeWords: string;
  fractionWords: string;
  paisa: number;
};

export async function getMoneyInfo(amount: number | string, currency?: string): Promise<MoneyInfo> {
  const code = currency ?? (await getCompanyCurrency());
  const meta = CURRENCY_META[code] ?? CURRENCY_META.PKR;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = isFinite(num) ? Math.abs(num) : 0;
  const whole = Math.floor(safe);
  const paisa = Math.round((safe - whole) * 100);

  const wholeWords = whole > 0 ? `${numberToWords(whole)} ${meta.unit}` : "";
  const fractionWords = paisa > 0 ? `${numberToWords(paisa)} ${meta.fraction}` : "";
  const words = `${[wholeWords, fractionWords].filter(Boolean).join(" and ") || `Zero ${meta.unit}`} Only`;

  return {
    amount: num,
    currency: code,
    symbol: meta.symbol,
    unit: meta.unit,
    fraction: meta.fraction,
    formatted: formatAmount(num, code),
    words,
    wholeWords,
    fractionWords,
    paisa,
  };
}
