import { describe, expect, it } from "vitest";
import { addDays, daysToRefresh, isWeekend, nextSchoolDay } from "../schoolDays.ts";

describe("addDays", () => {
  it("moves forward and backward across month boundaries", () => {
    expect(addDays("2026-09-09", 1)).toBe("2026-09-10");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-09-09", -14)).toBe("2026-08-26");
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(addDays("nonsense", 1)).toBe("nonsense");
  });
});

describe("isWeekend", () => {
  it("identifies Saturday and Sunday", () => {
    expect(isWeekend("2026-09-12")).toBe(true); // Sat
    expect(isWeekend("2026-09-13")).toBe(true); // Sun
    expect(isWeekend("2026-09-11")).toBe(false); // Fri
  });
});

describe("nextSchoolDay", () => {
  it("skips the weekend from Friday", () => {
    expect(nextSchoolDay("2026-09-11")).toBe("2026-09-14");
  });

  it("steps one day midweek", () => {
    expect(nextSchoolDay("2026-09-09")).toBe("2026-09-10");
  });

  it("lands on Monday from Saturday and Sunday", () => {
    expect(nextSchoolDay("2026-09-12")).toBe("2026-09-14");
    expect(nextSchoolDay("2026-09-13")).toBe("2026-09-14");
  });
});

describe("daysToRefresh", () => {
  it("returns today and tomorrow midweek", () => {
    expect(daysToRefresh("2026-09-09")).toEqual(["2026-09-09", "2026-09-10"]);
  });

  it("rolls Friday forward to Monday", () => {
    expect(daysToRefresh("2026-09-11")).toEqual(["2026-09-11", "2026-09-14"]);
  });

  it("skips the weekend entirely when opened on Saturday", () => {
    expect(daysToRefresh("2026-09-12")).toEqual(["2026-09-14", "2026-09-15"]);
  });
});
