import { describe, expect, it } from "vitest";
import {
  clampMoneyInput,
  formatAmountInput,
  formatMoney,
  formatMoneyCompact,
  formatPKR,
  roundMoney,
} from "./money";

describe("formatPKR / formatMoney", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatPKR(1000)).toBe("Rs 1,000");
  });

  it("keeps up to two decimals when there is a fraction", () => {
    expect(formatPKR(1234.5)).toBe("Rs 1,234.5");
  });

  it("handles null/undefined/string inputs", () => {
    expect(formatPKR(null)).toBe("Rs 0");
    expect(formatPKR(undefined)).toBe("Rs 0");
    expect(formatPKR("250000")).toBe("Rs 250,000");
  });

  it("supports a custom symbol", () => {
    expect(formatMoney(500, "$")).toBe("$ 500");
  });
});

describe("formatMoneyCompact", () => {
  it("compacts thousands and millions", () => {
    expect(formatMoneyCompact(1500)).toBe("Rs 1.5k");
    expect(formatMoneyCompact(2_500_000)).toBe("Rs 2.5M");
    expect(formatMoneyCompact(999)).toBe("Rs 999");
  });
});

describe("roundMoney", () => {
  it("rounds to two decimals without float drift", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(100.125)).toBe(100.13);
  });
});

describe("clampMoneyInput", () => {
  it("clamps above the max", () => {
    expect(clampMoneyInput("100000000")).toBe(String(99_000_000));
  });

  it("passes through valid input", () => {
    expect(clampMoneyInput("12345")).toBe("12345");
  });

  it("passes through non-numeric text", () => {
    expect(clampMoneyInput("abc")).toBe("abc");
  });
});

describe("formatAmountInput", () => {
  it("groups integer part with commas", () => {
    expect(formatAmountInput("1234567")).toBe("1,234,567");
  });

  it("keeps at most two decimal digits", () => {
    expect(formatAmountInput("12.3456")).toBe("12.34");
  });

  it("strips leading zeros", () => {
    expect(formatAmountInput("00042")).toBe("42");
  });
});