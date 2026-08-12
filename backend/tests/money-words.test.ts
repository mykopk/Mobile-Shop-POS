import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../core/lib/prisma";
import {
  amountToWords,
  currencySymbol,
  formatAmount,
  getMoneyInfo,
  numberToWords,
} from "../core/lib/money";
import { resetDb, seedCompanyProfile } from "./helpers";

describe("money words & currency", () => {
  beforeAll(async () => {
    await resetDb();
    await seedCompanyProfile();
  });

  it("converts integers to words using Pakistani numbering", () => {
    expect(numberToWords(0)).toBe("Zero");
    expect(numberToWords(1)).toBe("One");
    expect(numberToWords(15)).toBe("Fifteen");
    expect(numberToWords(42)).toBe("Forty Two");
    expect(numberToWords(105)).toBe("One Hundred Five");
    expect(numberToWords(1500)).toBe("One Thousand Five Hundred");
    expect(numberToWords(100000)).toBe("One Lakh");
    expect(numberToWords(2500000)).toBe("Twenty Five Lakh");
    expect(numberToWords(10000000)).toBe("One Crore");
    expect(numberToWords(-250)).toBe("Minus Two Hundred Fifty");
  });

  it("converts amounts to words with currency unit and fraction", () => {
    expect(amountToWords(0)).toBe("Zero Rupees Only");
    expect(amountToWords(1500)).toBe("One Thousand Five Hundred Rupees Only");
    expect(amountToWords(1250.5)).toBe("One Thousand Two Hundred Fifty Rupees and Fifty Paisa Only");
    expect(amountToWords("99.75")).toBe("Ninety Nine Rupees and Seventy Five Paisa Only");
    expect(amountToWords(0.45)).toBe("Forty Five Paisa Only");
    expect(amountToWords(1250.5, "USD")).toBe(
      "One Thousand Two Hundred Fifty Dollars and Fifty Cents Only",
    );
  });

  it("returns the currency symbol for known and unknown codes", () => {
    expect(currencySymbol("PKR")).toBe("Rs");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("GBP")).toBe("£");
    expect(currencySymbol("XYZ")).toBe("XYZ");
  });

  it("formats amounts with the symbol", () => {
    expect(formatAmount(1500)).toBe("Rs 1,500");
    expect(formatAmount(1250.5, "USD")).toBe("$ 1,250.5");
    expect(formatAmount(1250.25, "USD")).toBe("$ 1,250.25");
  });

  it("getMoneyInfo uses the company profile currency", async () => {
    const info = await getMoneyInfo(2500000.5);
    expect(info.currency).toBe("PKR");
    expect(info.symbol).toBe("Rs");
    expect(info.formatted).toContain("Rs");
    expect(info.words).toContain("Twenty Five Lakh");
    expect(info.paisa).toBe(50);
    expect(info.fractionWords).toBe("Fifty Paisa");
  });

  it("getMoneyInfo honours an explicit currency override", async () => {
    const info = await getMoneyInfo(1500, "USD");
    expect(info.symbol).toBe("$");
    expect(info.words).toBe("One Thousand Five Hundred Dollars Only");
  });

  it("getMoneyInfo reflects a company profile currency change", async () => {
    await prisma.companyProfile.update({
      where: { id: "store" },
      data: { currency: "USD" },
    });
    const info = await getMoneyInfo(500);
    expect(info.currency).toBe("USD");
    expect(info.symbol).toBe("$");
    expect(info.words).toBe("Five Hundred Dollars Only");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
