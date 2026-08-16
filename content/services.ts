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
  {
    code: "SVC-06",
    title: "Multimodal transport",
    body: "Sea, road and rail on one booking, with one operator answerable for the whole journey.",
    // Deliberately describes the SERVICE, not a registration. Issuing a
    // multimodal transport document as a registered MTO requires registration
    // under the Multimodal Transportation of Goods Act 1993 with the Director
    // General of Shipping. Until that certificate exists, this says what is
    // done and does not claim the status. Do not add the letters "MTO" here
    // without the registration to back them.
    // On the "route it via Dubai" request: what is written here is ordinary
    // transhipment — using a hub because no direct service exists, which is a
    // scheduling fact and is already how Conakry and Kampala move. What is NOT
    // written, deliberately, is any offer to reach a destination indirectly
    // that could not be reached directly. Framed that way it reads as a route
    // around export controls, and for a restricted destination that is
    // sanctions exposure for the shipper as much as the forwarder. Screening
    // decides whether a shipment moves; the routing never overrides it.
    detail:
      "Not every destination ends at a port, and not every lane has a direct service. Where cargo has to change mode or change vessel to reach its consignee, we plan and run the whole chain — sea leg, transhipment at a hub, inland haulage — on a single booking, so the handover between carriers is our problem to manage rather than yours to chase. Kampala moves this way today, sea to Mombasa and road onward; Conakry transhipments monthly. Every routing is screened against sanctions and export controls before it is offered, and a routing is never a way around a restriction.",
  },
  {
    code: "SVC-07",
    title: "Dangerous goods",
    body: "Classification, packing, declarations and routing for regulated cargo, under IMDG and IATA rules.",
    detail:
      "Regulated cargo fails on paperwork far more often than on handling. We classify to the correct UN number and packing group, check packaging and marking against IMDG for sea and the IATA Dangerous Goods Regulations for air, prepare the shipper's declaration, and book only onto services that accept the class — our Delhi to Dubai air consolidation carries DGR daily.",
  },
];
