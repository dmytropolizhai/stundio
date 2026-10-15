/**
 * Saved route origins and the public live map. Campus choices come from cached EduPage data;
 * Google Maps handles routing through ordinary external links, without API keys or device GPS.
 */
import { useState, type FormEvent } from "react";
import { Button, Card, Icon, TopBar } from "@/ds";
import type { TransitDestination } from "@/db";
import { selectTimetables } from "@/lib/edupage";
import { dayProgress } from "@/lib/schedule";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";

const LIVE_MAP_URL = "https://saraksti.lv/#riga/map";
const googleTransitUrl = (building: string, origin: string) => {
  const params = new URLSearchParams({
    api: "1",
    destination: `Rīgas Valsts tehnikums, ${building}`,
    travelmode: "transit",
  });
  if (origin.trim()) params.set("origin", origin.trim());
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const TransitView = () => {
  const t = useT();
  const destinations = useAppStore((s) => s.settings.transitDestinations);
  const setDestinations = useAppStore((s) => s.setTransitDestinations);
  const home = useAppStore((s) => s.settings.commuteHome);
  const pinnedBuilding = useAppStore((s) => s.settings.building);
  const classId = useAppStore((s) => s.settings.selectedClassId);
  const metas = useAppStore((s) => s.metas);
  const now = useNow();
  const day = useAppStore((s) => s.resolvedDay(now.date));
  const buildings = selectTimetables(metas, now.date)
    .map(({ meta }) => meta.building)
    .filter(Boolean);
  const progress = dayProgress(day, now);
  const suggestedBuilding =
    progress.current?.building ??
    progress.next?.building ??
    pinnedBuilding ??
    (buildings.length === 1 ? buildings[0] : null);
  // An explicit choice belongs to this class, date and pin, rather than leaking to a new one.
  const context = `${classId}|${now.date}|${pinnedBuilding}`;
  const [choice, setChoice] = useState<{ context: string; building: string } | null>(null);
  const candidate = choice?.context === context ? choice.building : suggestedBuilding;
  const building = candidate && buildings.includes(candidate) ? candidate : "";
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");

  const addDestination = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLabel = label.trim();
    const nextAddress = address.trim();
    if (!nextLabel || !nextAddress) return;
    const destination: TransitDestination = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      label: nextLabel,
      address: nextAddress,
    };
    void setDestinations([...destinations, destination]);
    setLabel("");
    setAddress("");
  };

  const removeDestination = (id: string) => {
    void setDestinations(destinations.filter((destination) => destination.id !== id));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
        <TopBar title={t("transit.title")} />

        <Card className="mb-4 p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-strong">
              <Icon name="map-pin" size={21} />
            </div>
            <div>
              <h2 className="font-display text-title font-semibold text-strong">
                {t("transit.destinations.title")}
              </h2>
              <p className="mt-1 font-text text-body-sm text-muted">
                {t("transit.destinations.description")}
              </p>
            </div>
          </div>

          <label className="mb-3 block font-text text-body-sm font-semibold text-strong">
            {t("transit.destinations.building")}
            <select
              value={building}
              onChange={(event) => setChoice({ context, building: event.currentTarget.value })}
              className="mt-1 min-h-12 w-full rounded-xl border border-hairline bg-card px-3 font-text text-body-sm text-strong focus:border-brand"
            >
              <option value="">{t("transit.destinations.chooseBuilding")}</option>
              {buildings.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {!building && (
            <p className="mb-3 font-text text-body-sm text-muted">
              {t("transit.destinations.buildingNeeded")}
            </p>
          )}
          <div className="mb-3 rounded-xl bg-sunken p-3">
            <div className="mb-3">
              <span className="block font-text text-body-sm font-semibold text-strong">
                {home.trim()
                  ? t("settings.commute.home")
                  : t("transit.destinations.currentLocation")}
              </span>
              {home.trim() && (
                <span className="block break-words font-text text-caption text-muted">{home}</span>
              )}
            </div>
            {building && (
              <Button asChild block size="lg" icon="map-pin">
                <a href={googleTransitUrl(building, home)} target="_blank" rel="noreferrer">
                  {t("transit.destinations.openGoogleMaps")}
                </a>
              </Button>
            )}
          </div>

          {destinations.length > 0 && (
            <ul className="mb-4 space-y-2">
              {destinations.map((destination) => (
                <li key={destination.id} className="rounded-xl bg-sunken p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-text text-body-sm font-semibold text-strong">
                        {destination.label}
                      </span>
                      <span className="block truncate font-text text-caption text-muted">
                        {destination.address}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash-2"
                      aria-label={t("transit.destinations.remove", { label: destination.label })}
                      onClick={() => removeDestination(destination.id)}
                    />
                  </div>
                  {building && (
                    <Button asChild block size="lg" variant="outline" icon="arrow-right">
                      <a
                        href={googleTransitUrl(building, destination.address)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("transit.destinations.openGoogleMaps")}
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className="space-y-3" onSubmit={addDestination}>
            <label className="block">
              <span className="mb-1 block font-text text-caption font-medium text-muted">
                {t("transit.destinations.nameLabel")}
              </span>
              <input
                className="w-full rounded-xl border border-hairline bg-card px-3 py-2.5 font-text text-body-sm text-strong outline-none focus:border-brand"
                value={label}
                onChange={(event) => setLabel(event.currentTarget.value)}
                placeholder={t("transit.destinations.namePlaceholder")}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-text text-caption font-medium text-muted">
                {t("transit.destinations.addressLabel")}
              </span>
              <input
                className="w-full rounded-xl border border-hairline bg-card px-3 py-2.5 font-text text-body-sm text-strong outline-none focus:border-brand"
                value={address}
                onChange={(event) => setAddress(event.currentTarget.value)}
                placeholder={t("transit.destinations.addressPlaceholder")}
                required
              />
            </label>
            <Button block type="submit" icon="plus">
              {t("transit.destinations.add")}
            </Button>
          </form>
        </Card>

        <Card className="mb-4 p-4">
          <h2 className="mb-1 font-display text-title font-semibold text-strong">
            {t("transit.live.title")}
          </h2>
          <p className="mb-3 font-text text-body-sm text-muted">{t("transit.live.description")}</p>
          <div className="overflow-hidden rounded-2xl bg-sunken shadow-card">
            <iframe
              title={t("transit.live.frameTitle")}
              src={LIVE_MAP_URL}
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[min(58svh,660px)] min-h-[400px] w-full border-0 bg-app"
            />
          </div>
          <p className="mt-2 font-text text-caption text-muted">{t("transit.live.source")}</p>
        </Card>
      </div>
    </div>
  );
};
