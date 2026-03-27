import { parseLocation } from "./locationMapper";
import { resolveCvIslandRecovery } from "./cvIslandRecovery";

export interface CvLocationInput {
  id: string;
  sourceId: string;
  title?: string;
  description?: string;
  sourceUrl?: string | null;
  listLocation?: string;
  rawCity?: string;
  rawArea?: string;
  rawIsland?: string;
}

export interface CvNormalizedLocation {
  island?: string;
  city?: string;
  area?: string;
}

function cleanValue(value?: string | null): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : undefined;
}

export function resolveCvNormalizedLocation(input: CvLocationInput): CvNormalizedLocation {
  const explicitCity = cleanValue(input.rawCity);
  const explicitArea = cleanValue(input.rawArea);
  const explicitIsland = cleanValue(input.rawIsland);

  let island: string | undefined;
  let city: string | undefined = explicitCity;

  if (explicitIsland) {
    island = parseLocation(explicitIsland, "cv").island;
  }

  if (!island && input.listLocation) {
    const locationResult = parseLocation(input.listLocation, "cv");
    island = locationResult.island;
    if (!city) {
      city = locationResult.city;
    }
  }

  if (!island && input.title) {
    const titleResult = parseLocation(input.title, "cv");
    island = titleResult.island;
    if (!city) {
      city = titleResult.city;
    }
  }

  if (!island && input.description) {
    const descResult = parseLocation(input.description.substring(0, 500), "cv");
    island = descResult.island;
    if (!city) {
      city = descResult.city;
    }
  }

  if (!island) {
    const recovery = resolveCvIslandRecovery({
      id: input.id,
      sourceId: input.sourceId,
      title: input.title,
      description: input.description,
      sourceUrl: input.sourceUrl || null,
      rawIsland: explicitIsland || input.listLocation,
      rawCity: explicitCity,
    });
    if (recovery.kind === "resolved") {
      island = recovery.island;
      if (!city) {
        city = recovery.city ?? undefined;
      }
    }
  }

  return {
    island,
    city,
    area: explicitArea,
  };
}
