import { describe, expect, it } from "vitest";
import {
  formatPercent,
  formatTime,
  getDayName,
  getHourLabel,
} from "../../../../components/statistics/utils";

describe("Statistics Utility Functions", () => {
  // Tests for formatTime function
  describe("formatTime", () => {
    it("should return '0m' for 0 or falsy values", () => {
      expect(formatTime(0)).toBe("0m");
      expect(formatTime(null as unknown as number)).toBe("0m");
      expect(formatTime(undefined as unknown as number)).toBe("0m");
    });

    it("should format milliseconds to minutes when less than an hour", () => {
      expect(formatTime(60000)).toBe("1m");
      expect(formatTime(120000)).toBe("2m");
      expect(formatTime(1800000)).toBe("30m");
      expect(formatTime(3540000)).toBe("59m");
    });

    it("should format milliseconds to hours and minutes when more than an hour", () => {
      expect(formatTime(3600000)).toBe("1h 0m");
      expect(formatTime(5400000)).toBe("1h 30m");
      expect(formatTime(7200000)).toBe("2h 0m");
      expect(formatTime(9000000)).toBe("2h 30m");
      expect(formatTime(12600000)).toBe("3h 30m");
    });

    it("should handle large values correctly", () => {
      expect(formatTime(86400000)).toBe("24h 0m"); // 1 day
      expect(formatTime(90000000)).toBe("25h 0m"); // 1 day and 1 hour
      expect(formatTime(90060000)).toBe("25h 1m"); // 1 day, 1 hour, and 1 minute
    });
  });

  // Tests for formatPercent function
  describe("formatPercent", () => {
    it("should format decimal values to percentage with 1 decimal place", () => {
      expect(formatPercent(0)).toBe("0.0%");
      expect(formatPercent(0.1)).toBe("10.0%");
      expect(formatPercent(0.25)).toBe("25.0%");
      expect(formatPercent(0.5)).toBe("50.0%");
      expect(formatPercent(0.75)).toBe("75.0%");
      expect(formatPercent(1)).toBe("100.0%");
    });

    it("should handle decimal precision correctly", () => {
      expect(formatPercent(0.123)).toBe("12.3%");
      expect(formatPercent(0.4567)).toBe("45.7%");
      expect(formatPercent(0.999)).toBe("99.9%");
      expect(formatPercent(0.001)).toBe("0.1%");
    });

    it("should handle values greater than 1", () => {
      expect(formatPercent(1.5)).toBe("150.0%");
      expect(formatPercent(2)).toBe("200.0%");
    });

    it("should handle negative values", () => {
      expect(formatPercent(-0.1)).toBe("-10.0%");
      expect(formatPercent(-0.5)).toBe("-50.0%");
    });
  });

  // Tests for getDayName function
  describe("getDayName", () => {
    it("should return correct day names for indices 0-6", () => {
      expect(getDayName(0)).toBe("Sunday");
      expect(getDayName(1)).toBe("Monday");
      expect(getDayName(2)).toBe("Tuesday");
      expect(getDayName(3)).toBe("Wednesday");
      expect(getDayName(4)).toBe("Thursday");
      expect(getDayName(5)).toBe("Friday");
      expect(getDayName(6)).toBe("Saturday");
    });

    it("should return undefined for invalid indices", () => {
      expect(getDayName(-1)).toBeUndefined();
      expect(getDayName(7)).toBeUndefined();
    });
  });

  // Tests for getHourLabel function
  describe("getHourLabel", () => {
    it("should format midnight correctly", () => {
      expect(getHourLabel(0)).toBe("12 AM");
    });

    it("should format AM hours correctly", () => {
      expect(getHourLabel(1)).toBe("1 AM");
      expect(getHourLabel(2)).toBe("2 AM");
      expect(getHourLabel(6)).toBe("6 AM");
      expect(getHourLabel(11)).toBe("11 AM");
    });

    it("should format noon correctly", () => {
      expect(getHourLabel(12)).toBe("12 PM");
    });

    it("should format PM hours correctly", () => {
      expect(getHourLabel(13)).toBe("1 PM");
      expect(getHourLabel(15)).toBe("3 PM");
      expect(getHourLabel(18)).toBe("6 PM");
      expect(getHourLabel(23)).toBe("11 PM");
    });

    it("should handle out-of-range values", () => {
      // These tests will help identify if the function needs boundary checking
      expect(getHourLabel(24)).toBe("12 PM"); // Should wrap around or handle edge cases
      expect(getHourLabel(25)).toBe("1 PM");
      expect(getHourLabel(-1)).toBe("11 PM");
    });
  });
});
