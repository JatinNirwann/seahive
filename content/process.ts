/**
 * How a shipment actually moves through the desk.
 *
 * Numbered because this genuinely is a sequence — consultation, booking,
 * compliance, tracking, delivery — not because numbers look tidy.
 */

export interface Step {
  n: string;
  title: string;
  body: string;
  /** What you hold at the end of this step, in mono. */
  output: string;
}

export const PROCESS: Step[] = [
  {
    n: "01",
    title: "Strategic consultation",
    body: "We analyse your specific lane, volume, and timeline requirements to construct the most efficient and cost-effective routing plan.",
    output: "Routing plan, costed",
  },
  {
    n: "02",
    title: "Secured booking",
    body: "Leveraging our broad network, we secure capacity, confirm equipment availability, and lock in your schedule.",
    output: "Booking note, cut-off times",
  },
  {
    n: "03",
    title: "Proactive compliance",
    body: "All commercial documents and regulatory requirements are thoroughly audited prior to departure to ensure seamless transit.",
    output: "Audited document set",
  },
  {
    n: "04",
    title: "Active tracking & clearance",
    body: "Your cargo is monitored throughout its journey, with our teams handling all border transitions and customs clearances on your behalf.",
    output: "Clearance filed, cargo tracked",
  },
  {
    n: "05",
    title: "Final delivery",
    body: "From port arrival to final destination, we coordinate the last mile and provide comprehensive proof of delivery to close the loop.",
    output: "POD, closed file",
  },
];
