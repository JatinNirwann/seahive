import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registered in exactly one module. Importing GSAP from here everywhere else
// guarantees the plugin is registered once and that there is a single gsap
// instance owning the ticker.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
