import { describe, expect, it } from "vitest";
import { roundMoney, formatPKR, formatMoneyCompact, clampMoneyInput, formatAmountInput } from "@/lib/money";

describe("roundMoney", () => {
  it("rounds to 2 decimal places (paisa)", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1999.999)).toBe(2000);
    expect(roundMoney(2.675)).toBe(2.68);
  });
});

describe("money math used in the POS cart", () => {
  it("computes subtotal / tax / cardFee / total without float drift", () => {
    const subtotal = roundMoney(199.99 * 3);
    expect(subtotal).toBe(599.97);
    const tax = roundMoney((subtotal * 5) / 100);
    expect(tax).toBe(30);
    const cardFee = roundMoney(((subtotal + tax) * 1.5) / 100);
    expect(cardFee).toBe(9.45);
    const total = roundMoney(subtotal + tax + cardFee);
    expect(total).toBe(639.42);
  });

  it("line total (price - discount) * qty stays exact", () => {
    const price = 100000;
    const discount = 0.1; // 10% flat from quick-sale
    const total = roundMoney((price - discount) * 2);
    expect(total).toBe(199999.8);
  });
});

describe("formatPKR", () => {
  it("formats Pakistani amounts", () => {
    expect(formatPKR(0)).toBe("Rs 0");
    expect(formatPKR(1234567)).toBe("Rs 1,234,567");
    expect(formatPKR(1234.5)).toBe("Rs 1,234.5");
  });
});

describe("formatMoneyCompact", () => {
  it("abbreviates thousands and millions", () => {
    expect(formatMoneyCompact(5000)).toBe("Rs 5k");
    expect(formatMoneyCompact(1500000)).toBe("Rs 1.5M");
    expect(formatMoneyCompact(999)).toBe("Rs 999");
  });
});

describe("clampMoneyInput", () => {
  it("clamps to the max money amount", () => {
    expect(clampMoneyInput("99000000", 99_000_000)).toBe("99000000");
    expect(clampMoneyInput("99999999", 99_000_000)).toBe("99000000");
    expect(clampMoneyInput("150000000", 99_000_000)).toBe("99000000");
    expect(clampMoneyInput("1,23,000")).toBe("1,23,000");
  });
});

describe("formatAmountInput", () => {
  it("sanitizes money input", () => {
    expect(formatAmountInput("12ab34")).toBe("1,234");
    expect(formatAmountInput("1234.5678")).toBe("1,234.56");
    expect(formatAmountInput("00123")).toBe("123");
  });
});
