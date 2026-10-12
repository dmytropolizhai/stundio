/**
 * University mode in the UI: the institution step, the RTU / LU group picker (live catalogue,
 * subgroup question, offline state) and what Settings / the tab bar show for the role.
 * The store is real; the universities are the `data/` fixtures behind a fake transport.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createAppStore, StoreContext, type Store } from "@/store";
import { createMemoryCache } from "@/db";
import { createSyncEngine } from "@/sync";
import type { UniversityGroupRef } from "@/lib/university";
import { createFakeUniversity, type FakeUniversity } from "@/lib/university/__tests__/fixtures.ts";
import { OnboardingInstitution } from "../screens/onboarding-institution";
import { UniversityPicker } from "../screens/university-picker";
import { SettingsView } from "../screens/settings-view";
import { IdentitySheet } from "../screens/sheets/IdentitySheet.tsx";
import { TabBar } from "../components/TabBar.tsx";
import { ClassBadge } from "../components/ClassBadge.tsx";
import { SubjectsView } from "../screens/subjects-view";
import { clickAndSettle } from "./harness.tsx";

const RTU_GROUP: UniversityGroupRef = {
  university: "rtu",
  id: "38532",
  label: "RABA0 · 1. k. · 1. gr.",
  program: "Arhitektūra",
  programEn: "Architecture",
  course: 1,
  number: "1",
};
/** How the picker and the chip say RTU_GROUP in Latvian. */
const RTU_GROUP_LV = "RABA0 · 1. kurss · 1. grupa";
const LU_GROUP: UniversityGroupRef = {
  university: "lu",
  id: "26R-21023-PLK-1",
  label: "26R-21023 · Pilna laika: klātiene · 1. sem.",
  program: "Fizika",
};
const SEARCH = "Meklēt programmu, kodu vai grupu…";

const boot = async (
  university: "rtu" | "lu" = "lu",
): Promise<{ store: Store; fake: FakeUniversity }> => {
  const fake = createFakeUniversity();
  const cache = createMemoryCache();
  const store = createAppStore({
    cache,
    engine: createSyncEngine({
      http: fake.http,
      cache,
      now: () => new Date("2026-10-12T08:00:00Z"),
    }),
  });
  await store.getState().hydrate();
  await store.getState().setUniversity(university);
  return { store, fake };
};

const wrap = (store: Store, node: React.ReactNode) =>
  render(<StoreContext.Provider value={store}>{node}</StoreContext.Provider>);

describe("OnboardingInstitution", () => {
  it("offers RVT, RTU and LU and reports the pick", async () => {
    const { store } = await boot();
    const onSelect = vi.fn();
    wrap(store, <OnboardingInstitution onSelect={onSelect} />);

    expect(screen.getByText("Kur tu mācies?")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Rīgas Tehniskā universitāte/ }));
    fireEvent.click(screen.getByRole("button", { name: /Rīgas Valsts tehnikums/ }));
    expect(onSelect.mock.calls).toEqual([["rtu"], ["rvt"]]);
  });
});

const search = async (value: string) => {
  fireEvent.change(await screen.findByLabelText(SEARCH), { target: { value } });
};

describe("UniversityPicker", () => {
  it("walks LU program → group → subgroup and commits them together", async () => {
    const { store } = await boot("lu");
    const onPicked = vi.fn();
    wrap(store, <UniversityPicker onPicked={onPicked} />);

    expect(screen.getByText("Ielādē programmu sarakstu…")).toBeDefined();
    await screen.findAllByText("Fizika");
    expect(screen.getByAltText("LU")).toBeDefined();

    await search("21023");
    // The program row, not the matching group that names the program under it.
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Fizika 21023/ }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText(LU_GROUP.label));
    });
    await screen.findByText("Izvēlies apakšgrupu");
    // Nothing is committed while the subgroup question is open.
    expect(store.getState().settings.universityGroup).toBeNull();

    await clickAndSettle(() => {
      fireEvent.click(screen.getByText("fiziviens"));
    });
    expect(store.getState().settings.universityGroup).toEqual(LU_GROUP);
    expect(store.getState().settings.universitySubgroup).toBe("fiziviens");
    expect(store.getState().settings.persona).toBe("university");
    expect(onPicked).toHaveBeenCalled();
  });

  it("finds an LU group straight from the search, whatever its program", async () => {
    const { store } = await boot("lu");
    wrap(store, <UniversityPicker />);
    // The group's own code and semester — no program picked first.
    await search("26R-21023 1. sem");
    const groups = await screen.findByText("Grupas");
    const list = groups.parentElement as HTMLElement;
    expect(within(list).getByText(LU_GROUP.label)).toBeDefined();
    await clickAndSettle(() => {
      fireEvent.click(within(list).getByText(LU_GROUP.label));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Visas apakšgrupas" }));
    });
    expect(store.getState().settings.universityGroup).toEqual(LU_GROUP);
    expect(store.getState().settings.universitySubgroup).toBeNull();
  });

  it("looks up an RTU program's groups once a search narrows to it", async () => {
    const { store, fake } = await boot("rtu");
    wrap(store, <UniversityPicker />);
    await search("RABA0");
    expect(await screen.findByText(RTU_GROUP_LV)).toBeDefined();
    expect(fake.requests.some((r) => r.url.endsWith("/findGroupByCourseId"))).toBe(true);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText(RTU_GROUP_LV));
    });
    await waitFor(() => {
      expect(store.getState().settings.universityGroup).toEqual(RTU_GROUP);
    });
  });

  it("does not fetch RTU groups for a broad search", async () => {
    const { store, fake } = await boot("rtu");
    wrap(store, <UniversityPicker />);
    await search("a");
    await screen.findAllByText("Arhitektūra");
    expect(fake.requests.some((r) => r.url.endsWith("/findGroupByCourseId"))).toBe(false);
  });

  it("commits an RTU group from its program straight away — RTU has no subgroups", async () => {
    const { store } = await boot("rtu");
    const onPicked = vi.fn();
    wrap(store, <UniversityPicker onPicked={onPicked} />);

    await screen.findAllByText("Arhitektūra");
    await clickAndSettle(() => {
      fireEvent.click(screen.getAllByText("Arhitektūra")[0] as HTMLElement);
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText(RTU_GROUP_LV));
    });
    await waitFor(() => {
      expect(onPicked).toHaveBeenCalled();
    });
    expect(store.getState().settings.universityGroup).toEqual(RTU_GROUP);
  });

  it("shows the universities' English names to an English-speaking student", async () => {
    const { store, fake } = await boot("rtu");
    await store.getState().setLang("en");
    wrap(store, <UniversityPicker />);
    expect((await screen.findAllByText("Architecture")).length).toBeGreaterThan(0);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "LU" }));
    });
    expect(await screen.findByText("Library Science and Information")).toBeDefined();
    // LU's English page needs its language session.
    expect(fake.requests.some((r) => r.url.endsWith("/lang/en"))).toBe(true);
    // English names are searchable too.
    fireEvent.change(screen.getByLabelText("Search program, code or group…"), {
      target: { value: "library science" },
    });
    // The program, and its groups captioned with the English program name.
    expect(screen.getByText("Groups")).toBeDefined();
    expect(screen.getAllByText("Library Science and Information").length).toBeGreaterThan(1);
  });

  it("keeps Latvian names when the user asks for them", async () => {
    const { store, fake } = await boot("lu");
    await store.getState().setLang("en");
    await store.getState().setUniversityNames("lv");
    wrap(store, <UniversityPicker />);
    expect(await screen.findByText("Bibliotēkzinātne un informācija")).toBeDefined();
    expect(fake.requests.some((r) => r.url.endsWith("/lang/en"))).toBe(false);
  });

  it("goes back from the groups to the programs", async () => {
    const { store } = await boot("rtu");
    wrap(store, <UniversityPicker />);
    await screen.findAllByText("Arhitektūra");
    await clickAndSettle(() => {
      fireEvent.click(screen.getAllByText("Arhitektūra")[0] as HTMLElement);
    });
    await screen.findByText(RTU_GROUP_LV);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText(/RABA0 · Arhitektūra/));
    });
    expect(screen.getByLabelText(SEARCH)).toBeDefined();
  });

  it("retries a program's groups that failed to load", async () => {
    const { store, fake } = await boot("rtu");
    wrap(store, <UniversityPicker />);
    await screen.findAllByText("Arhitektūra");
    fake.offline = true;
    await clickAndSettle(() => {
      fireEvent.click(screen.getAllByText("Arhitektūra")[0] as HTMLElement);
    });
    expect(await screen.findByText("Neizdevās ielādēt sarakstu")).toBeDefined();
    fake.offline = false;
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
    });
    expect(await screen.findByText(RTU_GROUP_LV)).toBeDefined();
  });

  it("switches university from the tabs", async () => {
    const { store } = await boot("lu");
    wrap(store, <UniversityPicker />);
    await screen.findAllByText("Fizika");
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "RTU" }));
    });
    expect(store.getState().settings.university).toBe("rtu");
    await screen.findAllByText("Arhitektūra");
    expect(screen.getByAltText("RTU")).toBeDefined();
  });

  it("says nothing matched", async () => {
    const { store } = await boot("lu");
    wrap(store, <UniversityPicker />);
    await search("zzzz");
    expect(await screen.findByText("Nekas netika atrasts")).toBeDefined();
  });

  it("shows an offline state with a retry", async () => {
    const { store, fake } = await boot("lu");
    fake.offline = true;
    wrap(store, <UniversityPicker />);
    expect(await screen.findByText("Neizdevās ielādēt sarakstu")).toBeDefined();

    fake.offline = false;
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
    });
    expect((await screen.findAllByText("Fizika")).length).toBeGreaterThan(0);
  });

  it("still saves the group when its preview fails offline", async () => {
    const { store, fake } = await boot("rtu");
    wrap(store, <UniversityPicker />);
    await screen.findAllByText("Arhitektūra");
    await clickAndSettle(() => {
      fireEvent.click(screen.getAllByText("Arhitektūra")[0] as HTMLElement);
    });
    await screen.findByText(RTU_GROUP_LV);
    fake.offline = true;
    await clickAndSettle(() => {
      fireEvent.click(screen.getByText(RTU_GROUP_LV));
    });
    await waitFor(() => {
      expect(store.getState().settings.universityGroup).toEqual(RTU_GROUP);
    });
  });
});

describe("university role chrome", () => {
  it("has no Changes tab", async () => {
    const { store } = await boot("rtu");
    await store.getState().setUniversityGroup(RTU_GROUP);
    wrap(store, <TabBar tab="home" onChange={vi.fn()} />);
    const schedule = screen.getByRole("navigation", { name: "Grafiks" });
    expect(within(schedule).queryByRole("button", { name: "Izmaiņas" })).toBeNull();
  });

  it("badges the group label in the app's language", async () => {
    const { store } = await boot("rtu");
    await store.getState().setUniversityGroup(RTU_GROUP);
    const { unmount } = wrap(store, <ClassBadge onClick={vi.fn()} />);
    expect(screen.getByText(RTU_GROUP_LV)).toBeDefined();
    unmount();
    await store.getState().setLang("en");
    wrap(store, <ClassBadge onClick={vi.fn()} />);
    expect(screen.getByText("RABA0 · Year 1 · Group 1")).toBeDefined();
  });

  it("offers the names language in Settings", async () => {
    const { store } = await boot("rtu");
    await store.getState().setUniversityGroup(RTU_GROUP);
    wrap(store, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Nosaukumu valoda/ }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "English" }));
    });
    expect(store.getState().settings.universityNames).toBe("en");
  });

  it("lists the group's own subjects, with their lecturers", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-14T08:00:00Z") });
    try {
      const { store } = await boot("lu");
      await store.getState().setUniversityGroup(LU_GROUP);
      await store.getState().refresh();
      wrap(store, <SubjectsView />);
      expect(screen.getAllByText("Fizika I").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Barinovs/).length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("logos every school on the onboarding step", async () => {
    const { store } = await boot();
    wrap(store, <OnboardingInstitution onSelect={vi.fn()} />);
    expect(screen.getByAltText("RVT")).toBeDefined();
    expect(screen.getByAltText("RTU")).toBeDefined();
    expect(screen.getByAltText("LU")).toBeDefined();
  });

  it("offers the LU subgroup in Settings and hides RVT-only rows", async () => {
    const { store } = await boot("lu");
    await store.getState().setUniversityGroup(LU_GROUP);
    await store.getState().refresh();
    wrap(store, <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />);

    expect(screen.queryByText("Pārceltās stundas rādīt jaunajā dienā")).toBeNull();
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Apakšgrupa/ }));
    });
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "fizitris" }));
    });
    expect(store.getState().settings.universitySubgroup).toBe("fizitris");
  });

  it("switches to university mode from the identity sheet and opens the group picker", async () => {
    const { store } = await boot("rtu");
    await store.getState().setPersona("student");
    const onPickUniversityGroup = vi.fn();
    wrap(
      store,
      <IdentitySheet
        open
        onClose={vi.fn()}
        onPickClass={vi.fn()}
        onPickTeacher={vi.fn()}
        onPickUniversityGroup={onPickUniversityGroup}
      />,
    );
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("radio", { name: "Students" }));
    });
    expect(store.getState().settings.persona).toBe("university");
    await clickAndSettle(() => {
      fireEvent.click(screen.getByRole("button", { name: /Mainīt/ }));
    });
    expect(onPickUniversityGroup).toHaveBeenCalled();
  });
});
