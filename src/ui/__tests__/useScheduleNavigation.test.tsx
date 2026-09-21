import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useScheduleNavigation } from "../hooks/useScheduleNavigation.ts";

describe("useScheduleNavigation", () => {
  it("initializes with provided date and calculates week range", () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useScheduleNavigation({
        date: "2026-09-09", // Wednesday
        onDateChange,
      }),
    );

    expect(result.current.date).toBe("2026-09-09");
    expect(result.current.firstDay).toBe("2026-09-07"); // Monday
    expect(result.current.lastDay).toBe("2026-09-11"); // Friday
    expect(result.current.weekDates).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
  });

  it("navigates days with nextDay and prevDay", () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useScheduleNavigation({
        date: "2026-09-09",
        onDateChange,
      }),
    );

    act(() => {
      result.current.nextDay();
    });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");

    act(() => {
      result.current.prevDay();
    });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");
  });

  it("navigates weeks with nextWeek and prevWeek", () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useScheduleNavigation({
        date: "2026-09-09",
        onDateChange,
      }),
    );

    act(() => {
      result.current.nextWeek();
    });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-16");

    act(() => {
      result.current.prevWeek();
    });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-02");
  });

  it("jumps to today", () => {
    const onDateChange = vi.fn();
    const { result } = renderHook(() =>
      useScheduleNavigation({
        date: "2026-01-01",
        onDateChange,
      }),
    );

    act(() => {
      result.current.jumpToToday();
    });
    expect(onDateChange).toHaveBeenCalledWith(result.current.today);
  });

  it("works in uncontrolled mode with internal state", () => {
    const { result } = renderHook(() => useScheduleNavigation());

    expect(result.current.date).toBe(result.current.today);
    expect(result.current.isToday).toBe(true);

    act(() => {
      result.current.nextDay();
    });
    expect(result.current.isToday).toBe(false);
  });
});
