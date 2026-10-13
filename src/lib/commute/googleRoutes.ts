/**
 * Google Routes API adapter for the Transit screen. Route data stays short-lived in the app store;
 * saved home details remain in the on-device settings cache.
 */
export type TransitRouteQuery = {
  origin: string;
  destination: string;
  time: string;
  timeKind: "arrival" | "departure";
  language: string;
};

export type TransitRouteStep = {
  mode: string;
  duration: string;
  instruction: string;
  lineName: string;
  lineColor: string;
  lineTextColor: string;
  departureStop: string;
  arrivalStop: string;
  departureTime: string;
  arrivalTime: string;
  endLatitude: number | null;
  endLongitude: number | null;
};

export type TransitRoute = {
  duration: string;
  durationSeconds: number;
  distanceMeters: number;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  steps: TransitRouteStep[];
};

type RawStep = {
  travelMode?: string;
  duration?: string;
  localizedValues?: { staticDuration?: { text?: string } };
  navigationInstruction?: { instructions?: string };
  endLocation?: { latLng?: { latitude?: number; longitude?: number } };
  transitDetails?: {
    transitLine?: { nameShort?: string; name?: string; color?: string; textColor?: string };
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
      departureTime?: string;
      arrivalTime?: string;
    };
  };
};

type RawRoute = {
  duration?: string;
  distanceMeters?: number;
  localizedValues?: { duration?: { text?: string } };
  legs?: Array<{
    steps?: RawStep[];
  }>;
};

const addressOrCoordinate = (value: string) => {
  const coordinates = value.split(",").map(Number);
  if (coordinates.length === 2 && coordinates.every(Number.isFinite)) {
    return { location: { latLng: { latitude: coordinates[0], longitude: coordinates[1] } } };
  }
  return { address: value };
};

const clock = (time: string | undefined, language: string) => {
  if (time === undefined) return "";
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(language, {
    timeZone: "Europe/Riga",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(parsed);
};

export const getTransitRoutes = async (query: TransitRouteQuery): Promise<TransitRoute[]> => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_ROUTES_API_KEY as string | undefined;
  if (!key) throw new Error("missing-key");

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.localizedValues.duration,routes.legs.steps.travelMode,routes.legs.steps.duration,routes.legs.steps.localizedValues.staticDuration,routes.legs.steps.navigationInstruction.instructions,routes.legs.steps.transitDetails,routes.legs.steps.endLocation.latLng",
    },
    body: JSON.stringify({
      origin: addressOrCoordinate(query.origin),
      destination: addressOrCoordinate(query.destination),
      travelMode: "TRANSIT",
      computeAlternativeRoutes: true,
      regionCode: "LV",
      languageCode: query.language,
      ...(query.timeKind === "arrival"
        ? { arrivalTime: query.time }
        : { departureTime: query.time }),
      transitPreferences: { routingPreference: "FEWER_TRANSFERS" },
    }),
  });
  if (!response.ok) throw new Error(`routes-${response.status}`);
  const payload = (await response.json()) as { routes?: RawRoute[] };
  return (payload.routes ?? []).map((route) => ({
    duration: route.localizedValues?.duration?.text ?? route.duration ?? "",
    durationSeconds: Number.parseFloat(route.duration ?? "") || 0,
    distanceMeters: route.distanceMeters ?? 0,
    destinationLatitude: route.legs?.at(-1)?.steps?.at(-1)?.endLocation?.latLng?.latitude ?? null,
    destinationLongitude: route.legs?.at(-1)?.steps?.at(-1)?.endLocation?.latLng?.longitude ?? null,
    steps: (route.legs ?? []).flatMap((leg) =>
      (leg.steps ?? []).map((step) => {
        const line = step.transitDetails?.transitLine;
        const stops = step.transitDetails?.stopDetails;
        return {
          mode: step.travelMode ?? "WALK",
          duration: step.localizedValues?.staticDuration?.text ?? step.duration ?? "",
          instruction: step.navigationInstruction?.instructions ?? "",
          lineName: line?.nameShort ?? line?.name ?? "",
          lineColor: line?.color ? `#${line.color.replace(/^#/, "")}` : "",
          lineTextColor: line?.textColor ? `#${line.textColor.replace(/^#/, "")}` : "",
          departureStop: stops?.departureStop?.name ?? "",
          arrivalStop: stops?.arrivalStop?.name ?? "",
          departureTime: clock(stops?.departureTime, query.language),
          arrivalTime: clock(stops?.arrivalTime, query.language),
          endLatitude: step.endLocation?.latLng?.latitude ?? null,
          endLongitude: step.endLocation?.latLng?.longitude ?? null,
        };
      }),
    ),
  }));
};
