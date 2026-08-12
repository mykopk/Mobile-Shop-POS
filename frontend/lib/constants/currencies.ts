export const CURRENCIES = [
  { code: "PKR", symbol: "Rs", unit: "Rupees", fraction: "Paisa", label: "Pakistani Rupee" },
  { code: "USD", symbol: "$", unit: "Dollars", fraction: "Cents", label: "US Dollar" },
  { code: "AED", symbol: "AED", unit: "Dirhams", fraction: "Fils", label: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", unit: "Riyals", fraction: "Halalas", label: "Saudi Riyal" },
  { code: "GBP", symbol: "£", unit: "Pounds", fraction: "Pence", label: "British Pound" },
  { code: "EUR", symbol: "€", unit: "Euros", fraction: "Cents", label: "Euro" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function currencyOf(code: string) {
  return CURRENCIES.find((c) => c.code === code);
}
