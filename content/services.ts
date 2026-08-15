/**
 * What Seahive handles. Five, deliberately.
 *
 * Each cell carries a mono reference code. The audience reads reference codes
 * all day, and a service list shaped like an operations document reads truer
 * than one shaped like a brochure.
 *
 * `body` is what fits inside the hexagon — a hexagon's usable text area is the
 * middle half of its height, and copy that overflows the safe zone is copy the
 * corners clip. `detail` is the client's full paragraph, shown beneath the
 * comb, so nothing they wrote is lost to the geometry.
 */

export interface Service {
  /** Mono reference shown in the cell corner. */
  code: string;
  title: string;
  /** Trimmed to the hexagon's safe zone. */
  body: string;
  /** The full paragraph, listed under the comb. */
  detail: string;
}

export const SERVICES: Service[] = [
  {
    code: "SVC-01",
    title: "Ocean freight",
    body: "FCL and LCL ex Nhava Sheva, Mundra, Chennai and Tughlakabad, with the carrier capacity to match.",
    detail:
      "We provide extensive Ocean Freight solutions, managing both Full Container Load (FCL) and Less than Container Load (LCL) shipments. With strong carrier relationships originating from Nhava Sheva, Mundra, Chennai, and Tughlakabad, we secure the capacity and routing you need to keep your goods moving across the globe.",
  },
  {
    code: "SVC-02",
    title: "Air freight",
    body: "Daily consolidations and priority routing ex Delhi and Mumbai, for the deadlines that will not move.",
    detail:
      "When time is the ultimate priority, our Air Freight services ensure rapid global delivery. Operating out of primary hubs like Delhi and Mumbai, we manage daily consolidations, priority routing, and specialised cargo handling to meet the most demanding deadlines.",
  },
  {
    code: "SVC-03",
    title: "Customs clearance",
    body: "Documentation and border formalities handled with precision, at origin and at destination.",
    detail:
      "Cross-border trade requires flawless compliance. Our dedicated customs teams manage all documentation and border formalities with precision. By anticipating regulatory requirements and ensuring accurate filings, we facilitate swift and delay-free clearances at both origin and destination.",
  },
  {
    code: "SVC-04",
    title: "Project cargo & OOG",
    body: "Flat racks, open tops and breakbulk, with routing and securing plans drawn before anything moves.",
    detail:
      "Some cargo simply doesn't fit in a box. For flat racks, open tops, and breakbulk shipments, our project logistics experts design customised routing and securing plans, ensuring the safe transit of heavy, oversized, and high-value equipment.",
  },
  {
    code: "SVC-05",
    title: "Warehousing & distribution",
    body: "Secure storage and consolidation near the gateway, as a flexible extension of your supply chain.",
    detail:
      "Optimise your inventory flow with our strategic warehousing solutions. Located near major gateways, our facilities offer secure storage, consolidation, and distribution services, acting as a flexible extension of your own supply chain.",
  },
];
