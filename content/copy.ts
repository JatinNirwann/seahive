/**
 * Every string on the page.
 *
 * Nothing is written inline in a component, so the whole voice of the site can
 * be reviewed, corrected or translated in one file without touching markup.
 *
 * This copy is the client's own. Where it differs from the register in
 * BRIEF.md — which asks for precise and unhurried over promotional — the
 * client's words win.
 */

export const COMPANY = {
  legalName: "Seahive Freight Private Limited",
  shortName: "Seahive Freight",
  base: "Delhi NCR, India",
  /**
   * The only contact address on the page, and the one the rate request form's
   * acknowledgement sets as its reply-to — so a customer who replies to the
   * automated mail and a customer who reads the footer both arrive in the same
   * inbox. Change it here and in the MAIL_REPLY_TO function secret together.
   */
  email: "info@seahivefreight.com",
};

export const HERO = {
  eyebrow: "Ocean · Air · Customs · Project Cargo · Warehousing",
  headline: ["Global Reach.", "Seamless Execution.", "Straightforward Logistics."],
  subhead:
    "Navigating international trade shouldn't be a bottleneck for your business. We provide comprehensive, end-to-end freight forwarding out of India's major gateways.",
  primaryCta: "Request a rate",
  secondaryCta: "What we handle",
  stripLabel: "Live lanes",
};

export const POSITION = {
  eyebrow: "Unlocking global markets",
  heading: "Built for scale. Designed for reliability.",
  body: [
    "Seahive Freight is engineered to handle supply chains of any size. Whether you are moving standard containers, urgent air freight, or oversized project cargo, our infrastructure is designed to keep your shipments moving smoothly across borders.",
    "We leverage a robust network, advanced operational workflows, and deep industry expertise to deliver your cargo safely and on time.",
  ],
};

export const SERVICES_INTRO = {
  eyebrow: "Comprehensive logistics solutions",
  heading: "A full suite, uninterrupted.",
  body: "We deliver a full suite of services to ensure your supply chain remains uninterrupted. Every solution is tailored to maximise efficiency and minimise transit times.",
};

export const LANES_INTRO = {
  eyebrow: "Our global network",
  heading: "Where we sail and fly.",
  body: "We connect Indian markets to the world's most critical economic hubs. Our established trade lanes provide reliable, consistent connectivity across multiple continents. Transit times are indicative figures for planning, not a schedule guarantee.",
};

/**
 * The line that sits directly above the sea clip, at the point the backdrop
 * changes. It is the page's one moment of self-awareness about its own
 * structure, so it earns being a full-width landmark rather than a caption.
 */
export const SEA_LEVEL = {
  line: "Sea level. Everything below here is slower, heavier, and cheaper.",
};

export const EXCELLENCE = {
  eyebrow: "Commitment to excellence",
  heading: "Compliant by default.",
  body: [
    "Operating on a global scale requires adherence to the highest standards of safety, compliance, and operational integrity.",
    "Seahive Freight operates fully in accordance with all international trade regulations, rigorous safety protocols for specialised cargo, and standardised global logistics frameworks. When you partner with us, you are partnering with a fully compliant, future-ready logistics provider.",
  ],
};

export const PROCESS_INTRO = {
  eyebrow: "How we work",
  heading: "The Seahive approach.",
  body: "We believe logistics should be transparent, predictable, and highly efficient. Our operational workflow is built to provide clarity at every milestone.",
};

export const CONTACT_INTRO = {
  eyebrow: "Request a rate",
  heading: "Ready to move your cargo?",
  body: "Provide us with your shipment details, and our commercial team will deliver a comprehensive, competitive rate plan tailored to your exact requirements.",
  /** For anyone who would rather write than fill in a form. */
  emailLabel: "Or email us directly",
};

export const FOOTER = {
  line: "Ocean & Air Freight · Customs Clearance · Warehousing",
  place: "Delhi NCR, India",
};
