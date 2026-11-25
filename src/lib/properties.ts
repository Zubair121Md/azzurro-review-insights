export type PropertyId = "olympic-paddington" | "potts-point" | "central-sydney" | "darling-harbour";

export interface PropertyConfig {
  id: PropertyId;
  name: string;
  shortName: string;
  area: string;
  /** Booking.com country code + page name, i.e. booking.com/hotel/{countryCode}/{pageName}.html */
  countryCode: string;
  pageName: string;
  accent: string;
}

export const PROPERTIES: PropertyConfig[] = [
  {
    id: "olympic-paddington",
    name: "Olympic Hotel Paddington",
    shortName: "Paddington",
    area: "Paddington",
    countryCode: "au",
    pageName: "olympic-paddington",
    accent: "#8b5cf6",
  },
  {
    id: "potts-point",
    name: "Azzurro Pod Hotel Potts Point",
    shortName: "Potts Point",
    area: "Potts Point",
    countryCode: "au",
    pageName: "venus-potts-point-sydney",
    accent: "#0ea5e9",
  },
  {
    id: "central-sydney",
    name: "Azzurro Pod Hotel Central Sydney",
    shortName: "Central Sydney",
    area: "Surry Hills",
    countryCode: "au",
    pageName: "venus-surry-hills",
    accent: "#f59e0b",
  },
  {
    id: "darling-harbour",
    name: "Azzurro Pod Hotel Darling Harbour",
    shortName: "Darling Harbour",
    area: "Darling Harbour",
    countryCode: "au",
    pageName: "chateau-de-venus",
    accent: "#10b981",
  },
];

export const PROPERTY_BY_ID = Object.fromEntries(PROPERTIES.map((p) => [p.id, p])) as Record<
  PropertyId,
  PropertyConfig
>;

export function bookingUrl(p: Pick<PropertyConfig, "countryCode" | "pageName">): string {
  return `https://www.booking.com/hotel/${p.countryCode}/${p.pageName}.en-gb.html`;
}
