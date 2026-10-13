import { useState, type FormEvent } from "react";
import { Button, Card, Icon, TopBar } from "@/ds";
import type { TransitDestination } from "@/db";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";

const LIVE_MAP_URL = "https://saraksti.lv/#riga/map";
const RVT_ADDRESS = "Krišjāņa Valdemāra iela 1C, Rīga";

const googleTransitUrl = (origin?: string) => {
  const params = new URLSearchParams({
    api: "1",
    destination: `Rīgas Valsts tehnikums, ${RVT_ADDRESS}`,
    travelmode: "transit",
  });
  if (origin) params.set("origin", origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const TransitView = () => {
  const t = useT();
  const destinations = useAppStore((s) => s.settings.transitDestinations);
  const setDestinations = useAppStore((s) => s.setTransitDestinations);
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

          <div className="mb-3 rounded-xl bg-sunken p-3">
            <div className="mb-3">
              <span className="block font-text text-body-sm font-semibold text-strong">
                {t("transit.destinations.currentLocation")}
              </span>
              <span className="block font-text text-caption text-muted">
                {t("transit.destinations.rvtAddress", { address: RVT_ADDRESS })}
              </span>
            </div>
            <Button
              block
              size="lg"
              icon="map-pin"
              onClick={() => window.open(googleTransitUrl(), "_blank", "noopener,noreferrer")}
            >
              {t("transit.destinations.openGoogleMaps")}
            </Button>
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
                  <Button
                    block
                    size="lg"
                    variant="outline"
                    icon="arrow-right"
                    onClick={() =>
                      window.open(
                        googleTransitUrl(destination.address),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    {t("transit.destinations.openGoogleMaps")}
                  </Button>
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
              allow="geolocation"
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
