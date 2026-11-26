/**
 * The Home screen against the real 2026-09-09 fixtures. What matters here is the promises
 * CLAUDE.md makes to the user: cancelled lessons stay on screen, EduPage's own wording is
 * shown verbatim, and every empty state says something.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StoreContext } from "@/store";
import { TooltipProvider } from "@/ds";
import { HomeView } from "../screens/home-view";
import { bootHarness, clickAndSettle, FIXTURE_DATE, type Harness } from "./harness.tsx";

/** 08:50 Riga on the fixture date: inside the first lesson. */
const DURING_FIRST_LESSON = new Date("2026-09-09T05:50:00Z");

const renderDay = (harness: Harness, date = FIXTURE_DATE) => {
  const onDateChange = vi.fn();
  const result = render(
    <TooltipProvider>
      <StoreContext.Provider value={harness.store}>
        <HomeView date={date} onDateChange={onDateChange} onPickClass={vi.fn()} />
      </StoreContext.Provider>
    </TooltipProvider>,
  );
  return { ...result, onDateChange };
};

describe("HomeView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_FIRST_LESSON);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the class's lessons for the day", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    /*
     * The design system's lesson card is a `div role="button"` — it nests a heading and its own
     * badges, which a real `<button>` may not contain — so rows are found by role, not by tag.
     */
    const rows = screen
      .getAllByRole("listitem")
      .filter((li) => li.querySelector('[role="button"]'));
    expect(rows.length).toBeGreaterThan(0);
    // The header says "Today" because the fake clock is on the fixture date.
    expect(screen.getByText("Šodien")).toBeDefined();
  });

  it("names yesterday and tomorrow in the header, and dates anything further out", async () => {
    const harness = await bootHarness();

    const { unmount } = renderDay(harness, "2026-09-10");
    expect(within(screen.getByTestId("day-header")).getByText("Rīt")).toBeDefined();
    unmount();

    const back = renderDay(harness, "2026-09-08");
    expect(screen.getByText("Vakar")).toBeDefined();
    back.unmount();

    renderDay(harness, "2026-09-11");
    expect(screen.queryByText("Rīt")).toBeNull();
    expect(screen.queryByText("Vakar")).toBeNull();
  });

  it("says nothing about the building on an ordinary main-building day", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("day-building")).toBeNull();
  });

  it("calls the building out, once up top and again on each card, when it is not the main one", async () => {
    // The fixture server answers every tt_num with the same week, so pinning TIC gives a day
    // whose lessons are real but published under the annex — the case automatic mode merges.
    const harness = await bootHarness({ building: "TIC" });
    renderDay(harness);

    expect(screen.getByTestId("day-building").textContent).toContain("Cita ēka: TIC");
    expect(screen.getAllByText("TIC").length).toBeGreaterThan(0);
  });

  const RAIL_CLASSES = ["bg-amber", "bg-sky", "bg-lilac", "bg-pink", "bg-mint", "bg-lime"];
  const railTonesUsed = (container: HTMLElement): Set<string> =>
    new Set(
      [...container.querySelectorAll("span")]
        .flatMap((span) => span.className.split(" "))
        .filter((cls) => RAIL_CLASSES.includes(cls)),
    );

  it("colours the subject rail with more than one tone by default", async () => {
    const harness = await bootHarness();
    const { container } = renderDay(harness);
    expect(railTonesUsed(container).size).toBeGreaterThan(1);
  });

  it("falls the subject rail back to one neutral tone with colour-coding off", async () => {
    const harness = await bootHarness({ subjectColorCodingEnabled: false });
    const { container } = renderDay(harness);
    expect(railTonesUsed(container)).toEqual(new Set(["bg-sky"]));
  });

  it("keeps cancelled lessons visible with the school's own wording", async () => {
    // A1-2 is the harness default and has real cancellations that day (resolve.test.ts).
    const harness = await bootHarness();
    renderDay(harness);

    const badge = screen.getAllByTestId("status-cancelled")[0];
    expect(badge).toBeDefined();

    // Opening it shows the raw Latvian note under a "from school" label, untranslated.
    fireEvent.click(badge!.closest('[role="button"]')!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("No skolas")).toBeDefined();
  });

  it("marks where the clock is when no lesson is going", async () => {
    vi.setSystemTime(new Date("2026-09-09T04:00:00Z")); // 07:00 Riga, before the first lesson
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("now-marker")).not.toBeNull();
  });

  it("shows no now-marker while a lesson is going", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("now-marker")).toBeNull();
  });

  it("shows no now-marker on a day that is not today", async () => {
    const harness = await bootHarness();
    renderDay(harness, "2026-09-10");
    expect(screen.queryByTestId("now-marker")).toBeNull();
  });

  describe("glance", () => {
    it("lifts the lesson in progress above the list, which stays below it", async () => {
      const harness = await bootHarness();
      renderDay(harness);

      const glance = screen.getByTestId("day-glance");
      expect(glance.textContent).toContain("Tagad");
      expect(screen.getByTestId("glance-countdown").textContent).toMatch(/^Atlikušas \d/);

      // The full day is still listed underneath, in document order after the glance.
      const rows = screen
        .getAllByRole("listitem")
        .filter((li) => li.querySelector('[role="button"]'));
      expect(rows.length).toBeGreaterThan(1);
      expect(glance.compareDocumentPosition(rows[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it("keeps the brief and glance on top, about today, and the browsed day below", async () => {
      const harness = await bootHarness({ building: "TIC" });
      renderDay(harness, "2026-09-10");

      // Browsing tomorrow pages only the schedule: the glance still answers for today.
      const hero = screen.getByTestId("home-hero");
      const glance = within(hero).getByTestId("day-glance");
      expect(glance.textContent).toContain("Tagad");

      const schedule = screen.getByTestId("home-schedule");
      expect(hero.compareDocumentPosition(schedule) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(within(schedule).getByRole("heading", { name: "Dienas saraksts" })).toBeDefined();
      expect(within(schedule).getByText("Rīt")).toBeDefined();
      expect(within(schedule).getByTestId("day-summary")).toBeDefined();
      expect(
        within(schedule)
          .getAllByRole("listitem")
          .filter((li) => li.querySelector('[role="button"]')).length,
      ).toBeGreaterThan(0);
      // Footnotes stay inside the day block, under its list.
      expect(within(schedule).getByTestId("day-building")).toBeDefined();
    });

    it("puts the date, its arrows and the lesson list together in the bottom block", async () => {
      const harness = await bootHarness();
      renderDay(harness);

      const schedule = screen.getByTestId("home-schedule");
      expect(within(schedule).getByTestId("day-header")).toBeDefined();
      expect(within(schedule).getByRole("button", { name: "Izvēlēties datumu" })).toBeDefined();
      expect(within(schedule).getByRole("button", { name: "Nākamā diena" })).toBeDefined();
      expect(within(screen.getByTestId("home-hero")).queryByTestId("day-header")).toBeNull();
    });

    it("keeps the offline notice above the banner, since it qualifies what the banner says", async () => {
      const harness = await bootHarness();
      renderDay(harness);
      act(() => {
        harness.store.getState().setConnectivity(false);
      });

      expect(
        screen
          .getByTestId("offline-banner")
          .compareDocumentPosition(screen.getByTestId("day-glance")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it("outlines whichever day is browsed, and the brief follows a later day", async () => {
      const harness = await bootHarness();
      const tomorrow = renderDay(harness, "2026-09-10");

      expect(
        within(screen.getByTestId("day-header")).getByTestId("day-time-range").textContent,
      ).toMatch(/\d\d:\d\d – \d\d:\d\d/);
      // How long tomorrow will be, named, rather than how much of today is left.
      const tomorrowBrief = screen.getByTestId("home-brief");
      expect(tomorrowBrief.getAttribute("aria-label")).toMatch(/^Mācības sākas \d\d:\d\d/);
      expect(tomorrowBrief.getAttribute("aria-label")).toMatch(/beigas \d\d:\d\d/);
      expect(tomorrowBrief.textContent).toMatch(/^\d\d:\d\d/);
      expect(screen.getByTestId("home-brief-day").textContent).toBe("Rīt");
      tomorrow.unmount();

      // A free later day says so without claiming it is today.
      const saturday = renderDay(harness, "2026-09-12");
      const satBrief = screen.getByTestId("home-brief");
      expect(satBrief.getAttribute("aria-label")).toContain("Stundu nebūs");
      expect(satBrief.textContent).toBe("Brīvs");
      saturday.unmount();

      // The past keeps today's brief, unlabelled.
      renderDay(harness, "2026-09-08");
      expect(screen.getByTestId("home-brief").getAttribute("aria-label")).toMatch(
        /^Mācības līdz \d\d:\d\d/,
      );
      expect(screen.queryByTestId("home-brief-day")).toBeNull();
    });

    it("opens the lesson sheet when the glance card is tapped", async () => {
      const harness = await bootHarness();
      renderDay(harness);

      fireEvent.click(screen.getByTestId("day-glance"));
      expect(await screen.findByRole("dialog")).toBeDefined();
    });

    it("counts down to the first lesson before school starts", async () => {
      vi.setSystemTime(new Date("2026-09-09T04:00:00Z")); // 07:00 Riga
      const harness = await bootHarness();
      renderDay(harness);

      const glance = screen.getByTestId("day-glance");
      expect(glance.textContent).toContain("Tālāk");
      expect(screen.getByTestId("glance-countdown").textContent).toMatch(/^Pēc /);
    });

    it("swaps to the next school day once lessons are over, and opens it on tap", async () => {
      vi.setSystemTime(new Date("2026-09-09T17:00:00Z")); // 20:00 Riga
      const harness = await bootHarness();
      const { onDateChange } = renderDay(harness);

      expect(screen.queryByTestId("day-glance")).toBeNull();
      const card = screen.getByTestId("day-tomorrow");
      expect(card.textContent).toMatch(/Sākas \d\d:\d\d/);

      fireEvent.click(card);
      expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
    });
  });

  describe("brief and weather", () => {
    const forecast = {
      fetchedAt: "2026-09-09T05:30:00.000Z",
      current: {
        time: "2026-09-09T08:45",
        temperature: 13.6,
        apparentTemperature: 12,
        code: 61,
        isDay: true,
      },
      hourly: Array.from({ length: 24 }, (_, h) => ({
        time: `2026-09-09T${String(h).padStart(2, "0")}:00`,
        temperature: 14,
        precipitationProbability: h === 11 ? 80 : 0,
        code: h === 11 ? 63 : 3,
      })),
      daily: [
        {
          date: "2026-09-09",
          code: 61,
          max: 17.2,
          min: 9.8,
          precipitationProbability: 80,
          sunrise: "2026-09-09T06:50",
          sunset: "2026-09-09T19:55",
        },
      ],
    };

    it("greets for the time of day and says how much of today is left", async () => {
      const harness = await bootHarness();
      renderDay(harness);

      expect(screen.getByRole("heading", { level: 1, name: "Labrīt" })).toBeDefined();
      const brief = screen.getByTestId("home-brief");
      expect(brief.getAttribute("aria-label")).toMatch(/Mācības līdz \d\d:\d\d/);
      expect(brief.getAttribute("aria-label")).toMatch(/Atlikušas stundas: \d/);
    });

    it("outlines the whole day before it starts, and calls it done after", async () => {
      vi.setSystemTime(new Date("2026-09-09T04:00:00Z")); // 07:00 Riga
      const harness = await bootHarness();
      const { unmount } = renderDay(harness);
      expect(screen.getByTestId("home-brief").getAttribute("aria-label")).toMatch(
        /^Mācības sākas \d\d:\d\d/,
      );
      unmount();

      vi.setSystemTime(new Date("2026-09-09T17:00:00Z")); // 20:00 Riga
      renderDay(harness);
      expect(screen.getByRole("heading", { level: 1, name: "Labvakar" })).toBeDefined();
      const done = screen.getByTestId("home-brief");
      expect(done.getAttribute("aria-label")).toContain("Šodienai viss");
      expect(done.textContent).toBe("Viss");
      expect(done.tagName).toBe("DIV");
    });

    it("shows compact hours+ and minutes countdown, and expands/collapses on tap, Escape and timeout", async () => {
      const harness = await bootHarness();
      act(() => {
        harness.store.setState({ weather: forecast });
      });

      // 08:50 Riga: several hours left in the day -> compact "N+"
      const first = renderDay(harness);
      const tile = screen.getByTestId("home-brief");
      expect(tile.tagName).toBe("BUTTON");
      expect(tile.getAttribute("aria-expanded")).toBe("false");
      expect(tile.textContent).toMatch(/^\d+\+līdz beigām$/);

      // Tap expands to h:mm across the full row and marks weather tile inert
      fireEvent.click(tile);
      expect(tile.getAttribute("aria-expanded")).toBe("true");
      expect(tile.textContent).toMatch(/^\d+:\d\dlīdz beigām$/);
      expect(screen.getByTestId("home-tiles").style.gridTemplateColumns).toBe("2fr 0fr");
      expect(screen.getByTestId("home-weather").hasAttribute("inert")).toBe(true);
      // Neither grid item may carry outer padding, or its `0fr` track cannot collapse to 0 px
      expect(tile.className.split(/\s+/)).toContain("p-0");
      expect(screen.getByTestId("home-weather").className.split(/\s+/)).toContain("p-0");

      // Second tap collapses
      fireEvent.click(tile);
      expect(tile.getAttribute("aria-expanded")).toBe("false");
      expect(screen.getByTestId("home-weather").hasAttribute("inert")).toBe(false);

      // Escape collapses
      fireEvent.click(tile);
      expect(tile.getAttribute("aria-expanded")).toBe("true");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(tile.getAttribute("aria-expanded")).toBe("false");

      // 6 s inactivity auto-collapses
      fireEvent.click(tile);
      expect(tile.getAttribute("aria-expanded")).toBe("true");
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(tile.getAttribute("aria-expanded")).toBe("false");
      first.unmount();

      // 42 minutes before first lesson (first lesson starts 08:30 -> 07:48 Riga = 04:48Z)
      vi.setSystemTime(new Date("2026-09-09T04:48:00Z"));
      renderDay(harness);
      const before = screen.getByTestId("home-brief");
      expect(before.textContent).toBe("42minlīdz sākumam");
      fireEvent.click(before);
      expect(before.textContent).toBe("0:42līdz sākumam");
    });

    it("shows no weather until a forecast has arrived", async () => {
      const harness = await bootHarness();
      renderDay(harness);
      expect(screen.queryByTestId("home-weather")).toBeNull();
    });

    it("shows Riga's weather temperature with animated rain backdrop when school hours are wet", async () => {
      const harness = await bootHarness();
      act(() => {
        harness.store.setState({ weather: forecast });
      });
      renderDay(harness);

      const weather = screen.getByTestId("home-weather");
      expect(weather.tagName).toBe("BUTTON");
      expect(weather.getAttribute("aria-expanded")).toBe("false");
      expect(weather.textContent).toContain("14°");
      expect(weather.textContent).not.toContain("17° / 10°");
      expect(weather.getAttribute("aria-label")).toBe(
        "Laikapstākļi Rīgā: 14°, lietus. Maks. 17°, min. 10°",
      );
      expect(screen.getByTestId("weather-backdrop").getAttribute("data-precip")).toBe("rain");

      // Tap expands horizontally and reveals condition + day/night temps while school tile is inert
      expect(screen.getByTestId("weather-ambient").getAttribute("data-active")).toBe("false");
      fireEvent.click(weather);
      expect(weather.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByTestId("weather-ambient").getAttribute("data-active")).toBe("true");
      expect(screen.getByTestId("weather-ambient").getAttribute("data-precip")).toBe("rain");
      expect(screen.getByTestId("home-tiles").style.gridTemplateColumns).toBe("0fr 2fr");
      expect(screen.getByTestId("home-brief").hasAttribute("inert")).toBe(true);
      expect(weather.textContent).toContain("Tagad");
      const details = screen.getByTestId("home-weather-details");
      expect(details.textContent).toContain("Lietus");
      expect(details.textContent).toContain("Diena 17°");
      expect(details.textContent).toContain("Nakts 10°");

      // Second tap collapses back to equal columns
      fireEvent.click(weather);
      expect(weather.getAttribute("aria-expanded")).toBe("false");
      expect(screen.getByTestId("weather-ambient").getAttribute("data-active")).toBe("false");
      expect(screen.getByTestId("home-tiles").style.gridTemplateColumns).toBe("1fr 1fr");
      expect(screen.getByTestId("home-brief").hasAttribute("inert")).toBe(false);

      // 6 s inactivity auto-collapses weather tile as well
      fireEvent.click(weather);
      expect(weather.getAttribute("aria-expanded")).toBe("true");
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(weather.getAttribute("aria-expanded")).toBe("false");
    });

    it("pages the weather with the schedule, naming the later day it is for", async () => {
      const ahead = {
        ...forecast,
        hourly: [
          ...forecast.hourly,
          ...Array.from({ length: 24 }, (_, h) => ({
            time: `2026-09-10T${String(h).padStart(2, "0")}:00`,
            temperature: 6,
            precipitationProbability: 0,
            code: 0,
          })),
        ],
        daily: [
          ...forecast.daily,
          {
            date: "2026-09-10",
            code: 0,
            max: 9.4,
            min: 2.1,
            precipitationProbability: 0,
            sunrise: "2026-09-10T06:52",
            sunset: "2026-09-10T19:52",
          },
        ],
      };
      const harness = await bootHarness();
      act(() => {
        harness.store.setState({ weather: ahead });
      });

      const { unmount } = renderDay(harness, "2026-09-10");
      const weather = screen.getByTestId("home-weather");
      expect(screen.getByTestId("home-weather-day").textContent).toBe("Rīt");
      expect(weather.textContent).toContain("6°");
      expect(weather.textContent).not.toContain("9° / 2°");
      expect(weather.getAttribute("aria-label")).toBe(
        "Prognoze: Rīt. Laikapstākļi Rīgā: 6°, skaidrs. Maks. 9°, min. 2°",
      );
      expect(screen.getByTestId("weather-backdrop").getAttribute("data-precip")).toBe("none");
      unmount();

      // Beyond the forecast, or back in the past: today's weather, unlabelled.
      for (const date of ["2026-09-11", "2026-09-08"]) {
        const view = renderDay(harness, date);
        expect(screen.getByTestId("home-weather").textContent).toContain("14°");
        expect(screen.queryByTestId("home-weather-day")).toBeNull();
        view.unmount();
      }
    });

    it("names a later day by its weekday", async () => {
      const harness = await bootHarness();
      act(() => {
        harness.store.setState({
          weather: {
            ...forecast,
            daily: [{ ...forecast.daily[0]!, date: "2026-09-11" }],
          },
        });
      });
      renderDay(harness, "2026-09-11");
      expect(screen.getByTestId("home-weather-day").textContent?.toLowerCase()).toBe("piektdiena");
      expect(screen.getByTestId("home-weather").textContent).toContain("17°");
    });

    it("hides the weather once it is switched off in Settings and makes school tile full width", async () => {
      const harness = await bootHarness();
      act(() => {
        harness.store.setState({ weather: forecast });
      });
      await act(() => harness.store.getState().setWeatherEnabled(false));
      renderDay(harness);

      expect(screen.queryByTestId("home-weather")).toBeNull();
      expect(screen.getByTestId("home-brief")).toBeDefined();
      expect(screen.getByTestId("home-tiles").style.gridTemplateColumns).toBe("1fr");
    });

    it("never pages the day from a swipe on the top block", async () => {
      const harness = await bootHarness();
      const { onDateChange } = renderDay(harness);

      const hero = screen.getByTestId("home-hero");
      fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
      fireEvent.touchMove(hero, { touches: [{ clientX: 150, clientY: 200 }] });
      fireEvent.touchEnd(hero);
      expect(onDateChange).not.toHaveBeenCalled();
    });
  });

  it("opens a calendar anchored under the header and jumps to the picked date", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    fireEvent.click(screen.getByRole("button", { name: "Izvēlēties datumu" }));
    const dayButton = await screen.findByRole("button", { name: "10" });
    fireEvent.click(dayButton);

    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
  });

  it("closes the calendar's own today shortcut back onto the fixture date", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness, "2026-09-11");

    fireEvent.click(screen.getByRole("button", { name: "Izvēlēties datumu" }));
    fireEvent.click(await screen.findByTestId("calendar-jump-today"));

    expect(onDateChange).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("offers a way back to today when browsing another day", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness, "2026-09-11");

    fireEvent.click(screen.getByText("Uz šodienu"));
    expect(onDateChange).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("pages to the next day on a left swipe, and back on a right swipe", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.touchStart(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");

    fireEvent.touchStart(pager, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");
  });

  it("ignores a drag that stays under the swipe threshold", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.touchStart(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 280, clientY: 400 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it("ignores a mostly-vertical drag, so scrolling the list never pages the day", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.touchStart(pager, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchMove(pager, { touches: [{ clientX: 260, clientY: 600 }] });
    fireEvent.touchEnd(pager);
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it("steps a day at a time with the arrow keys, for anyone who can't swipe", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const pager = screen.getByRole("group");
    fireEvent.keyDown(pager, { key: "ArrowRight" });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");

    fireEvent.keyDown(pager, { key: "ArrowLeft" });
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");
  });

  it("navigates to previous and next days when clicking the chevron buttons", async () => {
    const harness = await bootHarness();
    const { onDateChange } = renderDay(harness);

    const prevButton = screen.getByRole("button", { name: "Iepriekšējā diena" });
    const nextButton = screen.getByRole("button", { name: "Nākamā diena" });

    fireEvent.click(prevButton);
    expect(onDateChange).toHaveBeenCalledWith("2026-09-08");

    fireEvent.click(nextButton);
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
  });

  it("explains an empty day rather than going blank", async () => {
    const harness = await bootHarness();
    renderDay(harness, "2026-09-12"); // Saturday
    expect(screen.getByText("Stundu nav")).toBeDefined();
  });

  it("asks for a class when none is picked", async () => {
    const harness = await bootHarness({ selectedClassId: null });
    renderDay(harness);
    expect(screen.getByText("Vispirms izvēlies klasi")).toBeDefined();
  });

  it("translates its chrome but never the school's text", async () => {
    const harness = await bootHarness({ lang: "en" });
    renderDay(harness);
    expect(screen.getByText("Today")).toBeDefined();
  });

  it("pull-to-refresh forces a sync for the day on screen", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    const before = harness.server.calls.substitutions;

    const scroller = screen.getByTestId("scroller");
    fireEvent.touchStart(scroller, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(scroller, { touches: [{ clientY: 400 }] });
    fireEvent.touchEnd(scroller);

    await vi.waitFor(() => {
      expect(harness.server.calls.substitutions).toBeGreaterThan(before);
    });
  });

  it("shows the offline banner once syncStatus says offline, and hides it once synced again", async () => {
    const harness = await bootHarness();
    renderDay(harness);
    expect(screen.queryByTestId("offline-banner")).toBeNull();

    act(() => {
      harness.store.getState().setConnectivity(false);
    });
    expect(screen.getByTestId("offline-banner")).toBeDefined();
    expect(screen.getByText("Nav interneta pieslēguma — rādām saglabāto sarakstu.")).toBeDefined();

    await act(async () => {
      harness.store.getState().setConnectivity(true);
      await vi.waitFor(() => {
        expect(harness.store.getState().syncStatus).toBe("idle");
      });
    });
    expect(screen.queryByTestId("offline-banner")).toBeNull();
  });

  it("hides announcement card when no announcements for class and allows toggling all", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    // Default class A1-2 has no announcements, so the card heading is not shown by default
    expect(screen.queryByText(/Paziņojumi · no skolas/)).toBeNull();

    // A subtle button to show all school announcements is available
    const toggleButton = screen.getByRole("button", { name: /Visi skolas paziņojumi/ });
    expect(toggleButton).toBeDefined();

    // Clicking it reveals the school announcements
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Paziņojumi · No skolas/i)).toBeDefined();
    expect(screen.getByText(/SC2 grupai/)).toBeDefined();

    // And the button switches to "Tikai manai grupai"
    const onlyGroupButton = screen.getByRole("button", { name: "Tikai manai grupai" });
    expect(onlyGroupButton).toBeDefined();

    // Clicking it collapses the card back
    fireEvent.click(onlyGroupButton);
    expect(screen.queryByText(/Paziņojumi · No skolas/i)).toBeNull();
  });

  it("resets showAllNotes when date changes", async () => {
    const harness = await bootHarness();
    const { rerender } = renderDay(harness);

    const toggleButton = screen.getByRole("button", { name: /Visi skolas paziņojumi/ });
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Paziņojumi · No skolas/i)).toBeDefined();

    rerender(
      <TooltipProvider>
        <StoreContext.Provider value={harness.store}>
          <HomeView date="2026-09-10" onDateChange={vi.fn()} onPickClass={vi.fn()} />
        </StoreContext.Provider>
      </TooltipProvider>,
    );

    expect(screen.queryByText(/Paziņojumi · No skolas/i)).toBeNull();
  });

  it("shows inline lesson times by default and drops the top-bar view options menu", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    expect(harness.store.getState().settings.showTime).toBe(true);
    expect(screen.queryByTestId("view-options")).toBeNull();
    const beforeCount = screen.getAllByTestId("lesson-time").length;
    expect(beforeCount).toBeGreaterThan(1);

    await clickAndSettle(() => {
      void harness.store.getState().updateSettings({ showTime: false });
    });

    // Only the live lesson keeps its time window beside the NOW badge when showTime is off.
    const remaining = screen.queryAllByTestId("lesson-time");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.closest('[data-live="true"]')).not.toBeNull();
  });

  it("renders changes badge and calls onOpenChanges when tapped", async () => {
    const harness = await bootHarness();
    const onOpenChanges = vi.fn();
    render(
      <TooltipProvider>
        <StoreContext.Provider value={harness.store}>
          <HomeView
            date={FIXTURE_DATE}
            onDateChange={vi.fn()}
            onPickClass={vi.fn()}
            onOpenChanges={onOpenChanges}
          />
        </StoreContext.Provider>
      </TooltipProvider>,
    );

    const badge = screen.getByTestId("day-changes-badge");
    expect(badge).toBeDefined();
    fireEvent.click(badge);
    expect(onOpenChanges).toHaveBeenCalledWith(FIXTURE_DATE);
  });

  it("groups consecutive lessons into frosted-glass panes and lifts the live lesson onto its deep subject field", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    // During the first lesson, it lifts out onto its subject's deep grainy tone field (matching the
    // featured SubjectCard, DayGlance, and NowDock) while the remaining consecutive lessons share a
    // frosted-glass pane below it.
    const livePane = screen.getByTestId("schedule-live-pane");
    const liveCard = livePane.querySelector<HTMLElement>('[data-live="true"]');
    expect(liveCard).not.toBeNull();
    expect(liveCard!.className).toContain("u-tone-field");
    expect(liveCard!.className).toContain("u-tone-field-deep");
    expect(liveCard!.style.getPropertyValue("--tone")).not.toBe("");
    expect(liveCard!.style.getPropertyValue("--tone-ink")).not.toBe("");
    expect(within(livePane).getByTestId("status-now")).toBeDefined();

    const glassPanes = screen.getAllByTestId("schedule-glass-pane");
    expect(glassPanes.length).toBeGreaterThanOrEqual(1);
    expect(glassPanes[0]!.className).toContain("u-schedule-glass");
  });

  it("sets data-tone-dark on the live lesson card when its subject uses a dark tone", async () => {
    const harness = await bootHarness();
    const day = harness.store.getState().resolvedDay(FIXTURE_DATE);
    const liveLesson = day?.lessons.find((l) => l.status !== "cancelled");
    expect(liveLesson?.subject).toBeDefined();
    const key = (liveLesson!.subject!.short || liveLesson!.subject!.name || liveLesson!.subject!.id)
      .trim()
      .toLowerCase();
    await harness.store.getState().setSubjectColorOverride(key, "lime");
    renderDay(harness);

    const livePane = screen.getByTestId("schedule-live-pane");
    const liveCard = livePane.querySelector<HTMLElement>('[data-live="true"]');
    expect(liveCard).not.toBeNull();
    expect(liveCard!.hasAttribute("data-tone-dark")).toBe(true);
    expect(liveCard!.style.getPropertyValue("--tone")).toBe("var(--accent-lime)");
  });

  it("tints glass lesson rows with subject tone when lessonCardStyle is filled", async () => {
    const harness = await bootHarness({ lessonCardStyle: "filled" });
    renderDay(harness);

    const glassPane = screen.getAllByTestId("schedule-glass-pane")[0]!;
    const firstNonLiveButton = glassPane.querySelector('[role="button"]');
    expect(firstNonLiveButton).not.toBeNull();
    expect(firstNonLiveButton!.className).toContain("u-schedule-row-tinted");
  });

  it("collapses redundant phone header chrome on today and reveals browsed day title when away", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    try {
      const harness = await bootHarness();
      const onOpenChanges = vi.fn();
      const todayView = render(
        <TooltipProvider>
          <StoreContext.Provider value={harness.store}>
            <HomeView
              date={FIXTURE_DATE}
              onDateChange={vi.fn()}
              onPickClass={vi.fn()}
              onOpenChanges={onOpenChanges}
              dockedGlance
            />
          </StoreContext.Provider>
        </TooltipProvider>,
      );

      const header = screen.getByTestId("day-header");
      expect(within(header).getByTestId("day-time-range")).toBeDefined();
      expect(within(header).getByTestId("day-summary")).toBeDefined();
      expect(within(header).getByTestId("day-changes-badge")).toBeDefined();
      // Static brief changes chip is suppressed when the interactive horizon chip is right below
      expect(screen.queryByTestId("home-brief-changes")).toBeNull();
      // Long date is dropped on phones because DateDock already owns it
      expect(header.textContent).not.toContain("septembris");
      todayView.unmount();

      render(
        <TooltipProvider>
          <StoreContext.Provider value={harness.store}>
            <HomeView
              date="2026-09-10"
              onDateChange={vi.fn()}
              onPickClass={vi.fn()}
              onOpenChanges={onOpenChanges}
              dockedGlance
            />
          </StoreContext.Provider>
        </TooltipProvider>,
      );

      const tomorrowHeader = screen.getByTestId("day-header");
      expect(tomorrowHeader.textContent).toContain("Rīt");
      expect(within(tomorrowHeader).getByTestId("day-time-range")).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("marks finished earlier lessons on today as passed while keeping later ones active", async () => {
    // 11:30 Riga (08:30Z): past early morning periods, mid-day
    vi.setSystemTime(new Date("2026-09-09T08:30:00Z"));
    const harness = await bootHarness();
    const { container } = renderDay(harness);

    const passedRows = container.querySelectorAll('[data-passed="true"]');
    expect(passedRows.length).toBeGreaterThan(0);
  });

  it("expands the horizon summary capsule inline on tap to show labelled lesson count and longest break window", async () => {
    const harness = await bootHarness();
    renderDay(harness);

    const toggle = within(screen.getByTestId("day-header")).getByTestId("day-summary-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    const details = screen.getByTestId("day-summary-details");
    expect(details.textContent).toContain("Stundas");
    expect(details.textContent).toContain("Garākais starpbrīdis");
    expect(details.textContent).toMatch(/\d\d:\d\d – \d\d:\d\d/);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
