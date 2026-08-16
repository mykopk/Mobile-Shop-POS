import { describe, expect, it } from "vitest";
import { formatDateTime, toISODate } from "./dates";

describe("toISODate", () => {
  it("returns the local calendar date", () => {
    const d = new Date(2025, 0, 15, 12, 0, 0);
    expect(toISODate(d)).toBe("2025-01-15");
  });
});

describe("formatDateTime", () => {
  it("renders a readable date+time including the year", () => {
    const out = formatDateTime("2025-01-15T12:00:00.000Z");
    expect(out).toContain("2025");
    expect(out).toContain(":");
  });

  it("accepts a custom separator", () => {
    const out = formatDateTime("2025-01-15T12:00:00.000Z", " / ");
    expect(out).toContain(" / ");
  });
});