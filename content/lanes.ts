/**
 * Trade lanes.
 *
 * Port and airport codes are real UN/LOCODE and IATA. Transit times are
 * market-typical indications, NOT quoted schedules — every surface that shows
 * them labels them INDICATIVE. Replace `transit` with your own carrier
 * schedules before launch; nothing else has to change.
 */

export type Mode = "SEA" | "AIR";

export interface Place {
  /** UN/LOCODE for seaports, IATA for airports. */
  code: string;
  name: string;
  country: string;
}

export interface Lane {
  origin: Place;
  destination: Place;
  mode: Mode;
  /** Port-to-port transit in days, low and high. Indicative. */
  transit: [number, number];
  region: Region;
  /** Shown in mono beside the lane. */
  service: string;
}

export type Region =
  | "The Gulf & Middle East"
  | "East & Southeast Asia"
  | "Africa"
  | "Europe & Global"
  | "West & Central Asia";

/**
 * The client's own framing of each region, shown as the panel's lead. The lane
 * rows beneath it are the evidence for the claim.
 */
export const REGION_DETAIL: Record<Region, { highlight: string; modes: string }> = {
  "The Gulf & Middle East": {
    highlight:
      "Extensive connectivity to the UAE, Oman, Qatar, and Saudi Arabia.",
    modes: "Sea (FCL/LCL) & Air",
  },
  "East & Southeast Asia": {
    highlight:
      "Direct links to major manufacturing hubs in China, Hong Kong, Singapore, and Malaysia.",
    modes: "Sea (FCL/LCL)",
  },
  Africa: {
    highlight:
      "Robust routing to East, Southern, and West Africa, including complex inland deliveries.",
    modes: "Sea & Multimodal",
  },
  "Europe & Global": {
    highlight:
      "Rapid air consolidations to key European transit hubs like London Heathrow.",
    modes: "Air",
  },
  "West & Central Asia": {
    highlight: "Tailored routing for specialised regional markets.",
    modes: "Sea & Air",
  },
};

/* Indian gateways --------------------------------------------------------- */

export const GATEWAYS = {
  nhavaSheva: { code: "INNSA", name: "Nhava Sheva", country: "India" },
  mundra: { code: "INMUN", name: "Mundra", country: "India" },
  tughlakabad: { code: "INTKD", name: "ICD Tughlakabad", country: "India" },
  chennai: { code: "INMAA", name: "Chennai", country: "India" },
  delhiAir: { code: "DEL", name: "Delhi", country: "India" },
  mumbaiAir: { code: "BOM", name: "Mumbai", country: "India" },
} as const satisfies Record<string, Place>;

const G = GATEWAYS;

const lane = (
  origin: Place,
  destination: Place,
  mode: Mode,
  transit: [number, number],
  region: Region,
  service: string,
): Lane => ({ origin, destination, mode, transit, region, service });

export const LANES: Lane[] = [
  /* Gulf ------------------------------------------------------------------ */
  lane(G.nhavaSheva, { code: "AEJEA", name: "Jebel Ali", country: "UAE" }, "SEA", [5, 7], "The Gulf & Middle East", "FCL / LCL weekly"),
  lane(G.mundra, { code: "AEPRA", name: "Port Rashid", country: "UAE" }, "SEA", [6, 8], "The Gulf & Middle East", "FCL fortnightly"),
  lane(G.nhavaSheva, { code: "AEKHL", name: "Khalifa Port", country: "UAE" }, "SEA", [6, 8], "The Gulf & Middle East", "FCL weekly"),
  lane(G.mundra, { code: "QAHMD", name: "Hamad Port", country: "Qatar" }, "SEA", [7, 9], "The Gulf & Middle East", "FCL weekly"),
  lane(G.nhavaSheva, { code: "OMSOH", name: "Sohar", country: "Oman" }, "SEA", [4, 6], "The Gulf & Middle East", "FCL / LCL weekly"),
  lane(G.nhavaSheva, { code: "OMMCT", name: "Muscat", country: "Oman" }, "SEA", [5, 7], "The Gulf & Middle East", "LCL fortnightly"),
  lane(G.mundra, { code: "SADMM", name: "Dammam", country: "Saudi Arabia" }, "SEA", [8, 11], "The Gulf & Middle East", "FCL weekly"),
  lane(G.nhavaSheva, { code: "SAJED", name: "Jeddah", country: "Saudi Arabia" }, "SEA", [9, 12], "The Gulf & Middle East", "FCL weekly"),
  lane(G.delhiAir, { code: "DXB", name: "Dubai", country: "UAE" }, "AIR", [1, 2], "The Gulf & Middle East", "Daily, DGR accepted"),

  /* East and Southeast Asia ----------------------------------------------- */
  lane(G.nhavaSheva, { code: "CNSHA", name: "Shanghai", country: "China" }, "SEA", [18, 22], "East & Southeast Asia", "FCL weekly"),
  lane(G.nhavaSheva, { code: "CNNGB", name: "Ningbo", country: "China" }, "SEA", [17, 21], "East & Southeast Asia", "FCL weekly"),
  lane(G.chennai, { code: "CNTAO", name: "Qingdao", country: "China" }, "SEA", [20, 24], "East & Southeast Asia", "FCL fortnightly"),
  lane(G.chennai, { code: "HKHKG", name: "Hong Kong", country: "Hong Kong SAR" }, "SEA", [14, 18], "East & Southeast Asia", "FCL / LCL weekly"),
  lane(G.nhavaSheva, { code: "SGSIN", name: "Singapore", country: "Singapore" }, "SEA", [10, 13], "East & Southeast Asia", "FCL / LCL weekly"),
  lane(G.chennai, { code: "MYPKG", name: "Port Klang", country: "Malaysia" }, "SEA", [9, 12], "East & Southeast Asia", "FCL weekly"),

  /* West and Central Asia -------------------------------------------------- */
  lane(G.nhavaSheva, { code: "IRBND", name: "Bandar Abbas", country: "Iran" }, "SEA", [6, 8], "West & Central Asia", "FCL, sanctions screened"),
  lane(G.delhiAir, { code: "KBL", name: "Kabul", country: "Afghanistan" }, "AIR", [1, 2], "West & Central Asia", "Charter and consol"),

  /* East and Southern Africa ----------------------------------------------- */
  lane(G.mundra, { code: "SDPZU", name: "Port Sudan", country: "Sudan" }, "SEA", [14, 18], "Africa", "FCL monthly"),
  lane(G.nhavaSheva, { code: "TZDAR", name: "Dar es Salaam", country: "Tanzania" }, "SEA", [16, 20], "Africa", "FCL / LCL fortnightly"),
  lane(G.nhavaSheva, { code: "UGKLA", name: "Kampala", country: "Uganda" }, "SEA", [26, 32], "Africa", "Sea plus road via Mombasa"),
  lane(G.nhavaSheva, { code: "ZADUR", name: "Durban", country: "South Africa" }, "SEA", [18, 23], "Africa", "FCL fortnightly"),
  lane(G.nhavaSheva, { code: "ZACPT", name: "Cape Town", country: "South Africa" }, "SEA", [21, 26], "Africa", "FCL monthly"),
  lane(G.nhavaSheva, { code: "MUPLU", name: "Port Louis", country: "Mauritius" }, "SEA", [12, 16], "Africa", "LCL fortnightly"),

  /* West Africa ------------------------------------------------------------ */
  lane(G.nhavaSheva, { code: "GNCKY", name: "Conakry", country: "Guinea" }, "SEA", [28, 35], "Africa", "FCL monthly, transhipped"),

  /* Europe ----------------------------------------------------------------- */
  lane(G.delhiAir, { code: "LHR", name: "London Heathrow", country: "United Kingdom" }, "AIR", [1, 2], "Europe & Global", "Daily consol"),
];

export const REGIONS: Region[] = [
  "The Gulf & Middle East",
  "East & Southeast Asia",
  "Africa",
  "Europe & Global",
  "West & Central Asia",
];

/* Figures derived from the table above, so the page can never claim a number
   it does not actually list. */
export const LANE_COUNT = LANES.length;
export const DESTINATION_COUNT = new Set(LANES.map((l) => l.destination.code)).size;
export const GATEWAY_COUNT = new Set(LANES.map((l) => l.origin.code)).size;
export const COUNTRY_COUNT = new Set(LANES.map((l) => l.destination.country)).size;

/** The hero's live strip. */
export const FEATURED_LANES = [
  LANES[0],
  LANES[8],
  LANES[13],
  LANES[19],
];
